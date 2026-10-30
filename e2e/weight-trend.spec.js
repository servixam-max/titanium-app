const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { auditarContraste } = require('./helpers/contraste-pixel');

// FORTIXAM — tendencia y objetivo de peso (F8.2).
// Recorrido real: se restaura una copia con pesajes reales desde Ajustes (el
// mismo camino que usa la app), se fija un objetivo desde la tarjeta y se
// comprueba que la media 7d, lo que falta y el objetivo persisten al recargar.
//
// Las fechas se construyen relativas a HOY para que el test no caduque.

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

// Diez pesajes en 28 días con una bajada real y ruido diario de ±0,5 kg.
const WEIGHTS = [
  makeWeight('wt-1', 27, 80.1),
  makeWeight('wt-2', 24, 79.8),
  makeWeight('wt-3', 21, 79.2),
  makeWeight('wt-4', 18, 79.0),
  makeWeight('wt-5', 15, 78.4),
  makeWeight('wt-6', 12, 77.9),
  makeWeight('wt-7', 9, 77.5),
  makeWeight('wt-8', 6, 77.1),
  makeWeight('wt-9', 3, 76.4),
  makeWeight('wt-10', 0, 76.0),
];

function backupWith(weights) {
  return {
    app: 'FORTIXAM',
    version: '8.5.56',
    exportedAt: new Date().toISOString(),
    user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
    sessions: [],
    weights,
    lastExerciseWeights: {},
  };
}

async function openSettings(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const boton = page.locator('button[aria-label*="Ajustes"]').first();
  await boton.waitFor({ timeout: 10_000 });
  await boton.click();
  await expect(page.getByText('Copias de Seguridad Locales')).toBeVisible({
    timeout: 8_000,
  });
}

async function restoreBackup(page, backup) {
  await openSettings(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'fortixam-backup-peso.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Control de peso — tendencia y objetivo (F8.2)', () => {
  test('muestra la media 7d, calcula lo que falta y persiste el objetivo', async ({
    page,
  }) => {
    await seedSession(page, { theme: 'dark' });
    await restoreBackup(page, backupWith(WEIGHTS));

    await page.goto('/weight');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('weight-trend');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText('Media 7 días')).toBeVisible();
    await expect(card.getByText('Sin objetivo')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Fijar objetivo' })).toBeVisible();

    await card.getByRole('button', { name: 'Fijar objetivo' }).click();
    const input = page.getByLabel('Peso objetivo (kg)');
    await expect(input).toBeVisible();
    await input.fill('75');
    await page.getByRole('button', { name: 'Guardar objetivo' }).click();

    await expect(card.getByText('Objetivo 75,0 kg')).toBeVisible();
    await expect(card.getByText(/Faltan [\d,]+ kg/)).toBeVisible();
    await expect(card.getByText(/A este ritmo/)).toBeVisible();

    // Al recargar, el objetivo sigue guardado para este usuario.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('weight-trend').getByText('Objetivo 75,0 kg')).toBeVisible({
      timeout: 10_000,
    });

    const oscuro = await auditarContraste(page, '[data-testid="weight-trend"]');
    expect(oscuro.infracciones, oscuro.infracciones.join('\n')).toEqual([]);
    if (oscuro.degradados > 0) {
      expect(oscuro.medidos).toBe(oscuro.degradados);
    }

    // El modo claro no puede heredar colores pensados para el fondo oscuro.
    await seedSession(page, { theme: 'light' });
    await page.goto('/weight');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.getByTestId('weight-trend').getByText('Objetivo 75,0 kg')).toBeVisible();

    const claro = await auditarContraste(page, '[data-testid="weight-trend"]');
    expect(claro.infracciones, claro.infracciones.join('\n')).toEqual([]);
    if (claro.degradados > 0) {
      expect(claro.medidos).toBe(claro.degradados);
    }
  });

  test('sin pesajes suficientes explica lo que falta y no inventa la media', async ({
    page,
  }) => {
    await seedSession(page);
    await restoreBackup(page, backupWith([makeWeight('wt-solo', 0, 78.2)]));

    await page.goto('/weight');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('weight-trend');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(
      card.getByText('Faltan 2 pesajes y 7 días para ver la tendencia.', {
        exact: true,
      }),
    ).toBeVisible();

    // Sin tendencia lista no se dibuja la media ni se estima un ETA.
    await expect(page.locator('[data-testid="weight-trend-ma"]')).toHaveCount(0);
    await expect(card.getByText(/A este ritmo/)).toHaveCount(0);
    await expect(card.getByText(/Faltan [\d,]+ kg/)).toHaveCount(0);
  });

  test('rechaza un objetivo fuera de rango y deja el formulario abierto', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/weight');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('weight-trend');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: 'Fijar objetivo' }).click();

    const input = page.getByLabel('Peso objetivo (kg)');
    await input.fill('12');
    await page.getByRole('button', { name: 'Guardar objetivo' }).click();

    await expect(card.getByText('Pon un peso entre 30 y 250 kg.')).toBeVisible();
    await expect(input).toBeVisible();
  });
});
