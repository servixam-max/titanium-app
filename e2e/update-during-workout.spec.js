const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — el aviso de actualización no interrumpe un entreno (F9.1).
//
// Antes, con una versión nueva publicada, el diálogo saltaba a los 3 s del
// arranque aunque el usuario estuviera entre series. Ahora se guarda y espera
// a que el entreno termine o se abandone; la comprobación manual de Ajustes
// sigue respondiendo al momento.
//
// La versión nueva se simula interceptando la API de GitHub, igual que en
// `update-notes.spec.js`.

const VERSION_NUEVA = '9.0.0';

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

/** Deja la app en mitad de un entreno con una versión nueva esperando. */
async function entrenoEnMarcha(page) {
  await mockNuevaVersion(page);
  await seedSession(page);
  await seedWorkout(page, { mode: 'individual' });
  await page.goto('/workout/individual');
  await expect(page.getByText('Press de Banca Plano').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('Actualización — no interrumpe un entreno (F9.1)', () => {
  test('entre series no salta el diálogo, y sale al abandonar el entreno', async ({ page }) => {
    await entrenoEnMarcha(page);

    // Pasan los 3 s del chequeo automático (y de sobra): el aviso no aparece.
    await page.waitForTimeout(6000);
    await expect(page.getByText('Actualización Lista')).toHaveCount(0);

    // Abandonar el entreno: el aviso ya puede salir.
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByText('¿Salir del entreno?')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Cancelar entreno' }).click();

    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: `Actualizar a v${VERSION_NUEVA}` })).toBeVisible();
  });

  test('al terminar el entreno el aviso llega al resumen, no antes', async ({ page }) => {
    await entrenoEnMarcha(page);

    await page.waitForTimeout(6000);
    await expect(page.getByText('Actualización Lista')).toHaveCount(0);

    // Guardar y salir: entreno terminado → resumen.
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByText('¿Salir del entreno?')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Guardar y salir' }).click();

    await page.waitForURL(/\/workout\/complete/, { timeout: 15_000 });
    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
  });
});
