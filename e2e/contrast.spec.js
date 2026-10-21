const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');
const { auditarContraste } = require('./helpers/contraste-pixel');

// FORTIXAM — auditoría de contraste en los dos temas.
//
// Calcula la relación de contraste WCAG de cada texto visible contra su fondo
// real y falla si no llega al mínimo. Es la comprobación que convierte "se lee
// mal" en algo medible.
//
// F7.2: las tarjetas con degradado ya no se saltan. Su fondo no está en
// `backgroundColor`, así que se mide el píxel de verdad bajo el texto
// (`helpers/contraste-pixel.js`): se oculta la tinta, se fotografía la página y
// se lee el color que queda debajo. Antes se descartaban, y por eso el tema
// oscuro —donde casi todas las tarjetas son degradados— iba sin auditar.
//
// El detalle de rutina es un modal desde la home (v8.5.47 retiró la página
// /routine/[day]); la tercera columna abre ese modal y acota la auditoría a él.

// El service worker se salta `page.route`: con él activo las consultas a GitHub
// no se pueden cortar (lo comprobamos: 8 peticiones y el diálogo de
// actualización encima de la pantalla). Aquí no se prueba el modo sin conexión,
// así que se desactiva para que la auditoría mida siempre lo mismo.
test.use({ serviceWorkers: 'block' });

const RUTAS = [
  ['/', null, null],
  ['/', null, 'detalle'], // el detalle de rutina, abierto desde la home
  ['/stats', null, null],
  ['/history', null, null],
  ['/weight', null, null],
  ['/warmup', null, null],
  ['/audio', null, null],
  ['/workout/complete', null, null],
  ['/workout/guided', 'guided', null],
  ['/workout/individual', 'individual', null],
];

for (const tema of ['dark', 'light']) {
  test.describe(`Contraste · tema ${tema}`, () => {
    // La app consulta GitHub al arrancar (API de releases y copia en raw) para
    // buscar actualizaciones. La consulta sale a los 3 s, en mitad de la
    // auditoría: si responde, el diálogo "Actualización lista" aparece encima
    // de la pantalla y las capturas miden su botón verde en vez del fondo del
    // texto. Se cortan las dos fuentes para que la auditoría corra sola.
    test.beforeEach(async ({ page }) => {
      await page.route(/https:\/\/(api\.github\.com|raw\.githubusercontent\.com)\/.*/, (route) => route.abort());
    });

    for (const [ruta, modo, accion] of RUTAS) {
      test(`${ruta}${accion === 'detalle' ? ' (detalle de rutina)' : ''}`, async ({ page }) => {
        await seedSession(page, { theme: tema });
        if (modo) await seedWorkout(page, { mode: modo });

        await page.goto(ruta);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);

        let scope = null;
        if (accion === 'detalle') {
          const empezar = page.getByRole('button', { name: 'Empezar' });
          await expect(empezar).toBeVisible({ timeout: 10000 });
          await empezar.click({ force: true });
          await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
          // El clic deja el cursor sobre la lista de ejercicios y un hover
          // accidental cambiaría colores (nombre en verde, tarjeta en gris).
          // Se audita el estado en reposo: fuera del modal.
          await page.mouse.move(5, 5);
          // La hoja entra con muelle: esperar a que se asiente antes de medir
          await page.waitForTimeout(700);
          scope = '[role="dialog"]';
        }

        await expect(page.locator('html')).toHaveClass(new RegExp(tema));

        const { infracciones, medidos, degradados } = await auditarContraste(page, scope);
        expect(
          infracciones,
          `contraste insuficiente en ${ruta} (${tema}), ${degradados} texto(s) sobre degradado medido(s) a pie de píxel:\n  ${infracciones
            .slice(0, 12)
            .join('\n  ')}`,
        ).toEqual([]);

        // El texto sobre degradado tiene que haberse medido de verdad: si la
        // captura fallara, `medidos` se quedaría corto y volveríamos al punto
        // de partida (saltarse las tarjetas del tema oscuro sin avisar).
        expect(medidos, `solo se midieron ${medidos} de ${degradados} textos sobre degradado`).toBe(degradados);
      });
    }

    // F6.4 — el estado hover también cuenta: el nombre del ejercicio se pinta
    // en verde al pasar el dedo/ratón por la tarjeta, y en claro el acento
    // (emerald-600) se quedaba en 3,60:1 sobre la tarjeta. Este caso audita el
    // color real ya con la tarjeta en hover, que es el que se ve al tocar.
    test('el nombre del ejercicio en hover mantiene el contraste', async ({ page }) => {
      await seedSession(page, { theme: tema });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);

      const empezar = page.getByRole('button', { name: 'Empezar' });
      await expect(empezar).toBeVisible({ timeout: 10000 });
      await empezar.click({ force: true });
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(700);

      const tarjeta = page.locator('[role="dialog"] [data-testid="exercise-card"]').first();
      await expect(tarjeta).toBeVisible({ timeout: 10000 });
      await tarjeta.hover();
      // `transition-colors` anima el verde: medir cuando ya se ha asentado.
      await page.waitForTimeout(400);

      const nombre = tarjeta.locator('[data-testid="exercise-name"]');
      const colorHover = await nombre.evaluate((el) => getComputedStyle(el).color);
      expect(colorHover, `el nombre no cambió de color en hover (${colorHover})`).not.toBe(
        'rgb(15, 23, 42)',
      );

      const { infracciones } = await auditarContraste(page, '[role="dialog"]');
      expect(
        infracciones,
        `contraste insuficiente con la tarjeta en hover (${tema}), color "${colorHover}":\n  ${infracciones
          .slice(0, 12)
          .join('\n  ')}`,
      ).toEqual([]);
    });
  });
}
