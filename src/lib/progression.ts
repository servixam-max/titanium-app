// FORTIXAM — motor de progresión de cargas
//
// Doble progresión (el método estándar en fuerza/hipertrofia):
//   1. Si todas las series llegan al tope del rango de repeticiones → sube peso.
//   2. Si te mueves dentro del rango → mismo peso, una repetición más.
//   3. Si alguna serie se queda corta → baja el peso para volver al rango.
//   4. Si el esfuerzo fue máximo (RPE alto) → mantén, no subas todavía.
//
// Todo es determinista y explicable: la UI puede decir *por qué* sugiere eso.

import { WorkoutSession, Exercise, TrainingGoal } from "./types";

export interface SetPerformance {
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
}

export interface LastPerformance {
  sessionId: string;
  date: string;
  sets: SetPerformance[];
  /** Peso de la serie más pesada completada. */
  topWeight: number;
  /** Repeticiones de esa serie más pesada. */
  repsAtTopWeight: number;
  /** Media de repeticiones de las series al peso tope. */
  avgReps: number;
  maxRpe?: number;
}

export type LoadAction = "start" | "increase" | "hold" | "down" | "deload";

export interface LoadSuggestion {
  action: LoadAction;
  weight: number;
  reps: number;
  increment: number;
  reason: string;
}

export interface RepRange {
  min: number;
  max: number;
}

/** "10-12" → {min:10, max:12}; "Al fallo" → rango amplio; "30s" → sin rango. */
export function parseRepRange(reps?: string): RepRange | null {
  if (!reps) return null;
  const range = reps.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = reps.match(/^(\d+)$/);
  if (single) {
    const n = Number(single[1]);
    return { min: n, max: n };
  }
  if (/fallo/i.test(reps)) return { min: 6, max: 20 };
  return null;
}

/** Extrae la última marca real de un ejercicio del historial de sesiones. */
export function getLastPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
): LastPerformance | undefined {
  const ordered = [...sessions]
    .filter((s) => s.completed && s.exercises?.length)
    .sort((a, b) => (b.endTime || b.startTime || "").localeCompare(a.endTime || a.startTime || ""));

  for (const session of ordered) {
    const log = session.exercises.find((ex) => ex.exerciseId === exerciseId);
    if (!log) continue;

    const sets: SetPerformance[] = (log.sets || [])
      .filter((s) => s.completed)
      .map((s) => ({
        setNumber: s.setNumber,
        weight: s.weight || 0,
        reps: s.reps || 0,
        rpe: s.rpe,
      }));

    if (sets.length === 0) continue;

    const topWeight = Math.max(...sets.map((s) => s.weight));
    const topSets = sets.filter((s) => s.weight === topWeight);
    const avgReps = topSets.reduce((sum, s) => sum + s.reps, 0) / topSets.length;
    const rpes = sets.map((s) => s.rpe).filter((r): r is number => typeof r === "number");

    return {
      sessionId: session.id,
      date: session.endTime || session.startTime,
      sets,
      topWeight,
      repsAtTopWeight: Math.max(...topSets.map((s) => s.reps)),
      avgReps: Math.round(avgReps * 10) / 10,
      maxRpe: rpes.length ? Math.max(...rpes) : undefined,
    };
  }

  return undefined;
}

/** Incremento sensato según el ejercicio (grupos grandes suben más). */
export function incrementForExercise(exercise: Exercise): number {
  if (exercise.workSeconds && exercise.workSeconds > 0) return 0; // por tiempo: sin peso
  const category = exercise.category;
  if (category === "legs" || category === "back") return 5;
  if (category === "chest" || category === "shoulders") return 2.5;
  if (category === "biceps" || category === "triceps" || category === "core") return 1;
  return 2.5;
}

function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return Math.round(value * 10) / 10;
  return Math.round(value / increment) * increment;
}

export interface SuggestInput {
  last?: LastPerformance;
  repRange: RepRange | null;
  increment: number;
  goal?: TrainingGoal;
  /** Pesos con los que el usuario tiene equipo disponible. */
  equipmentPref?: "dumbbells" | "bodyweight";
}

export function suggestNextLoad({
  last,
  repRange,
  increment,
  goal = "hypertrophy",
  equipmentPref = "dumbbells",
}: SuggestInput): LoadSuggestion {
  const range = repRange || { min: 8, max: 12 };

  if (!last || last.topWeight === 0 && equipmentPref === "bodyweight") {
    return {
      action: "start",
      weight: last?.topWeight ?? 0,
      reps: range.min,
      increment,
      reason: last ? "Empieza por el rango bajo y sube reps" : "Primera vez con este ejercicio",
    };
  }

  if (!last) {
    return {
      action: "start",
      weight: 0,
      reps: range.min,
      increment,
      reason: "Primera vez con este ejercicio",
    };
  }

  const workingWeight = last.topWeight;
  const hitTopOfRange = last.repsAtTopWeight >= range.max;
  const belowRange = last.repsAtTopWeight < range.min;
  const maxEffort = typeof last.maxRpe === "number" && last.maxRpe >= 9.5;
  const nearMaxEffort = typeof last.maxRpe === "number" && last.maxRpe >= 8.5;

  // Esfuerzo máximo: no se sube peso, se consolida.
  if (hitTopOfRange && maxEffort) {
    return {
      action: "hold",
      weight: workingWeight,
      reps: range.min,
      increment,
      reason: `Llegaste al tope con esfuerzo máximo (RPE ${last.maxRpe}). Repite el peso para consolidarlo`,
    };
  }

  if (hitTopOfRange) {
    const isLower = increment >= 5;
    const step = isLower && goal === "strength" ? increment : increment;
    const next = roundToIncrement(workingWeight + step, step);
    return {
      action: "increase",
      weight: next,
      reps: range.min,
      increment: step,
      reason: `Completaste ${last.repsAtTopWeight} reps (tope del rango). Sube ${step} kg y vuelve a ${range.min}`,
    };
  }

  if (belowRange) {
    const factor = 0.9;
    const step = Math.max(increment, 1);
    const next = Math.max(0, roundToIncrement(workingWeight * factor, step));
    return {
      action: "down",
      weight: next,
      reps: range.min,
      increment: step,
      reason: `Te quedaste en ${last.repsAtTopWeight} reps (por debajo de ${range.min}). Baja a ${next} kg para volver al rango`,
    };
  }

  // Dentro del rango: progresión por repeticiones.
  const targetReps = Math.min(range.max, Math.ceil(last.repsAtTopWeight) + 1);
  if (nearMaxEffort) {
    return {
      action: "hold",
      weight: workingWeight,
      reps: targetReps,
      increment,
      reason: `Buen esfuerzo (RPE ${last.maxRpe}): mantén el peso y busca ${targetReps} reps`,
    };
  }
  return {
    action: "hold",
    weight: workingWeight,
    reps: targetReps,
    increment,
    reason: `Mismo peso, una repetición más hasta llegar a ${range.max}`,
  };
}

/** Sesiones que ya incluyen este ejercicio, para el historial rápido. */
export function countSessionsWithExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
): number {
  return sessions.filter((s) =>
    s.exercises?.some((ex) => ex.exerciseId === exerciseId && (ex.sets || []).some((set) => set.completed)),
  ).length;
}
