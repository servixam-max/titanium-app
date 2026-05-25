const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base = 'http://localhost:3001';
  const dir = '/Volumes/10TB/apps/Titanium/titanium-app/test-screenshots';

  // 1. Ir a página de peso
  await page.goto(`${base}/weight`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  console.log('1. Página de peso cargada');
  await page.screenshot({ path: `${dir}/weight-empty.png` });

  // 2. Click en + para añadir
  await page.click('button:has-text("")'); // Botón + en header
  await page.waitForTimeout(300);
  console.log('2. Modal abierto');
  await page.screenshot({ path: `${dir}/weight-modal.png` });

  // 3. Introducir peso
  await page.fill('input[type="number"]', '82.5');
  await page.waitForTimeout(200);

  // 4. Guardar
  await page.click('text=Guardar');
  await page.waitForTimeout(1000);
  console.log('3. Peso guardado');
  await page.screenshot({ path: `${dir}/weight-saved.png` });

  // 5. Verificar en API
  const apiRes = await fetch(`${base}/api/weight`).then(r => r.json());
  console.log(`4. API: ${apiRes.weights?.length || 0} registros`);
  if (apiRes.weights?.[0]) {
    console.log(`   Último: ${apiRes.weights[0].weight}kg el ${apiRes.weights[0].date}`);
  }

  await browser.close();
  console.log('✅ TEST PESO COMPLETADO');
})();
