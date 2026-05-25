const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base = 'http://localhost:3001';
  const dir = '/Volumes/10TB/apps/Titanium/titanium-app/test-screenshots';

  // 1. Ir a inicio
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('1. Dashboard cargado');

  // 2. Click en calentamiento rápido
  await page.click('text=Calentamiento Rápido');
  await page.waitForTimeout(1000);
  console.log('2. Warmup abierto');
  await page.screenshot({ path: `${dir}/warmup-start.png` });

  // 3. Completar 4 ejercicios rápido (click Siguiente/Empezar)
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(200);
    // Click en el botón verde (Siguiente o Empezar)
    const btn = await page.locator('button.bg-primary-container').first();
    const text = await btn.textContent();
    console.log(`   Ejercicio ${i + 1}: ${text.trim()}`);
    await btn.click();
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(1000);
  console.log('3. Warmup completado');

  // 4. Verificar que volvió al inicio
  const url = page.url();
  console.log(`4. URL final: ${url}`);
  
  if (url === `${base}/` || url === base) {
    console.log('   ✅ CORRECTO: Volvió al inicio');
  } else {
    console.log('   ❌ ERROR: No volvió al inicio');
  }

  await page.screenshot({ path: `${dir}/warmup-end.png` });

  await browser.close();
})();
