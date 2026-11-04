const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { auditarContraste } = require('./helpers/contraste-pixel');

// FORTIXAM — «Ahora no» del aviso de actualización se recuerda (F9.3).
//
// El diálogo se cerraba sin guardar nada: a los 3 s del siguiente arranque
// volvía a saltar, y al otro. Ahora el «no» vale para esa versión y hasta el
// día siguiente; la comprobación manual de Ajustes sigue respondiendo siempre.
//
// La versión nueva se simula interceptando la API de GitHub, igual que en
// `update-notes.spec.js`.

const VERSION_NUEVA = '9.0.0';
const CLAVE = 'fortixam:update-dismissed';

test.use({ serviceWorkers: 'block' });

async function mockNuevaVersion(page) {
  await page.route('**/api.github.com/repos/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/releases/latest')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tag_name: `v${VERSION_NUEVA}`,
          name: `FORTIXAM v${VERSION_NUEVA}`,
          body: '',
          assets: [
            {
              name: `FORTIXAM-${VERSION_NUEVA}.apk`,
              browser_download_url: `https://github.com/servixam-max/titanium-app/releases/download/v${VERSION_NUEVA}/FORTIXAM-${VERSION_NUEVA}.apk`,
            },
          ],
        }),
      });
      return;
    }

    if (url.includes('/releases?')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    await route.fulfill({ status: 404, body: '{}' });
  });

  await page.route('**/raw.githubusercontent.com/**', async (route) => {
    await route.fulfill({ status: 404, body: '{}' });
  });
}

/** Día local en formato `YYYY-MM-DD`, el mismo que guarda la app. */
function diaLocal(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Deja guardado un descarte antes de que la app arranque. */
async function sembrarDescarte(page, { version, dia }) {
  await page.addInitScript(
    ({ clave, version, dia }) => {
      localStorage.setItem(clave, JSON.stringify({ version, day: dia }));
    },
    { clave: CLAVE, version, dia }
  );
}

test.describe('Actualización — «Ahora no» se recuerda (F9.3)', () => {
  test('se cierra una vez y no vuelve al reabrir el mismo día', async ({ page }) => {
    await mockNuevaVersion(page);
    await seedSession(page);
    await page.goto('/');

    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('No te avisaré de esta versión hasta mañana.')).toBeVisible();

    // Zona táctil de 48 px, como el resto de acciones del diálogo.
    const caja = await page.getByTestId('update-dismiss').boundingBox();
    expect(caja.height).toBeGreaterThanOrEqual(44);
    expect(caja.width).toBeGreaterThan(250);

    await page.getByTestId('update-dismiss').click();
    await expect(page.getByText('Actualización Lista')).toHaveCount(0);

    // Se cierra la app y se vuelve a abrir: el aviso ya no interrumpe.
    await page.reload();
    await page.waitForTimeout(6000);
    await expect(page.getByText('Actualización Lista')).toHaveCount(0);

    // Pero la comprobación manual de Ajustes sigue trayéndolo.
    const ajustes = page.locator('button[aria-label*="Ajustes"]').first();
    await ajustes.waitFor({ timeout: 10_000 });
    await ajustes.click();
    const comprobar = page.getByRole('button', { name: 'Comprobar Actualizaciones' });
    await comprobar.scrollIntoViewIfNeeded();
    await comprobar.click();
    await expect(page.getByText(`¡Nueva versión v${VERSION_NUEVA} lista!`)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('al día siguiente el aviso vuelve a salir', async ({ page }) => {
    await mockNuevaVersion(page);
    await seedSession(page);

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    await sembrarDescarte(page, { version: VERSION_NUEVA, dia: diaLocal(ayer) });

    await page.goto('/');
    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
  });

  test('si aparece otra versión, el «no» anterior no la silencia', async ({ page }) => {
    await mockNuevaVersion(page);
    await seedSession(page);

    const hoy = diaLocal(new Date());
    await sembrarDescarte(page, { version: '8.9.9', dia: hoy });

    await page.goto('/');
    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Nueva versión`)).toContainText(`v${VERSION_NUEVA}`);
  });

  test('el aviso con su «Ahora no» se lee en los dos temas', async ({ page }) => {
    await mockNuevaVersion(page);
    await seedSession(page, { theme: 'dark' });
    await page.goto('/');
    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });

    const oscuro = await auditarContraste(page, '[data-testid="update-dialog"]');
    expect(oscuro.infracciones, oscuro.infracciones.join('\n')).toEqual([]);

    await seedSession(page, { theme: 'light' });
    await page.reload();
    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('html')).toHaveClass(/light/);

    const claro = await auditarContraste(page, '[data-testid="update-dialog"]');
    expect(claro.infracciones, claro.infracciones.join('\n')).toEqual([]);
  });
});
