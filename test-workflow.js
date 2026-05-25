const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const base = 'http://localhost:3001';
  const dir = '/Volumes/10TB/apps/Titanium/titanium-app/test-screenshots';

  // 1. Dashboard
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/01-dashboard.png` });
  console.log('✅ 01-dashboard');

  // 2. Routine page
  await page.goto(`${base}/routine/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/02-routine.png` });
  console.log('✅ 02-routine');

  // 3. Select Guided mode
  await page.click('text=Modo Guiado');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/03-guided-selected.png` });
  console.log('✅ 03-guided-selected');

  // 4. Start workout (goes to warmup)
  await page.click('text=INICIAR ENTRENAMIENTO');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/04-warmup.png` });
  console.log('✅ 04-warmup');

  // Skip warmup exercises - use button with text containing "Saltar"
  for (let i = 0; i < 4; i++) {
    const skipBtn = await page.locator('button', { hasText: /Saltar/ }).first();
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(300);
    } else {
      // Fallback: click any button with "Saltar"
      await page.click('button:has-text("Saltar")');
      await page.waitForTimeout(300);
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/05-guided-weight-prompt.png` });
  console.log('✅ 05-guided-weight-prompt');

  // Fill weight and start
  await page.fill('input[type="number"]', '12');
  await page.waitForTimeout(200);
  await page.click('text=EMPEZAR ENTRENAMIENTO');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/06-guided-workout.png` });
  console.log('✅ 06-guided-workout');

  // Complete a set
  await page.click('text=COMPLETAR SERIE');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/07-guided-rest.png` });
  console.log('✅ 07-guided-rest');

  // Skip rest
  await page.click('text=Saltar descanso');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/08-guided-after-rest.png` });
  console.log('✅ 08-guided-after-rest');

  await browser.close();
  console.log('✅ All done!');
})();
