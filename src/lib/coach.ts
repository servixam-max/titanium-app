// FORTIXAM v8 — lightweight rule-based coach
// Generates personalized plans from profile and the built-in routine catalog.

import { Routine, Plan, TrainingGoal, ExperienceLevel, EquipmentType } from "./types";
import { routines as seedRoutines } from "./data";

export interface CoachProfileInput {
  goal?: TrainingGoal;
  level?: ExperienceLevel;
  daysPerWeek?: number;
  equipment?: EquipmentType[];
  restrictions?: string[];
}

const levelWeights: Record<ExperienceLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function scoreRoutine(
  routine: Routine,
  goal: TrainingGoal,
  level: ExperienceLevel,
  equipment: EquipmentType[],
  restrictions: string[],
): number {
  let score = 0;

  // Goal match via categories
  const goalTags: Record<TrainingGoal, string[]> = {
    strength: ["back", "chest", "legs", "shoulders", "arms"],
    hypertrophy: ["chest", "back", "shoulders", "biceps", "triceps", "legs"],
    fat_loss: ["hiit", "full_body"],
    endurance: ["hiit", "full_body", "core"],
    mobility: ["mobility", "core"],
  };
  for (const ex of routine.exercises) {
    if (goalTags[goal]?.includes(ex.category || "")) score += 2;
  }

  // Level difficulty match
  const diffMap: Record<string, number> = {
    Principiante: 1,
    Intermedio: 2,
    Avanzado: 3,
    "Cardio HIIT": 2,
  };
  const routineLevel = diffMap[routine.difficulty] || 2;
  const userLevel = levelWeights[level] || 2;
  score += 3 - Math.abs(routineLevel - userLevel);

  // Equipment match
  const needsDumbbells = routine.exercises.some((e) => e.equipment === "dumbbells");
  const hasDumbbells = equipment.includes("dumbbells");
  const hasBodyweight = equipment.includes("bodyweight");
  if (needsDumbbells && hasDumbbells) score += 4;
  if (needsDumbbells && !hasDumbbells && hasBodyweight) score -= 2;
  if (!needsDumbbells && hasBodyweight) score += 2;

  // Respect restrictions
  for (const r of restrictions) {
    const lower = r.toLowerCase();
    if (routine.title.toLowerCase().includes(lower)) score -= 5;
    for (const ex of routine.exercises) {
      if (ex.name.toLowerCase().includes(lower) || (ex.category || "").includes(lower)) score -= 5;
    }
  }

  return score;
}

export function buildPlan(input: CoachProfileInput): Plan {
  const goal = input.goal || "hypertrophy";
  const level = input.level || "intermediate";
  const daysPerWeek = Math.min(Math.max(input.daysPerWeek || 3, 1), 7);
  const equipment: EquipmentType[] =
    (input.equipment?.length ? input.equipment : ["dumbbells", "bodyweight"]) as EquipmentType[];
  const restrictions = input.restrictions || [];

  const scored = seedRoutines.map((r) => ({
    routine: r,
    score: scoreRoutine(r, goal, level, equipment, restrictions),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Pick top N distinct routines, spreading categories if possible
  const selected: Routine[] = [];
  const usedCategories = new Set<string>();
  for (const { routine } of scored) {
    if (selected.length >= daysPerWeek) break;
    const category = routine.categoryTag || "fuerza";
    // Allow duplicate category only if we don't have enough variety
    if (usedCategories.has(category) && usedCategories.size < daysPerWeek) continue;
    selected.push(routine);
    usedCategories.add(category);
  }

  // Fallback if filtering too aggressive
  if (selected.length < daysPerWeek) {
    for (const { routine } of scored) {
      if (selected.length >= daysPerWeek) break;
      if (!selected.find((r) => r.day === routine.day)) selected.push(routine);
    }
  }

  // Order selected by day number for consistency
  selected.sort((a, b) => a.day - b.day);

  const weeks = level === "beginner" ? 4 : level === "advanced" ? 8 : 6;
  const schedule = Array.from({ length: weeks }, () => selected.map((r) => r.day));

  const goalLabels: Record<TrainingGoal, string> = {
    strength: "Fuerza total",
    hypertrophy: "Hipertrofia y definición",
    fat_loss: "Pérdida de grasa",
    endurance: "Resistencia",
    mobility: "Movilidad y control",
  };

  return {
    name: `${goalLabels[goal]} — ${daysPerWeek} días/semana`,
    description: `Plan generado por el coach para objetivo "${goalLabels[goal]}" con nivel ${level}. Equipamiento: ${equipment.join(", ")}.`,
    goal,
    level,
    daysPerWeek,
    weeks,
    schedule: schedule.flat(), // legacy flat schedule: week1 day numbers, week2 day numbers...
    active: true,
    recommended: true,
    tags: [goal, level, "auto"],
  } as Plan;
}

export function estimateOneRm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function recommendLoad(
  previousWeight?: number,
  previousReps?: number,
  targetReps?: number,
  goal: TrainingGoal = "hypertrophy",
): { weight: number; reps: number } {
  const reps = targetReps || previousReps || 10;
  let weight = previousWeight || 0;
  if (previousWeight && previousReps) {
    const oneRm = estimateOneRm(previousWeight, previousReps);
    const factor = goal === "strength" ? 0.85 : goal === "endurance" ? 0.65 : 0.75;
    weight = Math.round(oneRm * factor * 2) / 2;
  }
  return { weight, reps };
}
