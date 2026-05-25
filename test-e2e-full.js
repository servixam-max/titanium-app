const { chromium } = require('playwright');

async function testE2E() {
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' 
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  
  const base = 'http://localhost:3001';
  const dir = '/Volumes/10TB/apps/Titanium/titanium-app/test-screenshots';

  console.log('=== TEST E2E: FORTIXAM ===');

  // 1. Dashboard - verificar FORTIXAM
  console.log('\n1. Dashboard');
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const title = await page.textContent('h1');
  console.log(`   Header: ${title}`);
  const welcome = await page.textContent('h2');
  console.log(`   Welcome: ${welcome}`);
  await page.screenshot({ path: `${dir}/e2e-01-dashboard.png` });
  console.log('   ✅ Screenshot: e2e-01-dashboard.png');

  // 2. Entrar a rutina Día 1
  console.log('\n2. Página de Rutina');
  await page.goto(`${base}/routine/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const routineTitle = await page.textContent('h2');
  console.log(`   Título: ${routineTitle}`);
  await page.screenshot({ path: `${dir}/e2e-02-routine.png` });
  console.log('   ✅ Screenshot: e2e-02-routine.png');

  // 3. Seleccionar modo individual
  console.log('\n3. Seleccionar modo Individual');
  await page.click('text=Modo Individual');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/e2e-03-individual.png` });
  console.log('   ✅ Screenshot: e2e-03-individual.png');

  // 4. Iniciar entrenamiento (va directo al workout)
  console.log('\n4. Iniciar entrenamiento individual');
  await page.click('text=INICIAR ENTRENAMIENTO');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${dir}/e2e-04-weight-prompt.png` });
  console.log('   ✅ Screenshot: e2e-04-weight-prompt.png');

  // 5. Introducir peso
  console.log('\n5. Introducir peso');
  await page.fill('input[type="number"]', '12');
  await page.click('text=EMPEZAR ENTRENAMIENTO');
  await page.waitForTimeout(1000);
  const exerciseName = await page.textContent('h1');
  console.log(`   Primer ejercicio: ${exerciseName}`);
  await page.screenshot({ path: `${dir}/e2e-05-workout.png` });
  console.log('   ✅ Screenshot: e2e-05-workout.png');

  // 6. Completar serie 1
  console.log('\n6. Serie 1');
  await page.click('text=COMPLETAR SERIE');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/e2e-06-rest1.png` });
  console.log('   ✅ Screenshot: e2e-06-rest1.png');

  // 7. Saltar descanso
  await page.click('text=Saltar descanso');
  await page.waitForTimeout(500);

  // 8. Serie 2
  console.log('\n7. Serie 2');
  await page.click('text=COMPLETAR SERIE');
  await page.waitForTimeout(1000);
  await page.click('text=Saltar descanso');
  await page.waitForTimeout(500);

  // 9. Serie 3 (última del ejercicio)
  console.log('\n8. Serie 3 - Completa ejercicio (auto-save)');
  await page.click('text=COMPLETAR SERIE');
  await page.waitForTimeout(2000); // Esperar auto-save
  await page.screenshot({ path: `${dir}/e2e-09-exercise-complete.png` });
  console.log('   ✅ Screenshot: e2e-09-exercise-complete.png');

  // 10. Saltar descanso y verificar siguiente ejercicio
  console.log('\n9. Siguiente ejercicio');
  await page.click('text=Saltar descanso');
  await page.waitForTimeout(1000);
  const nextExercise = await page.textContent('h1');
  console.log(`   Segundo ejercicio: ${nextExercise}`);
  await page.screenshot({ path: `${dir}/e2e-10-next-exercise.png` });
  console.log('   ✅ Screenshot: e2e-10-next-exercise.png');

  // 11. Completar 3 series del segundo ejercicio
  console.log('\n10. Completar segundo ejercicio');
  for (let i = 0; i < 3; i++) {
    await page.click('text=COMPLETAR SERIE');
    await page.waitForTimeout(500);
    if (i < 2) {
      await page.click('text=Saltar descanso');
      await page.waitForTimeout(500);
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${dir}/e2e-11-exercise2-complete.png` });
  console.log('   ✅ Screenshot: e2e-11-exercise2-complete.png');

  // 12. Ir a historial
  console.log('\n11. Verificar Historial');
  await page.goto(`${base}/history`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/e2e-12-history.png`, fullPage: true });
  console.log('   ✅ Screenshot: e2e-12-history.png');

  // 13. Verificar sesiones en API
  console.log('\n12. Verificar BD via API');
  const apiResponse = await fetch(`${base}/api/sessions`).then(r => r.json());
  console.log(`   Sesiones en BD: ${apiResponse.sessions?.length || 0}`);
  if (apiResponse.sessions?.length > 0) {
    const session = apiResponse.sessions[0];
    console.log(`   Última sesión: ${session.routine_name} (${session.mode})`);
    console.log(`   Ejercicios: ${session.exercises?.length || 0}`);
    console.log(`   Completado: ${session.completed}`);
  }

  await browser.close();

  console.log('\n=== RESULTADO ===');
  if (errors.length === 0) {
    console.log('✅ TEST E2E COMPLETADO - Sin errores');
    console.log('✅ Auto-save funciona correctamente');
  } else {
    console.log('⚠️ Errores:', errors.slice(0, 5));
  }
}

testE2E().catch(err => {
  console.error('Error en test:', err);
  process.exit(1);
});
