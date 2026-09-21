const { test, expect } = require('@playwright/test');

// FORTIXAM — el modo claro no debe quedarse con superficies oscuras fijas.
// Estos tests comprueban estilos calculados reales (no solo que exista el toggle).

const E2E_USER = {
  id: 'e2e-user-id',
  clientId: 'e2e',
  ownerUserId: 'e2e-user-id',
  username: 'E2E',
  email: 'e2e@fortixam.local',
  passwordHash: '',
  avatarColor: '#00D68F',
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  version: 1,
  authProvider: 'local',
  serverUserId: 'e2e-user-id',
};

/** Luminancia relativa para comparar si un color es claro u oscuro. */
function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

async function fondoDe(page, selector) {
  return page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
}

test.describe('Modo claro sin superficies oscuras', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      localStorage.setItem('fortixam_server_user', JSON.stringify(user));
      localStorage.setItem('fortixam_active_user_id', user.id);
      localStorage.setItem(
        'titanium-storage',
        JSON.stringify({ state: { onboardingComplete: true, theme: 'light' }, version: 0 })
      );
      // El store rehidrata su propio tema y es el que manda tras montar;
      // la clave suelta la usa el script de arranque (zero-FOUC).
      localStorage.setItem('fortixam-theme', 'light');
    }, E2E_USER);
  });

  test('el fondo del documento es claro en modo claro', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const html = await page.locator('html').getAttribute('class');
    if (!html || !html.includes('light')) {
      // Si el tema arranca en oscuro, se cambia con el botón de la cabecera
      await page.locator('button[aria-label="Cambiar a modo claro"]').first().click({ force: true });
    }

    await expect(page.locator('html')).toHaveClass(/light/);

    const bg = await fondoDe(page, 'body');
    expect(luminance(bg), `body debería ser claro, es ${bg}`).toBeGreaterThan(0.6);
  });

  test('la pantalla de entreno completado respeta el modo claro', async ({ page }) => {
    await page.goto('/workout/complete');
    await page.waitForLoadState('networkidle');

    const html = await page.locator('html').getAttribute('class');
    if (!html || !html.includes('light')) {
      await page.locator('button[aria-label="Cambiar a modo claro"]').first().click({ force: true });
    }

    const bg = await fondoDe(page, 'body');
    // Antes esta pantalla forzaba #080808: en modo claro seguía siendo negra.
    expect(luminance(bg), `la pantalla de fin de entreno no debe ser negra en modo claro (${bg})`).toBeGreaterThan(0.6);
  });

  test('las páginas de datos no tienen contenedores oscuros sueltos', async ({ page }) => {
    for (const ruta of ['/stats', '/history', '/weight']) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');

      const html = await page.locator('html').getAttribute('class');
      if (!html || !html.includes('light')) continue;

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
          // Solo superficies grandes: las oscuras pequeñas suelen ser chips/botones intencionales
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
