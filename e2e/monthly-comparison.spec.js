const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — comparativa mensual (F3.4).
// Recorrido real de usuario: se restaura una copia con entrenos repartidos
// entre el mes en curso y el mismo día del mes pasado (Ajustes → Restaurar, el
// mismo camino que existe en la app) y Estadísticas debe comparar el volumen
// del "mismo tramo" grupo a grupo: el total de los dos tramos, los chips de
// variación y las dos barras por grupo.
//
// Las fechas se construyen relativas a HOY para que el test corra en cualquier
// día del calendario; el día del mes pasado se acota si ese mes es más corto
// (31 oct → 28/29 feb), igual que hace la app.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Fecha a las 18:00 del día indicado, como ISO. */
function isoLocal(year, month, day) {
  return new Date(year, month, day, 18, 0, 0, 0).toISOString();
}

/** El mismo día del mes pasado, acotado a su último día si es más corto. */
function fechaMesPasado() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const diasMesPasado = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(d, diasMesPasado), 18, 0, 0, 0);
}

/** "1–8 oct" (o "1 oct" si el tramo empieza y acaba el mismo día). */
function rangoLabel(date) {
  return date.getDate() === 1
    ? `1 ${MESES[date.getMonth()]}`
    : `1–${date.getDate()} ${MESES[date.getMonth()]}`;
}

function makeSession({ id, endTime, weight, reps }) {
  const start = new Date(new Date(endTime).getTime() - 60 * 60 * 1000).toISOString();
  return {
    id,
    clientId: 'e2e',
    ownerUserId: 'e2e-user-id',
    createdAt: start,
    modifiedAt: endTime,
    version: 1,
    routineId: 1,
    routineName: 'Día 1: Empuje',
    mode: 'individual',
    startTime: start,
    endTime,
    completed: true,
    exercises: [
      {
        id: `${id}-log`,
        clientId: 'e2e',
        ownerUserId: 'e2e-user-id',
        createdAt: start,
        modifiedAt: endTime,
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
            modifiedAt: endTime,
            version: 1,
            setNumber: 1,
            weight,
            reps,
            completed: true,
            timestamp: endTime,
          },
        ],
      },
    ],
  };
}

/** Este mes hoy: 100×10; mes pasado, mismo día: 50×10 → todo sube +100 %. */
const HOY = new Date();
const MES_PASADO = fechaMesPasado();

const BACKUP = {
  app: 'FORTIXAM',
  version: '8.5.40',
  exportedAt: '2026-10-01T08:00:00.000Z',
  user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
  sessions: [
    makeSession({
      id: 'mc-hoy',
      endTime: isoLocal(HOY.getFullYear(), HOY.getMonth(), HOY.getDate()),
      weight: 100,
      reps: 10,
    }),
    makeSession({
      id: 'mc-pasado',
      endTime: isoLocal(MES_PASADO.getFullYear(), MES_PASADO.getMonth(), MES_PASADO.getDate()),
      weight: 50,
      reps: 10,
    }),
  ],
  weights: [],
  lastExerciseWeights: {},
};

async function restaurarCopia(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const boton = page.locator('button[aria-label*="Ajustes"]').first();
  await boton.waitFor({ timeout: 10_000 });
  await boton.click();
  await expect(page.getByText('Copias de Seguridad Locales')).toBeVisible({
    timeout: 8_000,
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: 'fortixam-backup-mensual.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(BACKUP)),
  });
  await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Comparativa mensual (F3.4)', () => {
  test('tras restaurar una copia, Estadísticas compara el mismo tramo grupo a grupo', async ({
    page,
  }) => {
    await seedSession(page);
    await restaurarCopia(page);

    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('monthly-comparison');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // El encabezado dice las fechas reales de los dos tramos comparados.
    await expect(
      card.getByText(`${rangoLabel(HOY)} vs ${rangoLabel(MES_PASADO)} · mismo tramo`),
    ).toBeVisible();

    // El total del mes en curso: 1.000 + 450 + 450 kg de sinergias = 1.900 kg.
    await expect(card.getByText('1.900')).toBeVisible();
    await expect(card.getByText(/Mes pasado, mismo tramo: 950 kg/)).toBeVisible();

    // Pecho aparece con su volumen de este mes y sus dos barras.
    const pecho = card.locator('[data-group="chest"]');
    await expect(pecho).toBeVisible();
    await expect(pecho.getByText('Pecho')).toBeVisible();
    await expect(pecho.getByText('1.000 kg')).toBeVisible();
    await expect(pecho.getByText('+100 %')).toBeVisible();
    await expect(pecho.locator('span[style]')).toHaveCount(2);

    // Los tres grupos con actividad de la copia: pecho, hombros y brazos.
    await expect(card.locator('[data-group]')).toHaveCount(3);
    await expect(card.locator('[data-group="shoulders"]')).toBeVisible();
    await expect(card.locator('[data-group="arms"]')).toBeVisible();

    // La leyenda distingue las dos barras.
    await expect(card.getByText('Este mes', { exact: true })).toBeVisible();
    await expect(card.getByText('Mes pasado', { exact: true })).toBeVisible();
  });

  test('sin historial lo dice en claro, sin gráfica fingida', async ({ page }) => {
    await seedSession(page);
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('monthly-comparison');
    await expect(card).toBeVisible({ timeout: 10_000 });

    await expect(
      card.getByText('Aún no hay entrenamientos que comparar.'),
    ).toBeVisible();
    await expect(card.locator('[data-group]')).toHaveCount(0);
  });
});
