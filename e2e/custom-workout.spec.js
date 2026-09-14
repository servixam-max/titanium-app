const { test, expect } = require('@playwright/test');

// FORTIXAM v8.4 — constructor de entrenamientos personalizados.
// Requiere usuario sembrado (AuthModal cubre la app sin sesión) y
// force:true por las animaciones de entrada del dashboard.

const E2E_USER = {
  id: 'e2e-user-id',
  clientId: 'e2e',
  ownerUserId: 'e2e-user-id',
  username: 'E2E',
  email: 'e2e@fortixam.local',
  passwordHash: '',
  avatarColor: '#00D68F',
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  version: 1,
  authProvider: 'local',
  serverUserId: 'e2e-user-id',
};

test.describe('Constructor personalizado', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      localStorage.setItem('fortixam_server_user', JSON.stringify(user));
      localStorage.setItem('fortixam_active_user_id', user.id);
      localStorage.setItem(
        'titanium-storage',
        JSON.stringify({ state: { onboardingComplete: true }, version: 0 })
      );
    }, E2E_USER);
  });

  test('Pestaña Creador abre el constructor y añade un ejercicio', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    // Abrir la pestaña del constructor
    const tabCreador = page.locator('button:has-text("Creador")').first();
    await expect(tabCreador).toBeVisible({ timeout: 8000 });
    await tabCreador.click({ force: true });

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