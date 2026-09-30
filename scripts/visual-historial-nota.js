// Comprobación visual real (F2.1): completa un entreno de verdad con una nota
// escrita, y captura el historial con la nota, en claro y oscuro (Pixel 7).
const { chromium, devices } = require('@playwright/test');
const { seedSession } = require('../e2e/helpers/session');
const { seedWorkout } = require('../e2e/helpers/workout-session');

(async () => {
  const browser = await chromium.launch();
  for (const tema of ['dark', 'light']) {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    await seedSession(page, { theme: tema });
    await seedWorkout(page, { mode: 'individual' });

    await page.goto('http://127.0.0.1:3310/workout/individual');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);

    // Nota real escrita durante el entreno
    await page.locator('button[aria-label="Añadir nota del ejercicio"]').first().click();
    const input = page.locator('input[aria-label="Nota del ejercicio"]');
    await input.waitFor();
    await input.fill('Subir a 42,5 kg la próxima: la última serie salió cómoda.');
    await input.press('Enter');
    await page.waitForTimeout(400);

    // Completar todas las series saltando descansos
    for (let i = 0; i < 10; i += 1) {
      const completar = page.getByRole('button', { name: /Completar serie|Finalizar/i }).first();
      if (!(await completar.isVisible().catch(() => false))) break;
      await completar.click({ force: true });
      await page.waitForTimeout(220);
      const saltar = page.locator('button:has-text("Saltar descanso")').first();
      if (await saltar.isVisible().catch(() => false)) {
        await saltar.click({ force: true });
        await page.waitForTimeout(220);
      }
      if (page.url().includes('/workout/complete')) break;
    }
    await page.waitForURL(/\/workout\/complete/, { timeout: 10000 });

    await page.goto('http://127.0.0.1:3310/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await page.locator('text=/Día 1/').first().click({ force: true });
    await page.waitForTimeout(700);

    const nota = page.locator('text=/Subir a 42,5 kg/').first();
    const visible = await nota.isVisible().catch(() => false);
    console.log(`[${tema}] nota visible en historial: ${visible ? 'SÍ' : 'NO'}`);
    if (visible) {
      const b = await nota.boundingBox();
      const ancho = page.viewportSize().width;
      const desborda = await nota.evaluate((el) => el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2);
      console.log(`[${tema}] caja: x=${Math.round(b.x)} w=${Math.round(b.width)} h=${Math.round(b.height)} · dentro del viewport ${ancho}px: ${b.x >= 0 && b.x + b.width <= ancho} · desborda: ${desborda ? 'SÍ' : 'NO'}`);
    }
    await page.screenshot({ path: `/tmp/historial-${tema}-nota.png` });
    await context.close();
  }
  await browser.close();
})();
