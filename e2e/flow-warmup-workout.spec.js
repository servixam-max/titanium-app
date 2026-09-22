const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM v8 — flujo real de inicio de entreno sobre el export estático.
//
// Notas:
// - AuthModal cubre la app cuando no hay usuario logeado: sembramos el
//   usuario (fortixam_server_user) en localStorage antes de navegar.
// - OnboardingModal cubriría el dashboard: marcamos onboardingComplete en
//   el store persistido (titanium-storage).
// - La página de rutina anima su entrada (framer-motion) y React hidrata
//   tras cargar los chunks: esperamos hidratación y usamos force:true.

async function sembrarUsuario(page) {
  await seedSession(page);
}

async function esperarHidratacion(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

test.describe('Flujo de entreno', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('Modo individual: rutina → entreno directo', async ({ page }) => {
    await page.goto('/routine/1');
    await esperarHidratacion(page);

    // Conmutar a modo individual (por defecto es guiado)
    await page.locator('button:has-text("Modo Individual")').first().click({ force: true });
    await expect(page.locator('text=INICIAR MODO INDIVIDUAL').first()).toBeVisible({ timeout: 8000 });

    await page.locator('text=INICIAR MODO INDIVIDUAL').first().click({ force: true });

    await page.waitForURL(/\/workout\/individual/, { timeout: 8000 });
    expect(page.url()).toContain('/workout/individual');
  });

  test('Modo guiado: rutina → modal calentamiento → warmup → guided', async ({ page }) => {
    await page.goto('/routine/1');
    await esperarHidratacion(page);

    // Abrir modal de calentamiento
    await page.locator('text=INICIAR MODO GUIADO').first().click({ force: true });
    await expect(page.locator('text=¿Quieres calentar?').first()).toBeVisible({ timeout: 8000 });

    // Elegir calentar primero → /warmup?redirect=/workout/guided
    await page.locator('text=SÍ, CALENTAR PRIMERO').first().click({ force: true });
    await page.waitForURL(/\/warmup\?redirect=\/workout\/guided/, { timeout: 8000 });

    // Saltar el calentamiento → aterrizamos en /workout/guided
    await page.locator('button:has-text("Saltar")').first().click({ force: true });
    await page.waitForURL(/\/workout\/guided/, { timeout: 8000 });
    expect(page.url()).toContain('/workout/guided');
  });

  test('Modo guiado: ir directo al entreno sin calentar', async ({ page }) => {
    await page.goto('/routine/1');
    await esperarHidratacion(page);

    await page.locator('text=INICIAR MODO GUIADO').first().click({ force: true });
    await expect(page.locator('text=¿Quieres calentar?').first()).toBeVisible({ timeout: 8000 });

    await page.locator('text=NO, IR DIRECTO AL ENTRENO').first().click({ force: true });
    await page.waitForURL(/\/workout\/guided/, { timeout: 8000 });
  });
});