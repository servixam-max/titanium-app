const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { version: APP_VERSION } = require('../version.json');

// FORTIXAM — aviso de novedades tras actualizar (F1.2).
//
// La app avisa UNA vez de lo que trae la versión instalada: pantalla corta al
// abrir tras actualizar y punto en Ajustes hasta leerlas. Los casos que
// importan son los bordes: no molestar en instalación nueva, no interrumpir un
// entreno, y no repetirse.

test.describe('Novedades tras actualizar', () => {
  test('tras actualizar aparece la pantalla con lo de esta versión', async ({ page }) => {
    await seedSession(page, { unseenNews: true });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#whats-new-title')).toHaveText(`Novedades de la v${APP_VERSION}`);

    // El punto de "novedades sin leer" está en el acceso a Ajustes
    await expect(page.locator('button[aria-label*="novedades sin leer"]')).toHaveCount(1);
  });

  test('Entendido la cierra y no vuelve a aparecer al recargar', async ({ page }) => {
    await seedSession(page, { unseenNews: true });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Entendido' }).click();
    await expect(dialogo).toBeHidden();

    const marca = await page.evaluate(() => localStorage.getItem('fortixam_last_seen_version'));
    expect(marca).toBe(APP_VERSION);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await expect(page.getByText(/Novedades de la v/)).toHaveCount(0);
  });

  test('no interrumpe un entreno en curso: espera a la próxima apertura', async ({ page }) => {
    await seedSession(page, { unseenNews: true });
    await page.addInitScript(() => {
      // Sesión de entreno en curso en el estado persistido
      const raw = JSON.parse(localStorage.getItem('titanium-storage'));
      raw.state.activeWorkout = {
        routine: {
          day: 1,
          title: 'Día 1: Empuje',
          exercises: [{ id: 'e2e-bench', name: 'Press de Banca Plano', sets: 3, reps: '10-12', restSeconds: 75, equipment: 'dumbbells', category: 'chest' }],
        },
        mode: 'guided',
        currentExerciseIndex: 0,
        currentSet: 1,
        currentRound: 1,
        equipmentPref: 'dumbbells',
        exerciseWeights: {},
        exerciseReps: {},
      };
      localStorage.setItem('titanium-storage', JSON.stringify(raw));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);

    await expect(page.getByText(/Novedades de la v/)).toHaveCount(0);
    // Pero las novedades siguen pendientes: el punto sigue ahí
    await expect(page.locator('button[aria-label*="novedades sin leer"]')).toHaveCount(1);
  });

  test('en una instalación nueva no se avisa de nada', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('fortixam-theme', 'dark');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3500);

    await expect(page.getByText(/Novedades de la v/)).toHaveCount(0);
    // Se apunta la versión para no avisar más adelante sin motivo
    const marca = await page.evaluate(() => localStorage.getItem('fortixam_last_seen_version'));
    expect(marca).toBe(APP_VERSION);
  });

  test('Ajustes muestra el distintivo y lo retira al ver la sección', async ({ page }) => {
    await seedSession(page, { unseenNews: true });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Cerrar el aviso para llegar a Ajustes
    const entendido = page.getByRole('button', { name: 'Entendido' });
    await expect(entendido).toBeVisible({ timeout: 15_000 });
    await entendido.click();

    // Volver a dejarlas pendientes y avisar a la interfaz (como tras actualizar)
    await page.evaluate(() => {
      localStorage.setItem('fortixam_last_seen_version', '8.5.0');
      window.dispatchEvent(new Event('fortixam-whats-new-seen'));
    });

    await page.locator('button[aria-label*="novedades sin leer"]').first().click();
    await expect(page.getByText('Novedades', { exact: true })).toBeVisible();

    const chip = page.getByText('Nuevas', { exact: true });
    await expect(chip).toBeVisible();

    // Al llegar a la sección de Novedades deja de estar pendiente
    await page.getByText('Novedades', { exact: true }).scrollIntoViewIfNeeded();
    await expect(chip).toBeHidden({ timeout: 10_000 });
    const marca = await page.evaluate(() => localStorage.getItem('fortixam_last_seen_version'));
    expect(marca).toBe(APP_VERSION);
  });
});
