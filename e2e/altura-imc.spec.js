const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { restoreBackup } = require('./helpers/backup');
const { auditarContraste } = require('./helpers/contraste-pixel');

// FORTIXAM — altura real para el IMC (F12.1).
//
// El IMC de Control de Peso ya no se calcula con una media de 1,75 m: la
// altura se fija en Ajustes y se aplica al instante (evento entre pantallas),
// persiste por usuario al recargar y una altura imposible no se guarda.
//
// La fecha del pesaje se construye relativa a HOY para que el test no caduque.

test.use({ serviceWorkers: 'block' });

function isoDaysAgo(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeWeight(id, days, weight) {
  const date = isoDaysAgo(days);
  return {
    id,
    clientId: 'e2e',
    ownerUserId: 'e2e-user-id',
    createdAt: `${date}T07:00:00.000Z`,
    modifiedAt: `${date}T07:00:00.000Z`,
    version: 1,
    weight,
    date,
  };
}

// Un único pesaje de hoy: 80,0 kg. Con 1,75 m el IMC es 26,1; con 2,00 m, 20,0.
const WEIGHTS = [makeWeight('wt-altura', 0, 80.0)];

function backupWith(weights) {
  return {
    app: 'FORTIXAM',
    version: '8.5.66',
    exportedAt: new Date().toISOString(),
    user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
    sessions: [],
    weights,
    lastExerciseWeights: {},
  };
}

async function openSettingsFromWeight(page) {
  await page.locator('button[title^="Perfil de"]').click();
  const seccion = page.getByTestId('body-height');
  await seccion.waitFor({ state: 'visible', timeout: 10_000 });
  await seccion.scrollIntoViewIfNeeded();
  return seccion;
}

async function closeSettings(page) {
  await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
}

test.describe('Altura para el IMC (F12.1)', () => {
  test('la altura de Ajustes cambia el IMC al instante y persiste', async ({ page }) => {
    await seedSession(page, { theme: 'dark' });
    await restoreBackup(page, backupWith(WEIGHTS));

    await page.goto('/weight');
    await page.waitForLoadState('networkidle');

    const imc = page.locator('[aria-label^="IMC "]');
    await expect(imc).toHaveText('26,1', { timeout: 10_000 });
    await expect(page.getByTestId('bmi-height')).toHaveText('1,75 m · est.');

    const seccion = await openSettingsFromWeight(page);
    await page.locator('#body-height-input').fill('200');
    await page.getByRole('button', { name: 'Guardar altura' }).click();
    await expect(seccion.getByTestId('body-height-current')).toHaveText('2,00 m');

    await closeSettings(page);

    // Sin recargar: el evento entre Ajustes y Peso aplica la altura nueva.
    await expect(imc).toHaveText('20,0');
    await expect(page.getByTestId('bmi-height')).toHaveText('2,00 m');

    // Al recargar sigue guardada para este usuario.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[aria-label^="IMC "]')).toHaveText('20,0', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('bmi-height')).toHaveText('2,00 m');
  });

  test('rechaza una altura imposible y no cambia el IMC', async ({ page }) => {
    await seedSession(page, { theme: 'dark' });
    await restoreBackup(page, backupWith(WEIGHTS));

    await page.goto('/weight');
    await page.waitForLoadState('networkidle');

    const imc = page.locator('[aria-label^="IMC "]');
    await expect(imc).toHaveText('26,1', { timeout: 10_000 });

    const seccion = await openSettingsFromWeight(page);
    await page.locator('#body-height-input').fill('300');
    await page.getByRole('button', { name: 'Guardar altura' }).click();

    await expect(seccion.getByRole('alert')).toHaveText(
      'Pon una altura entre 120 y 230 cm.',
    );

    await closeSettings(page);

    // Sigue con la altura estimada: no se guardó nada.
    await expect(imc).toHaveText('26,1');
    await expect(page.getByTestId('bmi-height')).toHaveText('1,75 m · est.');
  });

  test('la sección nueva se lee en los dos temas', async ({ page }) => {
    await seedSession(page, { theme: 'dark' });
    await restoreBackup(page, backupWith(WEIGHTS));

    await page.goto('/weight');
    await page.waitForLoadState('networkidle');
    const oscura = await openSettingsFromWeight(page);

    const auditOscuro = await auditarContraste(page, '[data-testid="body-height"]');
    expect(auditOscuro.infracciones, auditOscuro.infracciones.join('\n')).toEqual([]);
    if (auditOscuro.degradados > 0) {
      expect(auditOscuro.medidos).toBe(auditOscuro.degradados);
    }

    await seedSession(page, { theme: 'light' });
    await page.goto('/weight');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.className)).toContain('light');

    const clara = await openSettingsFromWeight(page);
    await expect(clara).toBeVisible();

    const auditClaro = await auditarContraste(page, '[data-testid="body-height"]');
    expect(auditClaro.infracciones, auditClaro.infracciones.join('\n')).toEqual([]);
    if (auditClaro.degradados > 0) {
      expect(auditClaro.medidos).toBe(auditClaro.degradados);
    }
  });
});
