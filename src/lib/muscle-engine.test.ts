import { describe, it, expect } from "vitest";
import {
  computeMuscleBreakdown,
  getExerciseBiomechanics,
} from "./muscle-engine";
import { LocalSession } from "./db";

describe("Biomechanical Muscle Engine", () => {
  it("correctly identifies primary and secondary muscles for chest press", () => {
    const biomech = getExerciseBiomechanics("Press de Banca Plano", "chest");
    expect(biomech.primary).toContain("chest");
    expect(biomech.secondary).toContain("triceps");
    expect(biomech.secondary).toContain("deltoids_ant");
  });

  it("calculates bodyweight mechanical load for pushups when weight is 0", () => {
    const biomech = getExerciseBiomechanics("Flexiones Clásicas", "chest");
    expect(biomech.bodyweightEqKg).toBeGreaterThan(0);
    expect(biomech.primary).toContain("chest");
  });

  it("computes muscle volume and sets across completed sessions", () => {
    const mockSessions: any[] = [
      {
        id: "s1",
        clientId: "c1",
        ownerUserId: "u1",
        routineId: 1,
        mode: "individual",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        completed: true,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        version: 1,
        exercises: [
          {
            exerciseId: "bench-press",
            exerciseName: "Press de Banca Plano",
            sets: [
              { setNumber: 1, weight: 60, reps: 10, completed: true },
              { setNumber: 2, weight: 60, reps: 10, completed: true },
            ] as any,
          },
        ],
      },
    ];

    const { muscleStats, totalEffectiveVolume } = computeMuscleBreakdown(
      mockSessions as any,
      "week"
    );

    // 2 sets * 60kg * 10 reps = 1200 kg for chest (primary)
    expect(muscleStats.chest.volumeKg).toBe(1200);
    expect(muscleStats.chest.totalSets).toBe(2);
    expect(muscleStats.chest.totalReps).toBe(20);

    // Triceps (secondary synergist: 45%) -> 1200 * 0.45 = 540 kg
    expect(muscleStats.triceps.volumeKg).toBe(540);

    expect(totalEffectiveVolume).toBeGreaterThan(1200);
  });

  it("activates muscles even for 0kg bodyweight exercises", () => {
    const mockSessions: any[] = [
      {
        id: "s2",
        clientId: "c2",
        ownerUserId: "u1",
        routineId: 2,
        mode: "guided",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        completed: true,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        version: 1,
        exercises: [
          {
            exerciseId: "squats",
            exerciseName: "Sentadillas Libres",
            sets: [
              { setNumber: 1, weight: 0, reps: 20, completed: true },
            ] as any,
          },
        ],
      },
    ];

    const { muscleStats } = computeMuscleBreakdown(mockSessions as any, "week");
    expect(muscleStats.quads.volumeKg).toBeGreaterThan(0);
    expect(muscleStats.glutes.volumeKg).toBeGreaterThan(0);
  });
});
