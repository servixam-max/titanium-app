const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — rendimiento real del WebView (F4.4).
//
// La sonda de rendimiento (`src/lib/perf-probe.ts`) cuenta los renders reales
// de los componentes instrumentados. Se enciende antes de cargar la app y los
// contadores quedan en `window.__fxPerf` (nombre → nº renders). Con esto se
// mide lo que pide F4.4: cuántas veces se repinta cada pieza durante un
// entreno activo.
//
// Regla que se vigila: el tic de 1 Hz del descanso (o del prep/intervalo de
// trabajo) SOLO debe repintar el reloj; la pantalla entera —registrador de
// series, ficha del ejercicio, cabecera— no debe re-renderizarse cada segundo,
// porque mientras descansas la pantalla sigue siendo interactiva (F2.2) y ese
// churn constante es justo lo que se notaba al escribir peso/reps.

async function encenderSonda(page) {
  await page.addInitScript(() => {
    window.__FORTIXAM_PERF__ = true;
  });
}

function leerContadores(page) {
  return page.evaluate(() => ({ ...(window.__fxPerf || {}) }));
}

function delta(antes, despues, nombre) {
  return (despues[nombre] || 0) - (antes[nombre] || 0);
}

/** Completar la serie actual (individual o guiado). */
async function completarSerie(page) {
  const completar = page.getByRole('button', { name: /Completar serie|Finalizar/i }).first();
  await expect(completar).toBeVisible({ timeout: 8000 });
  await completar.click({ force: true });
}

/** Espera a que el reloj acumule `ticks` renders del componente del reloj. */
async function esperarTicks(page, componente, ticks) {
  await page.waitForFunction(
    ({ componente, ticks }) => (window.__fxPerf?.[componente] ?? 0) >= ticks,
    { componente, ticks },
    { timeout: 20000 },
  );
}

test.describe('Rendimiento del entreno activo (F4.4)', () => {
  test('el reloj del descanso no re-renderiza la pantalla entera (individual)', async ({ page }) => {
    await encenderSonda(page);
    await seedSession(page);
    await seedWorkout(page, { mode: 'individual' });

    await page.goto('/workout/individual');
    await page.waitForLoadState('networkidle');

    // Completar la primera serie arranca el descanso flotante (75 s)
    await completarSerie(page);
    const timer = page.getByRole('timer');
    await expect(timer).toBeVisible({ timeout: 5000 });
    await esperarTicks(page, 'rest-bar', 1);

    // Ventana de medida: 6 ticks del reloj sin tocar nada
    const antes = await leerContadores(page);
    await esperarTicks(page, 'rest-bar', (antes['rest-bar'] || 0) + 6);
    const despues = await leerContadores(page);

    const medidas = {
      'rest-bar': delta(antes, despues, 'rest-bar'),
      'individual-page': delta(antes, despues, 'individual-page'),
      'set-logger': delta(antes, despues, 'set-logger'),
      'exercise-stage': delta(antes, despues, 'exercise-stage'),
    };
    console.log('[F4.4] renders durante 6 ticks de descanso (individual):', JSON.stringify(medidas));

    // El reloj se refresca con cada tic…
    expect(medidas['rest-bar'], 'el reloj del descanso cuenta').toBeGreaterThanOrEqual(6);
    // …pero el tic no arrastra al resto de la pantalla: en 6 s de descanso la
    // página, el registrador de series y la ficha del ejercicio no se repintan
    // (se tolera 1 render por ruido de arranque del descanso).
    expect(medidas['individual-page'], 'la página del entreno no se repinta por tic').toBeLessThanOrEqual(1);
    expect(medidas['set-logger'], 'el registrador de series no se repinta por tic').toBeLessThanOrEqual(1);
    expect(medidas['exercise-stage'], 'la ficha del ejercicio no se repinta por tic').toBeLessThanOrEqual(1);
  });

  test('en guiado, el descanso a pantalla completa repinta solo su pantalla', async ({ page }) => {
    await encenderSonda(page);
    await seedSession(page);
    await seedWorkout(page, { mode: 'guided' });

    await page.goto('/workout/guided');
    await page.waitForLoadState('networkidle');

    await completarSerie(page);
    await expect(page.locator('text=Intervalo de Recuperación').first()).toBeVisible({ timeout: 5000 });
    await esperarTicks(page, 'rest-timer', 1);

    const antes = await leerContadores(page);
    await esperarTicks(page, 'rest-timer', (antes['rest-timer'] || 0) + 6);
    const despues = await leerContadores(page);

    const medidas = {
      'rest-timer': delta(antes, despues, 'rest-timer'),
      'guided-page': delta(antes, despues, 'guided-page'),
    };
    console.log('[F4.4] renders durante 6 ticks de descanso (guiado):', JSON.stringify(medidas));

    expect(medidas['rest-timer'], 'el reloj a pantalla completa cuenta').toBeGreaterThanOrEqual(6);
    expect(medidas['guided-page'], 'la página del entreno no se repinta por tic').toBeLessThanOrEqual(1);
  });

  test('arranque en frío: la home pinta rápido (aviso de regresión)', async ({ page }) => {
    // No mide el WebView de Android (eso se comprueba con `adb shell am start -W`),
    // sino el mismo export estático que sirve: vigila que ningún cambio futuro
    // hunda el arranque con un bundle desproporcionado. Umbral holgado a propósito.
    await seedSession(page);

    const t0 = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hastaHome = Date.now() - t0;

    const tiempos = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint');
      return {
        fcp: fcp ? Math.round(fcp.startTime) : null,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        load: nav ? Math.round(nav.loadEventEnd) : null,
      };
    });
    console.log(
      `[F4.4] arranque home: FCP ${tiempos.fcp} ms · DCL ${tiempos.domContentLoaded} ms · load ${tiempos.load} ms · goto→home ${hastaHome} ms`,
    );

    const referencia = tiempos.fcp ?? tiempos.domContentLoaded ?? hastaHome;
    expect(referencia, 'la home pinta dentro del umbral holgado').toBeLessThan(5000);
  });
});
