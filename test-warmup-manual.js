const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base = 'http://localhost:3001';
  const dir = '/Volumes/10TB/apps/Titanium/titanium-app/test-screenshots';

  console.log('=== TEST WARMUP ===');

  // 1. Ir a inicio
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  console.log('1. Dashboard');
  await page.screenshot({ path: `${dir}/warmup-test-01-home.png` });

  // 2. Click en Calentamiento Rápido
  await page.click('text=Calentamiento Rápido');
  await page.waitForTimeout(1000);
  console.log('2. Warmup abierto');
  await page.screenshot({ path: `${dir}/warmup-test-02-open.png` });

  // 3. Click "Siguiente" (ejercicio 1 -> 2)
  await page.click('button:has-text("Siguiente")');
  await page.waitForTimeout(500);
  console.log('3. Ejercicio 2');
  await page.screenshot({ path: `${dir}/warmup-test-03-ex2.png` });

  // 4. Click "Siguiente" (ejercicio 2 -> 3)
  await page.click('button:has-text("Siguiente")');
  await page.waitForTimeout(500);
  console.log('4. Ejercicio 3');
  await page.screenshot({ path: `${dir}/warmup-test-04-ex3.png` });

  // 5. Click "Siguiente" (ejercicio 3 -> 4)
  await page.click('button:has-text("Siguiente")');
  await page.waitForTimeout(500);
  console.log('5. Ejercicio 4');
  await page.screenshot({ path: `${dir}/warmup-test-05-ex4.png` });

  // 6. Click "Empezar" (último ejercicio, vuelve a inicio)
  await page.click('button:has-text("Empezar")');
  await page.waitForTimeout(1500);
  console.log('6. Warmup terminado');
  
  const url = page.url();
  console.log(`   URL: ${url}`);
  const isHome = url === base || url === `${base}/`;
  console.log(isHome ? '✅ CORRECTO: Volvió al inicio' : `❌ Error: ${url}`);
  
  await page.screenshot({ path: `${dir}/warmup-test-06-end.png` });

  await browser.close();
  console.log('=== TEST COMPLETADO ===');
})();
