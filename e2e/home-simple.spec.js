const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — la home se mantiene simple: una jerarquía, sin bordes ni ruido.
// Estos tests protegen el rediseño de que se vuelva a llenar de "cacharritos".

test.describe('Home simple', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('la navegación es un control segmentado, no cuatro botones sueltos', async ({ page }) => {
    const tabs = page.locator('[role="tablist"][aria-label="Secciones"]');
    await expect(tabs).toBeVisible();
    await expect(tabs.locator('[role="tab"]')).toHaveCount(4);
    // Solo uno marcado como seleccionado
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  });

  test('la sesión de hoy tiene una sola acción principal', async ({ page }) => {
    const empezar = page.getByRole('button', { name: 'Empezar' });
    await expect(empezar).toBeVisible();
    await expect(empezar).toHaveCount(1);
  });

  test('las tarjetas no llevan borde visible', async ({ page }) => {
    const tarjeta = page.locator('.fx-card').first();
    await expect(tarjeta).toBeVisible();

    const borde = await tarjeta.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        width: cs.borderTopWidth,
        style: cs.borderTopStyle,
        radius: cs.borderTopLeftRadius,
      };
    });

    expect(borde.width === '0px' || borde.style === 'none', `la tarjeta tiene borde: ${JSON.stringify(borde)}`).toBe(true);
    expect(parseFloat(borde.radius)).toBeGreaterThanOrEqual(16);
  });

  test('los textos de relleno siguen fuera', async ({ page }) => {
    await expect(page.getByText('Toca para enfocar la sesión')).toHaveCount(0);
    await expect(page.getByText('Filtra por objetivo y consulta')).toHaveCount(0);
  });

  test('la cabecera usa la escala del sistema, sin monoespaciada', async ({ page }) => {
    const titulo = page.getByRole('heading', { level: 1 }).first();
    const fuente = await titulo.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fuente.toLowerCase()).not.toContain('mono');
  });
});
