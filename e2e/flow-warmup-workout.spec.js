const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM v8 — flujo real de inicio de entreno sobre el export estático.
//
// El detalle de rutina es un modal que se abre desde la home: la antigua
// pantalla /routine/[day] se retiró (v8.5.47) porque ningún botón llevaba a
// ella. Estos tests recorren ahora el camino que hace el usuario de verdad:
// home → botón "Empezar" del día de hoy → modal de detalle → entreno.
//
// Notas:
// - AuthModal cubre la app cuando no hay usuario logeado: sembramos el
//   usuario (fortixam_server_user) en localStorage antes de navegar.
// - OnboardingModal cubriría el dashboard: marcamos onboardingComplete en
//   el store persistido (titanium-storage).
// - La home y el modal animan su entrada (framer-motion) y React hidrata
//   tras cargar los chunks: esperamos hidratación y usamos force:true.

async function abrirDetalleRutina(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const empezar = page.getByRole('button', { name: 'Empezar' });
  await expect(empezar).toBeVisible({ timeout: 10000 });
  await empezar.click({ force: true });

  // El detalle es el modal con semántica de diálogo
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
}

test.describe('Flujo de entreno', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('Modo individual: home → detalle → entreno directo', async ({ page }) => {
    await abrirDetalleRutina(page);

    // Conmutar a modo individual (por defecto es guiado)
    await page.locator('button:has-text("Individual")').first().click({ force: true });
    await expect(page.locator('text=INICIAR MODO INDIVIDUAL').first()).toBeVisible({ timeout: 8000 });

    await page.locator('text=INICIAR MODO INDIVIDUAL').first().click({ force: true });

    await page.waitForURL(/\/workout\/individual/, { timeout: 8000 });
    expect(page.url()).toContain('/workout/individual');
  });

  test('Modo guiado: home → detalle → modal calentamiento → warmup → guided', async ({ page }) => {
    await abrirDetalleRutina(page);

    // Abrir modal de calentamiento desde el detalle
    await page.locator('text=INICIAR ENTRENAMIENTO GUIADO').first().click({ force: true });
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
    await abrirDetalleRutina(page);

    await page.locator('text=INICIAR ENTRENAMIENTO GUIADO').first().click({ force: true });
    await expect(page.locator('text=¿Quieres calentar?').first()).toBeVisible({ timeout: 8000 });

    await page.locator('text=NO, IR DIRECTO AL ENTRENO').first().click({ force: true });
    await page.waitForURL(/\/workout\/guided/, { timeout: 8000 });
  });
});
