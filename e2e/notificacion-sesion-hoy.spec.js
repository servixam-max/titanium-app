const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — el recordatorio abre la sesión de hoy (F9.2).
//
// Antes, tocar la notificación abría la app donde se hubiera quedado (o en la
// home a ciegas). Ahora el aviso lleva a `/workout/hoy`, que resuelve el día en
// el momento de tocarlo con la misma regla que la home (`sesionDeHoy`).
//
// La notificación nativa no existe en el navegador; lo que sí se prueba de
// verdad contra el export es la pantalla a la que lleva, que era donde estaba
// el fallo: abrir "donde fuera" en vez de la sesión que toca.

test.use({ serviceWorkers: 'block' });

/** Plan recomendado: Lunes/Miércoles → Día 1, Martes/Jueves → Día 2, finde descanso. */
const PLAN = 'push-pull-4';
const DIA_DEL_PLAN = { 1: 1, 2: 2, 3: 1, 4: 2, 5: 0, 6: 0, 0: 0 };

async function conPlan(page, plan = PLAN) {
  await page.addInitScript((id) => {
    localStorage.setItem('fortixam_plan_semanal', id);
  }, plan);
}

test.describe('Recordatorio — abre la sesión de hoy (F9.2)', () => {
  test('con un entreno a medias vuelve a él y no empieza otro', async ({ page }) => {
    await seedSession(page);
    await conPlan(page);
    await seedWorkout(page, { mode: 'individual' });

    await page.goto('/workout/hoy');

    // Al entreno que estaba haciendo, no a la rutina del día del plan.
    await expect(page).toHaveURL(/\/workout\/individual$/, { timeout: 10_000 });
    await expect(page.getByText('Press de Banca Plano').first()).toBeVisible();

    const modo = await page.evaluate(() => {
      const raw = localStorage.getItem('titanium-storage');
      return raw ? JSON.parse(raw).state.activeWorkout.mode : null;
    });
    expect(modo).toBe('individual');
  });

  test('sin plan no adivina: deja la home, que explica qué toca', async ({ page }) => {
    await seedSession(page);

    await page.goto('/workout/hoy');

    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expect(page.getByText('Elige un plan').first()).toBeVisible();
  });

  test('con plan abre la sesión del día que toca (y no otra)', async ({ page }) => {
    await seedSession(page);
    await conPlan(page);

    const esperado = DIA_DEL_PLAN[new Date().getDay()];

    await page.goto('/workout/hoy');

    if (esperado === 0) {
      // Día de descanso en el plan: no se inventa una sesión.
      await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
      return;
    }

    await expect(page).toHaveURL(/\/workout\/guided$/, { timeout: 10_000 });

    const dia = await page.evaluate(() => {
      const raw = localStorage.getItem('titanium-storage');
      return raw ? JSON.parse(raw).state.activeWorkout.routine?.day ?? null : null;
    });
    expect(dia).toBe(esperado);
  });
});
