const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { auditarContraste } = require('./helpers/contraste-pixel');

// FORTIXAM — recordatorio diario de entreno (F8.3).
//
// En el navegador no existen las notificaciones programadas con la app
// cerrada. Este e2e vigila justo eso: que la sección de Ajustes no prometa lo
// que no puede cumplir, que el interruptor no se pueda encender ahí y que el
// texto quede legible en los dos temas.

test.use({ serviceWorkers: 'block' });

async function openSettings(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const boton = page.locator('button[aria-label*="Ajustes"]').first();
  await boton.waitFor({ timeout: 10_000 });
  await boton.click();
  await expect(page.getByText('Copias de Seguridad Locales')).toBeVisible({
    timeout: 8_000,
  });
}

test.describe('Recordatorio diario de entreno (F8.3)', () => {
  test('en el navegador se dice en claro que necesita la app instalada', async ({ page }) => {
    await seedSession(page, { theme: 'dark' });
    await openSettings(page);

    const seccion = page.getByTestId('training-reminder');
    await seccion.scrollIntoViewIfNeeded();
    await expect(seccion.getByText('Recordatorio de Entreno')).toBeVisible();

    const interruptor = seccion.getByRole('switch', {
      name: /recordatorio diario de entreno/i,
    });
    await expect(interruptor).toBeDisabled();
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
    await expect(seccion.getByText(/necesitan la app instalada/i)).toBeVisible();
    await expect(seccion.getByLabel(/hora del recordatorio/i)).toHaveCount(0);

    const oscuro = await auditarContraste(page, '[data-testid="training-reminder"]');
    expect(oscuro.infracciones, oscuro.infracciones.join('\n')).toEqual([]);
    if (oscuro.degradados > 0) {
      expect(oscuro.medidos).toBe(oscuro.degradados);
    }

    await seedSession(page, { theme: 'light' });
    await openSettings(page);
    await expect(page.locator('html')).toHaveClass(/light/);

    const seccionClara = page.getByTestId('training-reminder');
    await seccionClara.scrollIntoViewIfNeeded();
    await expect(seccionClara.getByText(/necesitan la app instalada/i)).toBeVisible();

    const claro = await auditarContraste(page, '[data-testid="training-reminder"]');
    expect(claro.infracciones, claro.infracciones.join('\n')).toEqual([]);
    if (claro.degradados > 0) {
      expect(claro.medidos).toBe(claro.degradados);
    }
  });

  test('un ajuste guardado en el APK no se finge activo en el navegador', async ({ page }) => {
    await seedSession(page, { theme: 'dark' });

    // Como si el usuario lo hubiera encendido en el móvil: en la PWA el aviso
    // no puede funcionar, así que el interruptor debe seguir apagado.
    await page.addInitScript(() => {
      localStorage.setItem(
        'fortixam_training_reminder_v1',
        JSON.stringify({ 'e2e-user-id': { enabled: true, hour: 7, minute: 5 } }),
      );
    });

    await openSettings(page);

    const seccion = page.getByTestId('training-reminder');
    await seccion.scrollIntoViewIfNeeded();

    const interruptor = seccion.getByRole('switch', {
      name: /recordatorio diario de entreno/i,
    });
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
    await expect(interruptor).toBeDisabled();
    await expect(seccion.getByText(/necesitan la app instalada/i)).toBeVisible();
    await expect(seccion.getByLabel(/hora del recordatorio/i)).toHaveCount(0);
  });
});
