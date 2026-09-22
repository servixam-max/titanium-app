const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM v8.4 — constructor de entrenamientos personalizados.
// Requiere usuario sembrado (AuthModal cubre la app sin sesión) y
// force:true por las animaciones de entrada del dashboard.

test.describe('Constructor personalizado', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('Pestaña Crear abre el constructor y añade un ejercicio', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    // Abrir la pestaña del constructor (control segmentado de la home)
    const tabCrear = page.locator('[role="tab"]:has-text("Crear")').first();
    await expect(tabCrear).toBeVisible({ timeout: 8000 });
    await tabCrear.click({ force: true });

    // El input del título del entrenamiento es visible
    await expect(
      page.locator('input[placeholder*="Tabata Quemagrasa"]').first()
    ).toBeVisible({ timeout: 8000 });

    // Añadir el primer ejercicio del catálogo
    const btnAñadir = page.locator('button:has-text("Añadir")').first();
    await expect(btnAñadir).toBeVisible({ timeout: 8000 });
    await btnAñadir.click({ force: true });

    // Al añadir, el botón pasa a "Añadir más" y el ejercicio aparece en la composición
    await expect(
      page.locator('button:has-text("Añadir más")').first()
    ).toBeVisible({ timeout: 8000 });
  });
});