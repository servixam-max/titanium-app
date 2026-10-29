const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { auditarContraste } = require('./helpers/contraste-pixel');

// FORTIXAM — filtro del historial por grupo muscular (F8.1).
// Recorrido real: se restaura una copia con tres entrenos de grupos distintos
// (pecho hace 2 días, piernas hace 3, brazos hace 20) y se filtra desde la
// barra de grupos, combinándolo con el periodo. Comprueba que la lista, el
// resumen y la tarjeta hablan del mismo grupo, y que «Todos» lo deshace.
//
// Los grupos salen del motor biomecánico por músculos PRIMARIOS: el press de
// banca cuenta como pecho, no como brazos, aunque el tríceps ayude.

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(18, 0, 0, 0);
  return date.toISOString();
}

function makeSession({ id, routineId, routineName, mode, daysAgo, exercise }) {
  const endTime = isoDaysAgo(daysAgo);
  const startTime = new Date(new Date(endTime).getTime() - 45 * 60 * 1000).toISOString();
  return {
    id,
    clientId: 'e2e',
    ownerUserId: 'e2e-user-id',
    createdAt: startTime,
    modifiedAt: endTime,
    version: 1,
    routineId,
    routineName,
    mode,
    startTime,
    endTime,
    completed: true,
    exercises: [
      {
        id: `${id}-log`,
        clientId: 'e2e',
        ownerUserId: 'e2e-user-id',
        createdAt: startTime,
        modifiedAt: endTime,
        version: 1,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        order: 0,
        sets: [
          {
            id: `${id}-set-1`,
            clientId: 'e2e',
            ownerUserId: 'e2e-user-id',
            createdAt: startTime,
            modifiedAt: endTime,
            version: 1,
            setNumber: 1,
            weight: exercise.weight,
            reps: 10,
            completed: true,
            timestamp: endTime,
          },
          {
            id: `${id}-set-2`,
            clientId: 'e2e',
            ownerUserId: 'e2e-user-id',
            createdAt: startTime,
            modifiedAt: endTime,
            version: 1,
            setNumber: 2,
            weight: exercise.weight,
            reps: 10,
            completed: true,
            timestamp: endTime,
          },
        ],
      },
    ],
  };
}

const BACKUP = {
  app: 'FORTIXAM',
  version: '8.5.55',
  exportedAt: new Date().toISOString(),
  user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
  sessions: [
    makeSession({
      id: 'hf-pecho',
      routineId: 1,
      routineName: 'Día 1: Empuje',
      mode: 'individual',
      daysAgo: 2,
      exercise: { id: 'd1-1', name: 'Press de Banca Plano', weight: 60 },
    }),
    makeSession({
      id: 'hf-pierna',
      routineId: 2,
      routineName: 'Día 2',
      mode: 'guided',
      daysAgo: 3,
      exercise: { id: 'd2-3', name: 'Sentadilla Goblet', weight: 30 },
    }),
    makeSession({
      id: 'hf-brazo',
      routineId: 1,
      routineName: 'Día 1: Empuje',
      mode: 'individual',
      daysAgo: 20,
      exercise: { id: 'd2-2', name: 'Curl de Bíceps Clásico', weight: 10 },
    }),
  ],
  weights: [],
  lastExerciseWeights: {},
};

async function restaurarCopia(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const ajustes = page.locator('button[aria-label*="Ajustes"]').first();
  await ajustes.waitFor({ timeout: 10_000 });
  await ajustes.click();
  await expect(page.getByText('Copias de Seguridad Locales')).toBeVisible({ timeout: 8_000 });

  await page.locator('input[type="file"]').setInputFiles({
    name: 'fortixam-backup-grupos.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(BACKUP)),
  });
  await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({ timeout: 10_000 });
}

async function expectGroupSummary(page, { sessions, label }) {
  const strip = page.getByTestId('group-summary');
  await expect(strip).toBeVisible();
  await expect(strip.getByText(label, { exact: true })).toBeVisible();
  await expect(strip).toHaveAttribute('data-sessions', String(sessions));

  if (sessions === 0) {
    await expect(strip.getByText('Sin sesiones con estos filtros')).toBeVisible();
    await expect(strip).toHaveAttribute('data-kg', '0');
    return;
  }

  // «1 sesión · 1.470 kg»: el número sale del motor biomecánico (primarios al
  // 100 % y sinergistas al 45 %), la misma cifra que Estadísticas. Aquí se
  // vigila que la tira lo formatee y que no enseñe un cero falso.
  const text = (await strip.textContent()) ?? '';
  const match = text.match(/([\d.]+) kg/);
  expect(match, `la tira no enseña kilos: "${text}"`).not.toBeNull();
  expect(Number(match[1].replace(/\./g, ''))).toBeGreaterThan(0);
  await expect(strip.getByText(`${sessions} sesión · `, { exact: false })).toBeVisible();
}

