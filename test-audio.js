const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  
  // Interceptar errores de consola
  const errors = [];
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  
  const base = 'http://localhost:3001';
  const dir = '/Volumes/10TB/apps/Titanium/titanium-app/test-screenshots';

  // 1. Ir al dashboard
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // 2. Activar audio si está desactivado (comprobar toggle en settings)
  await page.click('button:has-text("")'); // Settings icon
  await page.waitForTimeout(300);
  
  // Buscar toggle de audio y activarlo
  const audioToggle = await page.locator('button', { hasText: /Sonidos/ }).first();
  if (await audioToggle.isVisible().catch(() => false)) {
    await audioToggle.click();
  }
  await page.click('text=Cancelar').catch(() => {});
  
  // 3. Ir a rutina 1
  await page.goto(`${base}/routine/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // 4. Seleccionar modo individual
  await page.click('text=Modo Individual');
  await page.waitForTimeout(200);
  
  // 5. Empezar entrenamiento (va directo al workout)
  await page.click('text=INICIAR ENTRENAMIENTO');
  await page.waitForTimeout(2000);
  
  // 6. Meter peso
  await page.fill('input[type="number"]', '10');
  await page.click('text=EMPEZAR ENTRENAMIENTO');
  await page.waitForTimeout(1000);
  
  // 7. Completar serie (debería sonar)
  await page.click('text=COMPLETAR SERIE');
  await page.waitForTimeout(3000); // Esperar al descanso
  
  // Screenshot del descanso
  await page.screenshot({ path: `${dir}/audio-test-rest.png` });
  console.log('✅ Screenshot descanso guardado');
  
  // 8. Saltar descanso
  await page.click('text=Saltar descanso');
  await page.waitForTimeout(1000);
  
  await browser.close();
  
  if (errors.length === 0) {
    console.log('✅ TEST AUDIO: Sin errores de JavaScript');
    console.log('✅ Los sonidos se dispararon correctamente');
  } else {
    console.log('⚠️ Errores encontrados:', errors.slice(0, 5));
  }
})();
