const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — resumen de la nueva versión antes de descargar (F1.3).
//
// El aviso de actualización decía solo "mejoras y correcciones". Ahora enseña
// qué trae la versión nueva, reutilizando las notas ya publicadas en la
// release. Aquí se simula que hay versión nueva (API de GitHub interceptada)
// para comprobar el diálogo tal y como lo verá el usuario.

const VERSION_NUEVA = '9.0.0';
const NOTAS = [
  'El entreno guiado ya no pierde el progreso al girar el móvil',
  'Nuevo heatmap de constancia en Estadísticas',
];

// El service worker cachea la API de GitHub y saltaría la simulación:
// este spec lo desactiva (el resto de e2e lo mantiene, como el APK real).
test.use({ serviceWorkers: 'block' });

/** Intercepta la API de GitHub: releases, última release y version.json. */
async function mockGitHub(page, { conNotas = true } = {}) {
  await page.route('**/api.github.com/repos/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/releases/latest')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tag_name: `v${VERSION_NUEVA}`,
          name: `FORTIXAM v${VERSION_NUEVA}`,
          body: '**Full Changelog**: https://github.com/servixam-max/titanium-app/compare/v8.5.23...v9.0.0',
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          conNotas
            ? [
                {
                  tag_name: `v${VERSION_NUEVA}`,
                  name: `FORTIXAM v${VERSION_NUEVA}`,
                  published_at: '2026-09-29T08:00:00Z',
                  body: NOTAS.map((n) => `- ${n}`).join('\n'),
                },
              ]
            : [],
        ),
      });
      return;
    }

    await route.fulfill({ status: 404, body: '{}' });
  });

  // El canal raw no debe pisar la simulación
  await page.route('**/raw.githubusercontent.com/**', async (route) => {
    await route.fulfill({ status: 404, body: '{}' });
  });
}

test.describe('Actualización — qué trae la versión nueva', () => {
  test('el aviso enseña los cambios antes de descargar', async ({ page }) => {
    await mockGitHub(page);
    await seedSession(page);
    await page.goto('/');

    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Qué trae la v${VERSION_NUEVA}`)).toBeVisible();
    for (const nota of NOTAS) {
      await expect(page.getByText(nota)).toBeVisible();
    }
    await expect(page.getByRole('button', { name: `Actualizar a v${VERSION_NUEVA}` })).toBeVisible();
  });

  test('sin notas publicadas deja el texto corto de siempre', async ({ page }) => {
    await mockGitHub(page, { conNotas: false });
    await seedSession(page);
    await page.goto('/');

    await expect(page.getByText('Actualización Lista')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Qué trae la v${VERSION_NUEVA}`)).toBeVisible();
    await expect(page.getByText('Mejoras y correcciones de mantenimiento.')).toBeVisible();
  });
});
