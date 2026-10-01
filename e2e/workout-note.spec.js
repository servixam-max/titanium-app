const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — nota rápida por ejercicio (F2.1).
// No comprueba "que el botón existe": escribe una nota real durante el
// entreno, la guarda, termina la sesión y comprueba que la nota viaja con
// ella hasta el historial. Es el recorrido completo del usuario.

test.describe('Nota rápida del ejercicio (F2.1)', () => {
  test('se escribe en el entreno, se guarda con la sesión y se ve en el historial', async ({ page }) => {
    await seedSession(page);
    await seedWorkout(page, { mode: 'individual' });

    await page.goto('/workout/individual');
    await page.waitForLoadState('networkidle');

    // 1. La píldora está cerrada y es una zona táctil de verdad (≥44 px)
    const pill = page.locator('button[aria-label="Añadir nota del ejercicio"]');
    await expect(pill).toBeVisible({ timeout: 8000 });
    const caja = await pill.boundingBox();
    expect(caja.height, 'zona táctil de la nota').toBeGreaterThanOrEqual(44);

    // 2. Se abre, se escribe y se guarda con Enter
    await pill.click();
    const input = page.locator('input[aria-label="Nota del ejercicio"]');
    await expect(input).toBeVisible();
    const fontSize = await input.evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(fontSize), 'input sin zoom en iOS').toBeGreaterThanOrEqual(16);

    const nota = 'Subir a 42,5 kg, el codo me molestó en la última';
    await input.fill(nota);
    await input.press('Enter');

    // 3. Cerrada, muestra la nota guardada (no un estado vacío)
    const guardada = page.locator('button[aria-label="Editar nota del ejercicio"]');
    await expect(guardada).toBeVisible({ timeout: 5000 });
    await expect(guardada).toContainText('Subir a 42,5 kg', { timeout: 5000 });

    // 4. Completar el entreno entero (2 ejercicios × 3 series) saltando descansos
    for (let i = 0; i < 8; i += 1) {
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

    // 5. La nota viaja con la sesión hasta el historial
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);

    const sesion = page.locator('text=/Día 1/').first();
    await expect(sesion).toBeVisible({ timeout: 8000 });
    await sesion.click({ force: true });
    await page.waitForTimeout(400);

    await expect(page.locator(`text=${nota}`).first()).toBeVisible({ timeout: 6000 });
  });

  test('cerrada sin nota ofrece añadirla y no ocupa la pantalla', async ({ page }) => {
    await seedSession(page);
    await seedWorkout(page, { mode: 'individual' });

    await page.goto('/workout/individual');
    await page.waitForLoadState('networkidle');

    const pill = page.locator('button[aria-label="Añadir nota del ejercicio"]');
    await expect(pill).toBeVisible({ timeout: 8000 });
    await expect(pill).toContainText('Añadir nota');
    await expect(page.locator('input[aria-label="Nota del ejercicio"]')).toHaveCount(0);
  });
});
