const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — descanso flotante en el modo individual (F2.2).
// El descanso ya no tapa la pantalla: es una tarjeta flotante que cuenta sin
// bloquear. Aquí se comprueba el comportamiento real, no "que exista":
// el reloj cuenta, ajusta, no bloquea el botón de completar, y se puede
// saltar. En el modo guiado sigue la pantalla completa de descanso.

/** Lee el reloj del descanso ("1:15") y lo devuelve en segundos. */
async function leerReloj(timer) {
  const texto = (await timer.locator('.fx-num').textContent())?.trim() ?? '';
  const [m, s] = texto.split(':').map((n) => parseInt(n, 10));
  return m * 60 + s;
}

test.describe('Descanso flotante · modo individual (F2.2)', () => {
  test('el reloj cuenta, ajusta y no bloquea la pantalla', async ({ page }) => {
    await seedSession(page);
    await seedWorkout(page, { mode: 'individual' });

    await page.goto('/workout/individual');
    await page.waitForLoadState('networkidle');

    // Completar la primera serie arranca el descanso prescrito (75 s)
    const completar = page.getByRole('button', { name: /Completar serie|Finalizar/i }).first();
    await expect(completar).toBeVisible({ timeout: 8000 });
    await completar.click({ force: true });

    const timer = page.getByRole('timer');
    await expect(timer).toBeVisible({ timeout: 5000 });
    await expect(timer).toContainText('Descanso');
    await expect(timer).toContainText('Press de Banca');

    // 1. El reloj arranca cerca de 1:15 y va contando hacia abajo
    const inicial = await leerReloj(timer);
    expect(inicial, 'el descanso arranca en los 75 s prescritos').toBeGreaterThanOrEqual(70);
    expect(inicial).toBeLessThanOrEqual(75);

    await page.waitForTimeout(2200);
    const despues = await leerReloj(timer);
    expect(despues, 'el reloj cuenta hacia abajo').toBeLessThan(inicial);

    // 2. +15 s ajusta de verdad el tiempo restante
    const antesDeSumar = await leerReloj(timer);
    await timer.getByRole('button', { name: '+15 s' }).click();
    await page.waitForTimeout(250);
    const trasSumar = await leerReloj(timer);
    expect(trasSumar - antesDeSumar, '+15 s suma 15 segundos').toBeGreaterThanOrEqual(13);
    expect(trasSumar - antesDeSumar).toBeLessThanOrEqual(16);

    // 3. No bloquea: el botón de completar sigue recibiendo los toques
    const caja = await completar.boundingBox();
    const encima = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const boton = el && el.closest('button');
        return boton ? (boton.textContent || '').trim() : null;
      },
      { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 },
    );
    expect(encima, 'ninguna capa tapa el botón principal').toMatch(/Completar serie|Finalizar/i);

    // La vieja pantalla completa de descanso ya no aparece en individual
    await expect(page.locator('text=Intervalo de Recuperación')).toHaveCount(0);

    // 4. Saltar cierra el descanso y se puede seguir entrenando
    await timer.getByRole('button', { name: /Saltar/ }).click();
    await expect(page.getByRole('timer')).toHaveCount(0);

    await completar.click({ force: true });
    await expect(page.getByRole('timer')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('timer')).toContainText('serie 3 de 3');

    // 5. Y desde el propio descanso se puede completar la serie siguiente:
    //    el descanso se reinicia solo, sin pantallas intermedias.
    await completar.click({ force: true });
    const timer2 = page.getByRole('timer');
    await expect(timer2).toBeVisible({ timeout: 5000 });
    const reiniciado = await leerReloj(timer2);
    expect(reiniciado).toBeGreaterThan(60);
  });

  test('el modo guiado conserva su pantalla completa de descanso', async ({ page }) => {
    await seedSession(page);
    await seedWorkout(page, { mode: 'guided' });

    await page.goto('/workout/guided');
    await page.waitForLoadState('networkidle');

    const completar = page.getByRole('button', { name: /Completar serie|Finalizar/i }).first();
    await expect(completar).toBeVisible({ timeout: 8000 });
    await completar.click({ force: true });

    await expect(page.locator('text=Intervalo de Recuperación').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('timer')).toHaveCount(0);
  });
});
