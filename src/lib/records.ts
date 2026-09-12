import { getSessions } from "./db";

export interface ExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  bestWeight: number;      // maximum weight lifted in any single set
  bestVolume: number;      // weight × reps for best set
  bestEstimated1RM: number; // Epley formula: weight * (1 + reps/30)
  totalSets: number;
  totalReps: number;
  lastDate: string;
}

// Epley formula for estimated 1RM
export function estimate1RM(weight: number, reps: number): number {
  if (reps === 0 || weight === 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export async function getAllRecords(userId?: string): Promise<Map<string, ExerciseRecord>> {
  const sessions = await getSessions(userId);
  const records = new Map<string, ExerciseRecord>();

  for (const session of sessions) {
    if (!session.completed) continue;
    for (const exercise of session.exercises) {
      const existing = records.get(exercise.exerciseId);
      let bestWeight = existing?.bestWeight ?? 0;
      let bestVolume = existing?.bestVolume ?? 0;
      let bestEstimated1RM = existing?.bestEstimated1RM ?? 0;
      let totalSets = existing?.totalSets ?? 0;
      let totalReps = existing?.totalReps ?? 0;
      let lastDate = existing?.lastDate ?? "";

      for (const set of exercise.sets) {
        const w = set.weight ?? 0;
        const r = set.reps ?? 0;
        const vol = w * r;
        const e1rm = estimate1RM(w, r);
        if (w > bestWeight) bestWeight = w;
        if (vol > bestVolume) bestVolume = vol;
        if (e1rm > bestEstimated1RM) bestEstimated1RM = e1rm;
        totalSets++;
        totalReps += r;
      }

      const sessionDate = session.endTime ?? session.startTime;
      if (!lastDate || new Date(sessionDate) > new Date(lastDate)) {
        lastDate = sessionDate;
      }

      records.set(exercise.exerciseId, {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName ?? exercise.exerciseId,
        bestWeight,
        bestVolume,
        bestEstimated1RM,
        totalSets,
        totalReps,
        lastDate,
      });
    }
  }

  return records;
}

// Check if a new set breaks a record — returns which records were broken
export function checkNewSetRecord(
  exerciseId: string,
  weight: number,
  reps: number,
  existingRecord: ExerciseRecord | undefined
): { isBestWeight: boolean; isBestVolume: boolean; isBest1RM: boolean } {
  const newVolume = weight * reps;
  const new1RM = estimate1RM(weight, reps);
  return {
    isBestWeight: weight > (existingRecord?.bestWeight ?? 0),
    isBestVolume: newVolume > (existingRecord?.bestVolume ?? 0),
    isBest1RM: new1RM > (existingRecord?.bestEstimated1RM ?? 0),
  };
}
