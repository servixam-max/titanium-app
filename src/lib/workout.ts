// FORTIXAM v8 — workout runtime helpers

import { Routine, Exercise, ExerciseGroup } from "./types";

export interface AdaptiveRestInput {
  baseRestSeconds: number;
  lastSetRpe?: number;
  lastSetDuration?: number;
  exerciseType?: "compound" | "isolation" | "hiit";
  goal?: "strength" | "hypertrophy" | "fat_loss" | "endurance" | "mobility";
}

export function calculateAdaptiveRest(input: AdaptiveRestInput): number {
  let rest = input.baseRestSeconds;
  const { lastSetRpe, lastSetDuration, exerciseType = "compound", goal = "hypertrophy" } = input;

  // Base by goal
  if (goal === "strength") rest = Math.max(rest, 150);
  if (goal === "endurance" || goal === "fat_loss") rest = Math.min(rest, 60);
  if (goal === "mobility") rest = Math.min(rest, 45);

  // Compound movements need more rest than isolation
  if (exerciseType === "compound") rest += 15;
  if (exerciseType === "isolation") rest -= 10;

  // Higher RPE = more rest; lower RPE = less rest
  if (lastSetRpe) {
    if (lastSetRpe >= 9) rest += 20;
    else if (lastSetRpe >= 7) rest += 10;
    else if (lastSetRpe <= 5) rest -= 15;
  }

  // Long sets (e.g. HIIT 45s work) need more recovery
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
