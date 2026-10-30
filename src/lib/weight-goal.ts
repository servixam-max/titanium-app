const STORAGE_KEY = "fortixam_weight_goals_v1";
const ANON_USER = "__anon__";

type GoalMap = Record<string, number>;

export function isValidWeightGoal(kg: number): boolean {
  return typeof kg === "number" && Number.isFinite(kg) && kg >= 30 && kg <= 250;
}

function userKey(userId?: string | null): string {
  return userId || ANON_USER;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readGoals(): GoalMap {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const goals: GoalMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && isValidWeightGoal(value)) {
        goals[key] = value;
      }
    }
    return goals;
  } catch {
    return {};
  }
}

function writeGoals(goals: GoalMap): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    // Sin espacio o almacenamiento bloqueado: el objetivo no persiste, pero la
    // pantalla sigue funcionando.
  }
}

export function loadWeightGoal(userId?: string | null): number | null {
  if (!getStorage()) return null;

  const value = readGoals()[userKey(userId)];
  return typeof value === "number" && isValidWeightGoal(value) ? value : null;
}

export function saveWeightGoal(
  userId: string | null | undefined,
  kg: number,
): number | null {
  if (!isValidWeightGoal(kg)) return null;
  if (!getStorage()) return null;

  const rounded = Math.round(kg * 10) / 10;
  const goals = readGoals();
  goals[userKey(userId)] = rounded;
  writeGoals(goals);
  return rounded;
}

export function clearWeightGoal(userId?: string | null): void {
  if (!getStorage()) return;

  const goals = readGoals();
  const key = userKey(userId);
  if (!(key in goals)) return;

  delete goals[key];
  writeGoals(goals);
}
