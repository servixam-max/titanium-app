const { test, expect } = require('@playwright/test');

// Test end-to-end: guiado -> warmup -> ejercicios

test.describe('Flujo Guiado: Calentamiento > Ejercicios', () => {
  
  test('Modo guiado redirige a /warmup con redirect=/workout/guided', async ({ page }) => {
    await page.goto('http://localhost:3001/routine/1');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Hacer click en modo guided (ya está por defecto en guided)
    // Esperar que el botón GUIDED esté seleccionado
    const startBtn = await page.locator('button:has-text("INICIAR ENTRENAMIENTO")').first();
    await expect(startBtn).toBeVisible();
    
    // Click en iniciar
    await startBtn.click();
    
    // Esperar navegación a /warmup?redirect=/workout/guided
    await page.waitForURL(/\/warmup.*/, { timeout: 5000 });
    const url = page.url();
    expect(url).toContain('/warmup');
    expect(url).toContain('redirect=/workout/guided');
    console.log('✅ Navegación a warmup con redirect correcto:', url);
  });

  test('Warmup con redirect redirige al workout', async ({ page }) => {
    // Ir directamente a warmup con redirect
    await page.goto('http://localhost:3001/warmup?redirect=/workout/guided');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verificar que está en la página de warmup
    await expect(page.locator('text=CALENTAMIENTO').first()).toBeVisible();
    
    // Simular que venimos del modo guiado: startWorkout debería estar en localStorage/Zustand
    // Pero con Playwright nuevo no hay sesión. 
    // En su lugar, verificamos que el parámetro redirect se lee bien comprobando la redirección final.
    
    // Saltar el warmup
    const skipBtn = await page.locator('button:has-text("Saltar")').first();
    await skipBtn.click();
    
    // Esperar a workout/guided
    await page.waitForURL(/\/workout\/guided/, { timeout: 5000 });
    expect(page.url()).toContain('/workout/guided');
    console.log('✅ Warmup salta a /workout/guided correctamente');
  });

  test('Warmup por defecto (sin redirect) vuelve a /', async ({ page }) => {
    await page.goto('http://localhost:3001/warmup');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Saltar
    const skipBtn = await page.locator('button:has-text("Saltar")').first();
    await skipBtn.click();
    
    // Volver a home
    await page.waitForURL('http://localhost:3001/', { timeout: 5000 });
    expect(page.url()).toBe('http://localhost:3001/');
    console.log('✅ Warmup sin redirect vuelve a /');
  });

});
