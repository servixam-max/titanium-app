const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — copia de seguridad JSON (F3.1).
// El recorrido completo del usuario en la versión web del circuito: exporta
// un archivo real (descarga de verdad, con su contenido comprobado) e
// importa una copia que trae entrenamientos, pesajes y marcas por ejercicio,
// que deben aparecer en el Historial y en la pantalla de Peso.
//
// El camino nativo (APK: escribir con Filesystem + hoja de Share) no se puede
// ejercitar en el navegador, pero su lógica pura está cubierta por 26 pruebas
// unitarias y su registro quedó verificado con `cap sync` en el emulador.

const BACKUP = {
  app: 'FORTIXAM',
  version: '8.5.33',
  exportedAt: '2026-10-01T08:00:00.000Z',
  user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
  sessions: [
    {
      id: 'backup-session-1',
      clientId: 'otro-dispositivo',
      ownerUserId: 'e2e-user-id',
      createdAt: '2026-09-28T18:00:00.000Z',
      modifiedAt: '2026-09-28T18:40:00.000Z',
      version: 1,
      routineId: 7,
      routineName: 'Día 7: Brazos & Hombros',
      mode: 'individual',
      startTime: '2026-09-28T18:00:00.000Z',
      endTime: '2026-09-28T18:40:00.000Z',
      completed: true,
      exercises: [
        {
          id: 'backup-log-1',
          clientId: 'otro-dispositivo',
          ownerUserId: 'e2e-user-id',
          createdAt: '2026-09-28T18:00:00.000Z',
          modifiedAt: '2026-09-28T18:40:00.000Z',
          version: 1,
          exerciseId: 'e2e-curl',
          exerciseName: 'Curl de Bíceps Clásico',
          order: 0,
          sets: [
            {
              id: 'backup-set-1',
              clientId: 'otro-dispositivo',
              ownerUserId: 'e2e-user-id',
              createdAt: '2026-09-28T18:05:00.000Z',
              modifiedAt: '2026-09-28T18:05:00.000Z',
              version: 1,
              setNumber: 1,
              weight: 16,
              reps: 12,
              completed: true,
              timestamp: '2026-09-28T18:05:00.000Z',
            },
          ],
        },
      ],
    },
  ],
  weights: [
    {
      id: 'backup-weight-1',
      clientId: 'otro-dispositivo',
      ownerUserId: 'e2e-user-id',
      createdAt: '2026-09-29T07:00:00.000Z',
      modifiedAt: '2026-09-29T07:00:00.000Z',
      version: 1,
      weight: 81.5,
      date: '2026-09-29',
    },
  ],
  lastExerciseWeights: { 'e2e-curl': 16, 'e2e-bench': 42.5 },
};

async function openSettings(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const boton = page.locator('button[aria-label*="Ajustes"]').first();
  await boton.waitFor({ timeout: 10_000 });
  await boton.click();
  await expect(page.getByText('Copias de Seguridad Locales')).toBeVisible({ timeout: 8_000 });
}

test.describe('Copia de seguridad JSON (F3.1)', () => {
  test('importar una copia restaura entrenos, pesajes y marcas', async ({ page }) => {
    await seedSession(page);
    await openSettings(page);

    // 1. Se elige el archivo y arranca la restauración
    await page.locator('input[type="file"]').setInputFiles({
      name: 'fortixam-backup-otro-movil.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(BACKUP)),
    });

    // 2. El aviso dice lo que se ha restaurado, de verdad
    await expect(
      page.getByText(/¡Datos restaurados! 1 entrenamiento, 1 pesaje, 2 marcas por ejercicio\./),
    ).toBeVisible({ timeout: 10_000 });

    // 3. Las marcas entran en el estado persistido
    const marcas = await page.evaluate(() => {
      const raw = localStorage.getItem('titanium-storage');
      return raw ? JSON.parse(raw).state.lastExerciseWeights : null;
    });
    expect(marcas).toMatchObject({ 'e2e-curl': 16, 'e2e-bench': 42.5 });

    // 4. El entreno restaurado está en el Historial
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Día 7: Brazos/').first()).toBeVisible({ timeout: 10_000 });

    // 5. Y el pesaje en la pantalla de Peso
    await page.goto('/weight');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/81.5/').first()).toBeVisible({ timeout: 10_000 });
  });

  test('un archivo que no es de FORTIXAM se rechaza con un aviso claro', async ({ page }) => {
    await seedSession(page);
    await openSettings(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'cualquiera.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ app: 'OTRA-APP', sessions: [{ id: 'x' }] })),
    });

    await expect(
      page.getByText(/no es una copia de seguridad de FORTIXAM/),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('con texto plano avisa de que el archivo no es JSON válido', async ({ page }) => {
    await seedSession(page);
    await openSettings(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'notas.txt',
      mimeType: 'application/json',
      buffer: Buffer.from('esto no es un json'),
    });

    await expect(page.getByText(/no es un JSON válido/)).toBeVisible({ timeout: 10_000 });
  });

  test('exportar descarga un archivo con el JSON real de la app', async ({ page }) => {
    await seedSession(page);
    await openSettings(page);

    // Primero restaurar, para que la exportación tenga datos que enseñar
    await page.locator('input[type="file"]').setInputFiles({
      name: 'fortixam-backup-otro-movil.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(BACKUP)),
    });
    await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({ timeout: 10_000 });

    const [descarga] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      page.getByRole('button', { name: /Exportar Copia de Seguridad \(JSON\)/ }).click(),
    ]);

    // El nombre del archivo es determinista: fortixam-backup-<usuario>-<fecha>.json
    expect(descarga.suggestedFilename()).toMatch(/^fortixam-backup-e2e-\d{4}-\d{2}-\d{2}\.json$/);

    // Y su contenido es una copia válida con lo que hay en la app
    const stream = await descarga.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    expect(json.app).toBe('FORTIXAM');
    expect(Array.isArray(json.sessions)).toBe(true);
    expect(Array.isArray(json.weights)).toBe(true);
    expect(json.sessions.some((s) => s.id === 'backup-session-1')).toBe(true);
    expect(json.weights.some((w) => w.id === 'backup-weight-1')).toBe(true);
    expect(json.lastExerciseWeights['e2e-curl']).toBe(16);

    // El aviso de éxito en pantalla
    await expect(page.getByText(/¡Copia de seguridad descargada!/)).toBeVisible();
  });
});
