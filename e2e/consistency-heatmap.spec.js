const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — heatmap de constancia (F3.2).
// Recorrido real de usuario: se restaura una copia con entrenamientos en las
// últimas 4 semanas (Ajustes → Restaurar, el mismo camino que existe en la
// app) y Estadísticas debe pintar la cuadrícula día a día: los días
// entrenados con intensidad, hoy marcado, los futuros atenuados y la ventana
// exacta de 4 semanas de lunes a domingo.
//
// Las fechas se construyen relativas a HOY (el test corre en cualquier día),
// siempre dentro de la ventana: de 0 a 17 días atrás cae seguro en las 4
// semanas aunque hoy sea lunes o domingo.

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoDaysAgo(days, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Lunes de hace 3 semanas: primer día de la ventana del heatmap. */
function windowStartDate() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + offset,
  );
  monday.setDate(monday.getDate() - 21);
  return monday;
}

/** Días ya transcurridos de la ventana (incluido hoy). */
function elapsedDaysCount() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = windowStartDate();
  return Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1;
}

function makeSession({ id, days, weight }) {
  const end = isoDaysAgo(days);
  const start = isoDaysAgo(days, 17);
  return {
    id,
    clientId: 'e2e',
    ownerUserId: 'e2e-user-id',
    createdAt: start,
    modifiedAt: end,
    version: 1,
    routineId: 1,
    routineName: 'Día 1: Empuje',
    mode: 'individual',
    startTime: start,
    endTime: end,
    completed: true,
    exercises: [
      {
        id: `${id}-log`,
        clientId: 'e2e',
        ownerUserId: 'e2e-user-id',
        createdAt: start,
        modifiedAt: end,
        version: 1,
        exerciseId: 'e2e-bench',
        exerciseName: 'Press de Banca Plano',
        order: 0,
        sets: [
          {
            id: `${id}-set`,
            clientId: 'e2e',
            ownerUserId: 'e2e-user-id',
            createdAt: start,
            modifiedAt: end,
            version: 1,
            setNumber: 1,
            weight,
            reps: 10,
            completed: true,
            timestamp: end,
          },
        ],
      },
    ],
  };
}

// 5 entrenos en la ventana; el de ayer (40 kg) es el más fuerte → nivel 4.
const ENTRENOS = [
  { id: 'hm-today', days: 0, weight: 20 },
  { id: 'hm-ayer', days: 1, weight: 40 },
  { id: 'hm-3', days: 3, weight: 10 },
  { id: 'hm-12', days: 12, weight: 30 },
  { id: 'hm-17', days: 17, weight: 20 },
];

const BACKUP = {
  app: 'FORTIXAM',
  version: '8.5.34',
  exportedAt: '2026-10-01T08:00:00.000Z',
  user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
  sessions: ENTRENOS.map(makeSession),
  weights: [],
  lastExerciseWeights: {},
};

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

test.describe('Heatmap de constancia (F3.2)', () => {
  test('tras restaurar una copia, Estadísticas pinta las 4 semanas día a día', async ({
    page,
  }) => {
    await seedSession(page);
    await openSettings(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'fortixam-backup-heatmap.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(BACKUP)),
    });
    await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('consistency-heatmap');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // La cuadrícula completa: 28 días, del lunes de hace 3 semanas al domingo.
    const celdas = card.locator('[data-date]');
    await expect(celdas).toHaveCount(28);
    const primerDia = await celdas.nth(0).getAttribute('data-date');
    expect(primerDia).toBe(localDateKey(windowStartDate()));

    // Los 5 entrenos de la copia aparecen como días entrenados.
    await expect(card.locator('[data-trained="true"]')).toHaveCount(5);

    // El de ayer fue el más fuerte → nivel máximo de intensidad.
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const celdaAyer = card.locator(`[data-date="${localDateKey(ayer)}"]`);
    await expect(celdaAyer).toHaveAttribute('data-level', '4');

    // Hoy queda marcado como hoy y como entrenado.
    const hoy = card.locator(`[data-date="${localDateKey(new Date())}"]`);
    await expect(hoy).toHaveAttribute('data-today', 'true');
    await expect(hoy).toHaveAttribute('data-trained', 'true');

    // Resumen honesto: 5 días entrenados de los transcurridos.
    await expect(card.getByText('5')).toBeVisible();
    await expect(card.getByText('días entrenados')).toBeVisible();
    const pct = Math.round((5 / elapsedDaysCount()) * 100);
    await expect(card.getByText(`${pct} %`)).toBeVisible();

    // Los días futuros de esta semana no mienten: atenuados y sin entrenar.
    const futuros = card.locator('[data-future="true"]');
    if ((await futuros.count()) > 0) {
      await expect(futuros.first()).toHaveAttribute('data-trained', 'false');
    }
  });

  test('sin historial lo dice en claro y la cuadrícula sigue completa', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('consistency-heatmap');
    await expect(card).toBeVisible({ timeout: 10_000 });

    await expect(
      card.getByText('Aún no hay entrenamientos en estas 4 semanas.'),
    ).toBeVisible();
    await expect(card.locator('[data-date]')).toHaveCount(28);
    await expect(card.locator('[data-trained="true"]')).toHaveCount(0);
    await expect(
      card.locator(`[data-date="${localDateKey(new Date())}"]`),
    ).toHaveAttribute('data-today', 'true');
  });
});
