const { test, expect } = require('@playwright/test');

// FORTIXAM v8 — humo del export estático (lo que sirve el APK WebView).
// Las API requieren auth + PostgreSQL y se cubren con Vitest en src/lib.

test.describe('FORTIXAM — PWA estática', () => {

  test('Home carga con título y branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FORTIXAM/);
    await expect(page.locator('text=FORTIXAM').first()).toBeVisible();
  });

  test('Meta tags PWA esenciales', async ({ page }) => {
    await page.goto('/');

    const manifest = page.locator('link[rel="manifest"]').first();
    await expect(manifest).toHaveAttribute('href', '/manifest.json');

    await expect(
      page.locator('meta[name="apple-mobile-web-app-capable"]').first()
    ).toHaveAttribute('content', 'yes');

    await expect(
      page.locator('meta[name="theme-color"]').first()
    ).toHaveAttribute('content', '#05090C');

    // CSS cargado
    const cssCount = await page.locator('link[rel="stylesheet"]').count();
    expect(cssCount).toBeGreaterThan(0);
  });

  test('manifest.json válido con tema v8', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.ok()).toBe(true);

    const manifest = await res.json();
    expect(manifest.name).toContain('FORTIXAM');
    expect(manifest.short_name).toBe('FORTIXAM');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#05090C');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('Páginas principales renderizan', async ({ page }) => {
    for (const ruta of ['/history', '/stats', '/weight']) {
      const res = await page.goto(ruta);
      expect(res.status(), `${ruta} debe responder 200`).toBe(200);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Páginas de detalle de rutina renderizan', async ({ page }) => {
    const res = await page.goto('/routine/1');
    expect(res.status()).toBe(200);
    await expect(page.locator('text=INICIAR MODO').first()).toBeVisible();
  });

  test('Assets de imagen servidos', async ({ request }) => {
    const res = await request.get('/images/exercises/dumbbell_flat_bench/screen.webp');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('image/webp');
  });

  test('Service Worker registrado', async ({ page }) => {
    await page.goto('/');
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.scope;
    });
    expect(scope).toContain('127.0.0.1:3310');
  });

  test('Sin errores de consola en la home', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (err) => errores.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(1500);
    expect(errores, `Errores de página: ${errores.join(' | ')}`).toEqual([]);
  });
});