const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — compartir el resumen del entrenamiento (F2.5).
// Recorrido completo y real: se termina un entreno individual de verdad y, en
// la pantalla de resumen, se pulsa "Compartir resumen". Se prueban los dos
// caminos que existen en producción:
//   1. WebView del APK (sin navigator.share): el resumen se copia al
//      portapapeles y el texto copiado es el resumen real del entreno.
//   2. Navegador con hoja nativa: se usa navigator.share con el mismo texto.
// Además, cancelar la hoja nativa no debe anunciarse como error.

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** Completa un entreno individual entero (saltando descansos) hasta el resumen. */
async function completarEntrenoIndividual(page) {
  await seedSession(page);
  await seedWorkout(page, { mode: 'individual' });

  await page.goto('/workout/individual');
  await page.waitForLoadState('networkidle');

  for (let i = 0; i < 10; i += 1) {
    const completar = page.getByRole('button', { name: /Completar serie|Finalizar/i }).first();
    if (!(await completar.isVisible().catch(() => false))) break;
    await completar.click({ force: true });
    await page.waitForTimeout(250);
    const saltar = page.locator('button:has-text("Saltar")').first();
    if (await saltar.isVisible().catch(() => false)) {
      await saltar.click({ force: true });
      await page.waitForTimeout(250);
    }
    if (page.url().includes('/workout/complete')) break;
  }

  await page.waitForURL(/\/workout\/complete/, { timeout: 10000 });
}

test.describe('Compartir el resumen del entrenamiento (F2.5)', () => {
  test('en el WebView (sin hoja nativa) el resumen se copia y es el real', async ({ page }) => {
    // El WebView de Android no implementa navigator.share: se simula su ausencia
    // para recorrer exactamente el camino que vivirá el usuario del APK.
    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      } catch {
        /* sin soporte para redefinir: el test lo detectará */
      }
    });

    await completarEntrenoIndividual(page);

    const boton = page.getByRole('button', { name: /Compartir resumen/i });
    await expect(boton).toBeVisible({ timeout: 8000 });

    // Zona táctil de verdad (≥48 px)
    const caja = await boton.boundingBox();
    expect(caja.height, 'zona táctil del botón de compartir').toBeGreaterThanOrEqual(48);

    await boton.click();

    // El aviso dice la verdad: se copió
    await expect(page.getByText('Resumen copiado')).toBeVisible({ timeout: 5000 });

    // Y lo copiado es el resumen real del entreno, no un texto genérico
    const copiado = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiado).toContain('FORTIXAM');
    expect(copiado).toContain('Día 1');
    expect(copiado).toMatch(/series/);
    expect(copiado).toMatch(/\d{1,2} \w{3} \d{4}/);
  });

  test('con hoja nativa disponible se usa navigator.share', async ({ page }) => {
    await page.addInitScript(() => {
      window.__fortixamShare = [];
      Object.defineProperty(navigator, 'share', {
        value: async (data) => {
          window.__fortixamShare.push(data);
        },
        configurable: true,
      });
    });

    await completarEntrenoIndividual(page);

    await page.getByRole('button', { name: /Compartir resumen/i }).click();
    await expect(page.getByText('Compartido')).toBeVisible({ timeout: 5000 });

    const compartido = await page.evaluate(() => window.__fortixamShare);
    expect(compartido.length).toBe(1);
    expect(compartido[0].text).toContain('FORTIXAM');
    expect(compartido[0].text).toContain('Día 1');
  });

  test('cancelar la hoja nativa no se anuncia como error', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        value: async () => {
          const error = new Error('el usuario cerró la hoja');
          error.name = 'AbortError';
          throw error;
        },
        configurable: true,
      });
    });

    await completarEntrenoIndividual(page);

    await page.getByRole('button', { name: /Compartir resumen/i }).click();
    await page.waitForTimeout(900);

    await expect(page.getByText('Resumen copiado')).toHaveCount(0);
    await expect(page.getByText('No se pudo compartir')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Compartir resumen/i })).toBeEnabled();
  });
});
