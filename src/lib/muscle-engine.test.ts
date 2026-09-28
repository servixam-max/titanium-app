import { describe, it, expect } from "vitest";
import {
  computeMuscleBreakdown,
  getExerciseBiomechanics,
} from "./muscle-engine";
import { LocalSession } from "./db";
import { ExerciseLog, SetLog } from "./types";

function makeSet(
  ownerUserId: string,
  setNumber: number,
  weight: number,
  reps: number,
): SetLog {
  const now = new Date().toISOString();
  return {
    id: `set-${ownerUserId}-${setNumber}`,
    clientId: "test-client",
    ownerUserId,
    createdAt: now,
    modifiedAt: now,
    version: 1,
    setNumber,
    weight,
    reps,
    completed: true,
    timestamp: now,
  };
}

function makeSession(
  id: string,
  exerciseId: string,
  exerciseName: string,
  sets: SetLog[],
): LocalSession {
  const now = new Date().toISOString();
  const exercise: ExerciseLog = {
    id: `exlog-${id}`,
    clientId: "test-client",
    ownerUserId: "u1",
    createdAt: now,
    modifiedAt: now,
    version: 1,
    exerciseId,
    exerciseName,
    order: 0,
    sets,
  };
  return {
    id,
    clientId: "test-client",
    ownerUserId: "u1",
    createdAt: now,
    modifiedAt: now,
    version: 1,
    routineId: 1,
    mode: "individual",
    startTime: now,
    endTime: now,
    completed: true,
    exercises: [exercise],
  };
}

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
    const sessions: LocalSession[] = [
      makeSession("s1", "bench-press", "Press de Banca Plano", [
        makeSet("u1", 1, 60, 10),
        makeSet("u1", 2, 60, 10),
      ]),
    ];

    const { muscleStats, totalEffectiveVolume } = computeMuscleBreakdown(
      sessions,
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
    const sessions: LocalSession[] = [
      makeSession("s2", "squats", "Sentadillas Libres", [
        makeSet("u1", 1, 0, 20),
      ]),
    ];

    const { muscleStats } = computeMuscleBreakdown(sessions, "week");
    expect(muscleStats.quads.volumeKg).toBeGreaterThan(0);
    expect(muscleStats.glutes.volumeKg).toBeGreaterThan(0);
  });

  it("ilumina el músculo entrenado aunque no se anote el peso (bug real)", () => {
    // Regresión del fallo visto en el emulador: tras entrenar pecho con
    // mancuernas y no anotar los kilos, el 3D seguía diciendo
    // "0/16 MÚSCULOS ACTIVOS" porque el volumen quedaba en 0.
    // El ejercicio de banca no aporta peso corporal (bodyweightEqKg: 0).
    const sessions: LocalSession[] = [
      makeSession("s3", "bench", "Press de Banca Plano", [
        makeSet("u1", 1, 0, 10),
        makeSet("u1", 2, 0, 10),
        makeSet("u1", 3, 0, 10),
      ]),
    ];

    const { muscleStats, totalEffectiveVolume } = computeMuscleBreakdown(sessions, "week");

    expect(muscleStats.chest.volumeKg).toBeGreaterThan(0);
    expect(muscleStats.chest.totalSets).toBe(3);
    expect(totalEffectiveVolume).toBeGreaterThan(0);

    // Los sinergistas también deben encenderse.
    expect(muscleStats.triceps.volumeKg).toBeGreaterThan(0);
    expect(muscleStats.deltoids_ant.volumeKg).toBeGreaterThan(0);
  });

  it("cuenta al menos un músculo activo para el contador del 3D", () => {
    // El contador del visor es `volumeKg > 0`. Este es el valor que se veía
    // como 0/16 y debe pasar a 3/16 tras un entreno de pecho sin peso anotado.
    const sessions: LocalSession[] = [
      makeSession("s4", "bench", "Press de Banca Plano", [makeSet("u1", 1, 0, 12)]),
    ];

    const { muscleStats } = computeMuscleBreakdown(sessions, "week");
    const activos = Object.values(muscleStats).filter((s) => s.volumeKg > 0).length;

    expect(activos).toBeGreaterThanOrEqual(3);
  });
});