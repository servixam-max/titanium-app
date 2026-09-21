// FORTIXAM — métricas compartidas
//
// Única fuente de verdad para racha, estadísticas semanales, totales de sesión
// y 1RM. Antes cada pantalla recalculaba lo suyo y podían discrepar entre sí.

import { WorkoutSession } from "./types";

export interface SessionTotals {
  sets: number;
  reps: number;
  volume: number;
  durationSeconds: number;
}

export interface WeeklyStats {
  totalWorkouts: number;
  totalMinutes: number;
  weeklyDays: boolean[];
  todayIndex: number;
  weeklyCount: number;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Sesiones completadas, de la más reciente a la más antigua. */
export function completedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions]
    .filter((s) => s.completed && s.endTime)
    .sort((a, b) => (b.endTime || "").localeCompare(a.endTime || ""));
}

/** Totales de una sesión (series, reps, volumen y duración). */
export function computeSessionTotals(session: WorkoutSession): SessionTotals {
  let sets = 0;
  let reps = 0;
  let volume = 0;

  for (const exercise of session.exercises || []) {
    for (const set of exercise.sets || []) {
      if (!set.completed) continue;
      sets += 1;
      reps += set.reps || 0;
      volume += (set.weight || 0) * (set.reps || 0);
    }
  }

  const durationSeconds =
    session.endTime && session.startTime
      ? Math.max(
          0,
          Math.round(
            (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000,
          ),
        )
      : 0;

  return { sets, reps, volume, durationSeconds };
}

/** Racha de días consecutivos entrenando (permite que hoy aún no cuente). */
export function calculateStreak(sessions: WorkoutSession[]): number {
  const completed = completedSessions(sessions);
  if (completed.length === 0) return 0;

  const dates = Array.from(new Set(completed.map((s) => new Date(s.endTime!).toDateString())))
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = new Date();
  let streak = 0;
  const check = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!dates.some((d) => sameDay(d, check))) {
    check.setDate(check.getDate() - 1);
  }

  for (const d of dates) {
    if (sameDay(d, check)) {
      streak += 1;
      check.setDate(check.getDate() - 1);
    } else if (d < check) {
      break;
    }
  }

  return streak;
}

/** Estadísticas de la semana en curso (lunes a domingo). */
export function buildWeeklyStats(sessions: WorkoutSession[]): WeeklyStats {
  const completed = completedSessions(sessions);
  const totalWorkouts = completed.length;
  const totalMinutes = Math.round(
    completed.reduce((sum, s) => sum + computeSessionTotals(s).durationSeconds / 60, 0),
  );

  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weeklyDays = [false, false, false, false, false, false, false];
  let weeklyCount = 0;

  for (const session of completed) {
    const d = new Date(session.endTime!);
    const diffDays = Math.floor((d.getTime() - monday.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < 7 && !weeklyDays[diffDays]) {
      weeklyDays[diffDays] = true;
      weeklyCount += 1;
    }
  }

  return {
    totalWorkouts,
    totalMinutes,
    weeklyDays,
    todayIndex: currentDay === 0 ? 6 : currentDay - 1,
    weeklyCount,
  };
}

/** Volumen total entrenado (única definición en toda la app). */
export function computeTotalVolume(sessions: WorkoutSession[]): number {
  return completedSessions(sessions).reduce(
    (sum, s) => sum + computeSessionTotals(s).volume,
    0,
  );
}

/**
 * 1RM estimado (Epley). Definición única: `records.ts` la reexporta y el coach
 * la usa en lugar de su propia fórmula (antes daban resultados distintos).
 * Por encima de ~12 repeticiones la estimación deja de ser fiable, así que se
 * marca con `reliable: false` para que la UI pueda matizarlo.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function isOneRmReliable(reps: number): boolean {
  return reps > 0 && reps <= 12;
}
