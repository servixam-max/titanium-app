const { test, expect } = require('@playwright/test');

// Comprobación: Servidor corriendo en 3001
// Build completo con BUILD_ID, CSS y JS generados
// API responde correctamente
// HTML contiene todos los elementos PWA

test.describe('FORTIXAM - Verificación Completa de Build y Servidor', () => {
  
  test('Build existe y servidor responde', async ({ request }) => {
    // 1. API Test
    const apiResponse = await request.get('http://localhost:3001/api/sessions');
    expect(apiResponse.ok()).toBe(true);
    const apiData = await apiResponse.json();
    expect(Array.isArray(apiData.sessions)).toBe(true);
    console.log('✅ API /api/sessions responde:', JSON.stringify(apiData).slice(0, 100));
  });

  test('HTML contiene elementos PWA esenciales', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    
    // Esperar que cargue
    await page.waitForSelector('body', { timeout: 10000 });
    
    // 2. Verificar meta tags PWA
    const title = await page.title();
    expect(title).toContain('FORTIXAM');
    
    const manifestLinks = await page.locator('link[rel="manifest"]').all();
    expect(manifestLinks.length).toBeGreaterThan(0);
    const href = await manifestLinks[0].getAttribute('href');
    expect(href).toBe('/manifest.json');
    
    const appleMobile = await page.locator('meta[name="apple-mobile-web-app-capable"]').first().getAttribute('content');
    expect(appleMobile).toBe('yes');
    
    const appleStatusBar = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').first().getAttribute('content');
    expect(appleStatusBar).toBe('black-translucent');
    
    const viewport = await page.locator('meta[name="viewport"]').first().getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
    expect(viewport).toContain('user-scalable=no');
    console.log('✅ Meta tags PWA correctos');
    
    // 3. Verificar CSS cargado
    const cssLinks = await page.locator('link[rel="stylesheet"]').count();
    expect(cssLinks).toBeGreaterThan(0);
    console.log('✅ CSS cargado, links:', cssLinks);
    
    // 4. Verificar contenido visible
    await expect(page.locator('text=FORTIXAM').first()).toBeVisible();
    await expect(page.locator('text=Historial').first()).toBeVisible();
    await expect(page.locator('text=Peso').first()).toBeVisible();
    
    console.log('✅ Contenido visible correctamente');
  });

  test('Manifest.json es accesible y válido', async ({ request }) => {
    const response = await request.get('http://localhost:3001/manifest.json');
    expect(response.ok()).toBe(true);
    
    const manifest = await response.json();
    expect(manifest.name).toContain('FORTIXAM');
    expect(manifest.short_name).toContain('FORTIXAM');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#131313');
    expect(manifest.theme_color).toBe('#131313');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    
    console.log('✅ Manifest.json válido:', manifest.name, '- icons:', manifest.icons.length);
  });

  test('Service Worker está registrado', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForTimeout(3000); // Esperar registro del SW
    
    const swUrl = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.scope;
    });
    
    expect(swUrl).toContain('localhost:3001');
    console.log('✅ Service Worker registrado, scope:', swUrl);
  });

  test('API de peso funciona', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/weight');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(Array.isArray(data.weights)).toBe(true);
    console.log('✅ API /api/weight responde, weights:', data.weights.length);
  });

  test('Página de historial carga correctamente', async ({ page }) => {
    await page.goto('http://localhost:3001/history');
    await page.waitForSelector('body', { timeout: 10000 });
    
    await expect(page.locator('text=Historial').first()).toBeVisible();
    console.log('✅ Página /history carga correctamente');
  });

  test('Página de peso carga correctamente', async ({ page }) => {
    await page.goto('http://localhost:3001/weight');
    await page.waitForSelector('body', { timeout: 10000 });
    
    await expect(page.locator('h1:has-text("REGISTRO PESO")').first()).toBeVisible();
    console.log('✅ Página /weight carga correctamente');
  });

});
