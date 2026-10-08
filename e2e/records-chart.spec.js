const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — gráfica de récords (F3.3).
// Recorrido real de usuario: se restaura una copia con entrenamientos con
// pesos distintos (Ajustes → Restaurar, el mismo camino que existe en la app)
// y Estadísticas debe dibujar la evolución del 1RM estimado del ejercicio,
// señalar el récord vigente con su semana y matizar cuando el récord salió de
// una serie de más de 12 repeticiones.
//
// Las fechas se construyen relativas a HOY para que el test corra en cualquier
// día: el resumen siempre dice la fecha del récord con su etiqueta real.

function isoDaysAgo(days, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function labelOf(date) {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${meses[date.getMonth()]}`;
}

function makeSession({ id, days, weight, reps, exerciseId, exerciseName }) {
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
        exerciseId,
        exerciseName,
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
            reps,
            completed: true,
            timestamp: end,
          },
        ],
      },
    ],
  };
}

// Press de banca: 60×10 (80) → 70×6 (84) → 75×5 (88) ← récord vigente.
// Curl de bíceps: récord con 15 reps → estimación no fiable (matiz).
const BACKUP = {
  app: 'FORTIXAM',
  version: '8.5.35',
  exportedAt: '2026-10-01T08:00:00.000Z',
  user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
  sessions: [
    makeSession({ id: 'rc-1', days: 20, weight: 60, reps: 10, exerciseId: 'e2e-bench', exerciseName: 'Press de Banca Plano' }),
    makeSession({ id: 'rc-2', days: 12, weight: 70, reps: 6, exerciseId: 'e2e-bench', exerciseName: 'Press de Banca Plano' }),
    makeSession({ id: 'rc-3', days: 4, weight: 75, reps: 5, exerciseId: 'e2e-bench', exerciseName: 'Press de Banca Plano' }),
    makeSession({ id: 'rc-4', days: 2, weight: 30, reps: 15, exerciseId: 'e2e-curl', exerciseName: 'Curl de Bíceps' }),
  ],
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

test.describe('Gráfica de récords (F3.3)', () => {
  test('tras restaurar una copia, Estadísticas dibuja la evolución y la semana del récord', async ({
    page,
  }) => {
    await seedSession(page);
    await openSettings(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'fortixam-backup-records.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(BACKUP)),
    });
    await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('records-chart');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Por defecto manda el entrenado más recientemente: el curl (15 reps).
    await expect(card.getByText('Curl de Bíceps')).toBeVisible();
    // Récord con más de 12 reps → matiz de fiabilidad visible.
    await expect(
      card.getByText(/más de 12 repeticiones: la estimación es orientativa/),
    ).toBeVisible();

    // La gráfica tiene 1 punto (una sesión) y el resumen su récord: 30×15 → 45 kg.
    const svg = card.locator('[data-testid="records-chart-svg"]');
    await expect(svg).toBeVisible();
    await expect(card.getByText('45', { exact: true })).toBeVisible();
    await expect(card.getByText('30 kg × 15', { exact: true })).toBeVisible();

    // Cambiar al press de banca con el selector real
    await card.getByRole('button', { name: /Elegir ejercicio/ }).click();
    await card.getByRole('button', { name: /Press de Banca Plano/ }).click();

    // Récord vigente: 75×5 → 88 kg, con su fecha real (hace 4 días) y la semana.
    await expect(card.getByText('88', { exact: true })).toBeVisible();
    await expect(card.getByText('75 kg × 5', { exact: true })).toBeVisible();
    const fechaRecord = new Date();
    fechaRecord.setDate(fechaRecord.getDate() - 4);
    await expect(
      card.getByText(new RegExp(`Récord el ${labelOf(fechaRecord)}`)),
    ).toBeVisible();
    // El récord es fiable (5 reps) → sin matiz.
    await expect(card.getByText(/la estimación es orientativa/)).toHaveCount(0);

    // Tres puntos de la evolución; el del récord, con anillo (2 círculos).
    await expect(svg.locator('circle')).toHaveCount(4);
    // La banda vertical del récord está dibujada.
    await expect(svg.locator('line[stroke-dasharray="3 4"]')).toHaveCount(1);
  });

  test('sin marcas con peso lo dice en claro, sin gráfica fingida', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('records-chart');
    await expect(card).toBeVisible({ timeout: 10_000 });

    await expect(
      card.getByText('Aún no hay marcas con peso para dibujar la evolución.'),
    ).toBeVisible();
    await expect(card.locator('[data-testid="records-chart-svg"]')).toHaveCount(0);
  });
});
