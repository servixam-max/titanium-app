// FORTIXAM v8 — workout runtime helpers

import { Routine, Exercise, ExerciseGroup } from "./types";

export interface AdaptiveRestInput {
  /** Descanso prescrito en la rutina (es la base que manda). */
  baseRestSeconds: number;
  /** Esfuerzo percibido de la serie recién completada (opcional). */
  lastSetRpe?: number;
  /** Duración de la serie en segundos, para series por tiempo. */
  lastSetDuration?: number;
}

/**
 * Descanso de la serie siguiente.
 *
 * El descanso prescrito en la rutina manda: NO se ajusta por tipo de ejercicio
 * (eso desviaba los 75 s del catálogo a 90 s en los compuestos). Solo se adapta
 * cuando hay información real del esfuerzo:
 *  - RPE registrado: más descanso si fue muy duro, menos si fue cómodo.
 *  - Series por tiempo largas (HIIT): recuperación proporcional al trabajo.
 */
export function calculateAdaptiveRest(input: AdaptiveRestInput): number {
  let rest = input.baseRestSeconds;
  const { lastSetRpe, lastSetDuration } = input;

  if (lastSetRpe) {
    if (lastSetRpe >= 9) rest += 20;
    else if (lastSetRpe >= 7) rest += 10;
    else if (lastSetRpe <= 5) rest -= 15;
  }

  // Series largas por tiempo (p. ej. HIIT de 45 s) necesitan más recuperación
  if (lastSetDuration && lastSetDuration > 30) {
    rest += Math.round(lastSetDuration * 0.5);
  }

  return Math.max(15, Math.min(300, rest));
}

export function detectSupersetGroups(routine: Routine): ExerciseGroup[] {
  if (routine.groups?.length) return routine.groups;
  if (!routine.exercises) return [];

  const groups: ExerciseGroup[] = [];
  const byCategory: Record<string, string[]> = {};

  routine.exercises.forEach((ex, idx) => {
    const cat = ex.category || "general";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(ex.id || `ex-${idx}`);
  });

  // Pair complementary categories for supersets (push/pull, agonist/antagonist)
  const pairs: Array<[string, string]> = [
    ["chest", "back"],
    ["biceps", "triceps"],
    ["legs", "core"],
  ];

  for (const [a, b] of pairs) {
    const listA = byCategory[a];
    const listB = byCategory[b];
    if (listA?.length && listB?.length) {
      const minLen = Math.min(listA.length, listB.length);
      for (let i = 0; i < minLen; i++) {
        groups.push({
          id: `ss-${a}-${b}-${i}`,
          type: "superset",
          exerciseIds: [listA[i], listB[i]],
          restAfterGroup: 90,
        });
      }
    }
  }

  return groups;
}

export function isInSuperset(exerciseId: string, groups: ExerciseGroup[]): boolean {
  return groups.some((g) => g.exerciseIds.includes(exerciseId));
}

export function getSupersetPartner(exerciseId: string, groups: ExerciseGroup[]): string | undefined {
  const group = groups.find((g) => g.exerciseIds.includes(exerciseId));
  if (!group) return undefined;
  return group.exerciseIds.find((id) => id !== exerciseId);
}

export function getNextSupersetExercise(
  currentId: string,
  routine: Routine,
  groups: ExerciseGroup[],
): Exercise | undefined {
  const partnerId = getSupersetPartner(currentId, groups);
  if (!partnerId) return undefined;
  return routine.exercises.find((ex) => ex.id === partnerId);
}
