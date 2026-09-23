// Siembra una sesión de entreno activa para poder auditar las pantallas de
// entreno (guiado e individual), que no se renderizan sin una rutina en curso.

const E2E_ROUTINE = {
  day: 1,
  title: 'Día 1: Empuje',
  subtitle: 'Pecho, hombros y tríceps',
  type: 'strength',
  duration: '35 MIN',
  difficulty: 'Intermedio',
  equipment: 'MANCUERNAS',
  categoryTag: 'fuerza',
  exercises: [
    {
      id: 'e2e-bench',
      name: 'Press de Banca Plano',
      sets: 3,
      reps: '10-12',
      restSeconds: 75,
      equipment: 'dumbbells',
      category: 'chest',
      description: 'Empuje horizontal con mancuernas',
    },
    {
      id: 'e2e-flyes',
      name: 'Aperturas en Banco',
      sets: 3,
      reps: '12-15',
      restSeconds: 75,
      equipment: 'dumbbells',
      category: 'chest',
    },
  ],
};

const E2E_SESSION = {
  id: 'e2e-session',
  clientId: 'e2e',
  ownerUserId: 'e2e-user-id',
  createdAt: '2026-09-01T10:00:00.000Z',
  modifiedAt: '2026-09-01T10:00:00.000Z',
  version: 1,
  routineId: 1,
  routineName: 'Día 1: Empuje',
  mode: 'individual',
  startTime: '2026-09-01T10:00:00.000Z',
  completed: false,
  exercises: [
    {
      id: 'e2e-log-bench',
      clientId: 'e2e',
      ownerUserId: 'e2e-user-id',
      createdAt: '2026-09-01T10:00:00.000Z',
      modifiedAt: '2026-09-01T10:00:00.000Z',
      version: 1,
      exerciseId: 'e2e-bench',
      exerciseName: 'Press de Banca Plano',
      order: 0,
      sets: [],
    },
    {
      id: 'e2e-log-flyes',
      clientId: 'e2e',
      ownerUserId: 'e2e-user-id',
      createdAt: '2026-09-01T10:00:00.000Z',
      modifiedAt: '2026-09-01T10:00:00.000Z',
      version: 1,
      exerciseId: 'e2e-flyes',
      exerciseName: 'Aperturas en Banco',
      order: 1,
      sets: [],
    },
  ],
};

/**
 * Añade al estado persistido una rutina en curso, para que las páginas de
 * entreno rendericen en lugar de redirigir a la home.
 * @param {import('@playwright/test').Page} page
 * @param {{ mode?: 'guided' | 'individual' }} [options]
 */
async function seedWorkout(page, options = {}) {
  const mode = options.mode ?? 'individual';

  await page.addInitScript(
    ({ routine, session, mode }) => {
      const raw = localStorage.getItem('titanium-storage');
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      parsed.state = {
        ...(parsed.state || {}),
        onboardingComplete: true,
        activeWorkout: {
          routine,
          mode,
          currentExerciseIndex: 0,
          currentSet: 1,
          currentRound: 1,
          equipmentPref: 'dumbbells',
          isResting: false,
          restTimeRemaining: 0,
          isPreparing: false,
          prepTimeRemaining: 0,
          isWorking: false,
          workTimeRemaining: 0,
          session,
          exerciseWeights: { 'e2e-bench': 40 },
          exerciseReps: { 'e2e-bench': 10 },
          justFinished: false,
        },
      };
      localStorage.setItem('titanium-storage', JSON.stringify(parsed));
    },
    { routine: E2E_ROUTINE, session: E2E_SESSION, mode },
  );
}

module.exports = { seedWorkout, E2E_ROUTINE };
