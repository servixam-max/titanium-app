const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — el modo claro no debe quedarse con superficies oscuras fijas.
// Se comprueban estilos calculados reales, no solo que exista el interruptor.

/** Luminancia relativa (0 = negro, 1 = blanco) para decidir si algo es claro. */
function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

async function fondoDe(page, selector) {
  return page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
}

test.describe('Modo claro sin superficies oscuras', () => {
  // Se arranca ya en modo claro: así también cubrimos pantallas sin
  // interruptor de tema (p. ej. la de fin de entreno).
  test.beforeEach(async ({ page }) => {
    await seedSession(page, { theme: 'light' });
  });

  test('el fondo del documento es claro en modo claro', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveClass(/light/);

    const bg = await fondoDe(page, 'body');
    expect(luminance(bg), `body debería ser claro, es ${bg}`).toBeGreaterThan(0.6);
  });

  test('la pantalla de entreno completado respeta el modo claro', async ({ page }) => {
    await page.goto('/workout/complete');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveClass(/light/);

    const bg = await fondoDe(page, 'body');
    // Antes esta pantalla forzaba #080808: en modo claro seguía siendo negra.
    expect(
      luminance(bg),
      `la pantalla de fin de entreno no debe ser negra en modo claro (${bg})`,
    ).toBeGreaterThan(0.6);
  });

  test('las páginas de datos no tienen contenedores oscuros sueltos', async ({ page }) => {
    for (const ruta of ['/stats', '/history', '/weight']) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');

      const oscuros = await page.evaluate(() => {
        const malos = [];
        document.querySelectorAll('div, section, main').forEach((el) => {
          const bg = getComputedStyle(el).backgroundColor;
          const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (!m) return;
          const [, r, g, b, a] = m;
          const alpha = a === undefined ? 1 : Number(a);
          if (alpha < 0.5) return; // translúcidos decorativos
          const lum = (0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b)) / 255;
          const rect = el.getBoundingClientRect();
          // Solo superficies grandes: las oscuras pequeñas suelen ser chips intencionales
          if (lum < 0.25 && rect.width > 200 && rect.height > 80) {
            malos.push(`${el.tagName}.${el.className.toString().slice(0, 40)} → ${bg}`);
          }
        });
        return malos;
      });

      expect(oscuros, `superficies oscuras en ${ruta}: ${oscuros.join(' | ')}`).toEqual([]);
    }
  });
});
