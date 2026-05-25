const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base = 'http://localhost:3001';
  const dir = '/Volumes/10TB/apps/Titanium/titanium-app/test-screenshots';

  console.log('TEST WARMUP - Flujo completo');

  // 1. Dashboard
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('1. Dashboard');
  await page.screenshot({ path: `${dir}/warmup-flow-01-home.png` });

  // 2. Abrir warmup
  await page.click('text=Calentamiento Rápido');
  await page.waitForTimeout(800);
  console.log('2. Warmup abierto');
  await page.screenshot({ path: `${dir}/warmup-flow-02.png` });

  // 3. Ejercicio 1 -> 2 (Siguiente)
  await page.click('button:has-text("Siguiente")');
  await page.waitForTimeout(300);
  console.log('3. Ejercicio 2');
  await page.screenshot({ path: `${dir}/warmup-flow-03.png` });

  // 4. Ejercicio 2 -> 3
  await page.click('button:has-text("Siguiente")');
  await page.waitForTimeout(300);
  console.log('4. Ejercicio 3');
  await page.screenshot({ path: `${dir}/warmup-flow-04.png` });

  // 5. Ejercicio 3 -> 4
  await page.click('button:has-text("Siguiente")');
  await page.waitForTimeout(300);
  console.log('5. Ejercicio 4');
  await page.screenshot({ path: `${dir}/warmup-flow-05.png` });

  // 6. Último ejercicio: Empezar -> vuelve al inicio
  await page.click('button:has-text("Empezar")');
  await page.waitForTimeout(1500);
  console.log('6. Warmup terminado');
  
  const url = page.url();
  const isHome = url === base + '/' || url === base;
  console.log(`   URL: ${url}`);
  console.log(isHome ? '✅ CORRECTO: Volvió al inicio' : `❌ Error: ${url}`);
  
  await page.screenshot({ path: `${dir}/warmup-flow-06-home.png` });

  await browser.close();
  console.log('TEST COMPLETADO');
})();
