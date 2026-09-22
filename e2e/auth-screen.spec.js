const { test, expect } = require('@playwright/test');

// FORTIXAM — pantalla de acceso. No tenía cobertura porque el resto de e2e la
// saltan sembrando la sesión; aquí se entra sin sesión a propósito.

test.describe('Pantalla de acceso', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // Evita llamadas de detección de servidor colgando en el arranque
      localStorage.setItem('fortixam_theme', 'dark');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('se muestra cuando no hay sesión iniciada', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'FORTIXAM' }).first()).toBeVisible();
    await expect(page.locator('input[placeholder="Nombre de usuario o correo"]')).toBeVisible();
    await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible();
  });

  test('el acceso se organiza con un control segmentado', async ({ page }) => {
    const tabs = page.locator('[role="tablist"][aria-label="Acceso"]');
    await expect(tabs).toBeVisible();
    await expect(tabs.locator('button')).toHaveCount(2);
    await expect(page.locator('[aria-selected="true"]').first()).toHaveText(/Entrar/);
  });

  test('los campos no llevan borde y respetan el tamaño táctil', async ({ page }) => {
    const input = page.locator('input[placeholder="Nombre de usuario o correo"]');
    const estilos = await input.evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { border: cs.borderTopWidth, altura: r.height, fontSize: cs.fontSize };
    });

    expect(estilos.border === '0px' || estilos.border === '0px none', `con borde: ${estilos.border}`).toBe(true);
    expect(estilos.altura).toBeGreaterThanOrEqual(44);
    // 16px evita el zoom automático de iOS al enfocar
    expect(parseFloat(estilos.fontSize)).toBeGreaterThanOrEqual(16);
  });

  test('cambiar a crear cuenta muestra el formulario de registro', async ({ page }) => {
    await page.locator('[role="tablist"][aria-label="Acceso"] button', { hasText: 'Crear cuenta' }).click({ force: true });
    await expect(page.locator('input[placeholder="tu@correo.com"]')).toBeVisible();
  });
});
