const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — flujos críticos de punta a punta (F4.2).
//
// Lo que faltaba por cubrir y aquí se vigila:
//   1. un entreno guiado COMPLETO: las 6 series de la rutina sembrada
//      (2 ejercicios × 3) con su descanso a pantalla completa entre series,
//      hasta aterrizar en el resumen con la sesión guardada entera;
//   2. registrar un pesaje en Control de Peso y comprobar que queda guardado
//      de verdad: sigue ahí tras recargar la app.

/** Completa la serie actual del modo guiado y salta el descanso a pantalla completa. */
async function completarSerieYSaltar(page) {
  const completar = page.getByRole('button', { name: /Completar serie|Finalizar/i }).first();
  await expect(completar).toBeVisible({ timeout: 8000 });
  await completar.click({ force: true });

  // En guiado el descanso sigue siendo pantalla completa (no la barra flotante)
  await expect(page.locator('text=Intervalo de Recuperación').first()).toBeVisible({
    timeout: 5000,
  });
  const saltar = page.getByRole('button', { name: /Saltar descanso/ }).first();
  await saltar.click({ force: true });
  await expect(page.locator('text=Intervalo de Recuperación')).toHaveCount(0, {
    timeout: 5000,
  });
}

/** Lee la sesión que la app persiste (zustand → localStorage) y resume sus series. */
function leerSesionGuardada(page) {
  return page.evaluate(() => {
    try {
      const st = JSON.parse(localStorage.getItem('titanium-storage') || '{}');
      const s = st?.state?.activeWorkout?.session;
      if (!s) return null;
      const sets = (s.exercises || []).flatMap((ex) => ex.sets || []);
      return {
        completed: Boolean(s.completed),
        totalSets: sets.length,
        completadas: sets.filter((set) => set.completed).length,
      };
    } catch {
      return null;
    }
  });
}

test.describe('Flujo guiado completo (F4.2)', () => {
  test('completar todas las series llega al resumen con la sesión guardada', async ({ page }) => {
    await seedSession(page);
    await seedWorkout(page, { mode: 'guided' });

    await page.goto('/workout/guided');
    await page.waitForLoadState('networkidle');

    // Estado inicial: primer ejercicio, 0 de 6 series
    await expect(page.locator('text=Press de Banca Plano').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=SERIE 0/6').first()).toBeVisible();

    // Primera serie: completar → descanso → saltar; el marcador avanza
    await completarSerieYSaltar(page);
    await expect(page.locator('text=SERIE 1/6').first()).toBeVisible({ timeout: 5000 });

    // Series 2–5 por el mismo camino: incluye cerrar el Press de Banca (3ª serie)
    // y pasar al segundo ejercicio, Aperturas en Banco.
    for (let i = 0; i < 4; i++) {
      await completarSerieYSaltar(page);
    }

    // La 6ª y última serie se cierra con "Finalizar" → resumen
    const finalizar = page.getByRole('button', { name: 'Finalizar' }).first();
    await expect(finalizar).toBeVisible({ timeout: 8000 });
    await finalizar.click({ force: true });

    await page.waitForURL(/\/workout\/complete/, { timeout: 10000 });
    await expect(page.locator('text=¡SESIÓN COMPLETADA!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Día 1: Empuje').first()).toBeVisible();

    // Y la sesión quedó guardada con sus 6 series completas
    await expect
      .poll(() => leerSesionGuardada(page), { timeout: 5000 })
      .toEqual({ completed: true, totalSets: 6, completadas: 6 });
  });
});

test.describe('Registro de peso (F4.2)', () => {
  test('guardar un pesaje queda en el historial y sobrevive a la recarga', async ({ page }) => {
    await seedSession(page);

    await page.goto('/weight');
    await page.waitForLoadState('networkidle');

    // Primera visita: la pantalla lo dice en claro en vez de fingir datos
    await expect(page.locator('text=Sin registros de peso')).toBeVisible({ timeout: 8000 });

    // Abrir el formulario de registro
    await page.getByRole('button', { name: 'Registrar Nuevo Pesaje' }).first().click({
      force: true,
    });
    await expect(page.locator('text=Nuevo Registro').first()).toBeVisible({ timeout: 5000 });

    // Ajustar el peso con los pasos rápidos: 75.0 → 78.0
    const masUnKilo = page.getByRole('button', { name: '+1 kg', exact: true });
    await masUnKilo.click({ force: true });
    await masUnKilo.click({ force: true });
    await masUnKilo.click({ force: true });
    await expect(page.locator('text=78.0').first()).toBeVisible({ timeout: 5000 });

    // Guardar
    await page.getByRole('button', { name: 'Confirmar Pesaje' }).click({ force: true });

    // Queda en el historial y como último pesaje registrado
    await expect(page.locator('text=Historial de Mediciones (1)')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Último Pesaje Registrado').first()).toBeVisible();
    await expect(page.locator('text=78.0').first()).toBeVisible();

    // Y se ha guardado de verdad: sigue ahí tras recargar la app
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Historial de Mediciones (1)')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=78.0').first()).toBeVisible();
  });
});