test.describe('Historial · filtro por grupo muscular (F8.1)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await restaurarCopia(page);
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('history-session')).toHaveCount(3, { timeout: 10_000 });
  });

  test('cada tarjeta dice qué grupos trabajó', async ({ page }) => {
    const tarjetas = page.getByTestId('history-session');
    expect(await tarjetas.nth(0).getAttribute('data-groups')).toBe('chest');
    expect(await tarjetas.nth(1).getAttribute('data-groups')).toBe('legs');
    expect(await tarjetas.nth(2).getAttribute('data-groups')).toBe('arms');

    // Los nombres visibles coinciden con los del filtro.
    await expect(tarjetas.nth(0).getByText('Pecho')).toBeVisible();
    await expect(tarjetas.nth(1).getByText('Piernas')).toBeVisible();
    await expect(tarjetas.nth(2).getByText('Brazos')).toBeVisible();
  });

  test('filtrar por piernas deja solo la sesión de piernas y resume su volumen', async ({
    page,
  }) => {
    const piernas = page.getByRole('button', { name: 'Filtrar por Piernas' });
    await piernas.click();
    await expect(piernas).toHaveAttribute('aria-pressed', 'true');

    await expect(page.getByTestId('history-session')).toHaveCount(1);
    await expect(page.getByTestId('history-session')).toHaveAttribute('data-groups', 'legs');

    // 2 series × 30 kg × 10 reps en el motor biomecánico, con sus sinergias.
    await expectGroupSummary(page, { sessions: 1, label: 'Piernas' });

    // Se combina con el periodo: hace 3 días entra en «Esta Semana».
    await page.getByRole('button', { name: 'Esta Semana' }).click();
    await expect(page.getByTestId('history-session')).toHaveCount(1);

    // Y con el modo: era guiada.
    await page.getByRole('button', { name: /Guiados/ }).click();
    await expect(page.getByTestId('history-session')).toHaveCount(1);
    await page.getByRole('button', { name: /Individuales/ }).click();
    await expect(page.getByTestId('history-session')).toHaveCount(0);
    await expect(page.getByText('No hay sesiones que coincidan con los filtros seleccionados.')).toBeVisible();
  });

  test('el grupo y el periodo se respetan a la vez', async ({ page }) => {
    // Brazos es de hace 20 días: fuera de la semana, dentro del mes.
    await page.getByRole('button', { name: 'Filtrar por Brazos' }).click();
    await page.getByRole('button', { name: 'Esta Semana' }).click();
    await expect(page.getByTestId('history-session')).toHaveCount(0);
    await expectGroupSummary(page, { sessions: 0, label: 'Brazos' });

    await page.getByRole('button', { name: 'Este Mes' }).click();
    await expect(page.getByTestId('history-session')).toHaveCount(1);
    await expect(page.getByTestId('history-session')).toHaveAttribute('data-groups', 'arms');
    await expectGroupSummary(page, { sessions: 1, label: 'Brazos' });
  });

  test('«Todos» deshace el filtro de grupo', async ({ page }) => {
    const pecho = page.getByRole('button', { name: 'Filtrar por Pecho' });
    await pecho.click();
    await expect(page.getByTestId('history-session')).toHaveCount(1);
    await expectGroupSummary(page, { sessions: 1, label: 'Pecho' });

    await page.getByRole('button', { name: 'Todos' }).last().click();
    await expect(pecho).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('history-session')).toHaveCount(3);
    await expect(page.getByTestId('group-summary')).toHaveCount(0);
  });

  test('la tira del filtro y las etiquetas se leen en los dos temas', async ({ page }) => {
    // La medición a pie de píxel es cara (cada texto se fotografía) y aquí hay
    // tarjetas con degradado: se hace solo en el proyecto móvil, que es donde
    // se usa la app.
    test.skip(test.info().project.name !== 'mobile', 'auditoría de píxel solo en móvil');
    test.setTimeout(90_000);

    await page.getByRole('button', { name: 'Filtrar por Piernas' }).click();
    await expect(page.getByTestId('group-summary')).toBeVisible();

    const temas = [
      { nombre: 'oscuro', siguiente: 'Cambiar a modo claro', clase: /dark/ },
      { nombre: 'claro', siguiente: 'Cambiar a modo oscuro', clase: /light/ },
    ];
    for (const tema of temas) {
      await expect(page.locator('html')).toHaveClass(tema.clase);
      const { infracciones } = await auditarContraste(page);
      expect(
        infracciones,
        `contraste insuficiente en el historial filtrado (${tema.nombre}):\n  ${infracciones
          .slice(0, 12)
          .join('\n  ')}`,
      ).toEqual([]);

      if (tema.nombre === 'oscuro') {
        await page.getByRole('button', { name: tema.siguiente }).click();
        await page.waitForTimeout(700);
      }
    }
  });
});
