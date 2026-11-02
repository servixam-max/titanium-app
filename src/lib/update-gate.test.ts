import { describe, it, expect } from "vitest";
import { isWorkoutInProgress, AVISO_TRAS_ENTRENO_MS } from "./update-gate";
import type { ActiveWorkoutState } from "./types";

// El aviso de actualización no debe saltar en mitad de un entreno (F9.1).
// La decisión vive aquí, fuera del componente, para poder probarla sola.

const RUTINA = {
  day: 1,
  title: "Día 1: Empuje",
  exercises: [],
} as unknown as ActiveWorkoutState["routine"];

function entreno(overrides: Partial<ActiveWorkoutState> = {}): ActiveWorkoutState {
  return {
    routine: RUTINA,
    mode: "individual",
    currentExerciseIndex: 0,
    currentSet: 1,
    currentRound: 1,
    equipmentPref: "dumbbells",
    isResting: false,
    restTimeRemaining: 0,
    isPreparing: false,
    prepTimeRemaining: 0,
    isWorking: false,
    workTimeRemaining: 0,
    session: { completed: false } as unknown as ActiveWorkoutState["session"],
    exerciseWeights: {},
    exerciseReps: {},
    justFinished: false,
    ...overrides,
  };
}

describe("isWorkoutInProgress — cuándo hay que aguantar el aviso (F9.1)", () => {
  it("con un entreno empezado y sin terminar, el aviso espera", () => {
    expect(isWorkoutInProgress(entreno())).toBe(true);
  });

  it("sin rutina no hay entreno que interrumpir", () => {
    expect(isWorkoutInProgress(entreno({ routine: null }))).toBe(false);
  });

  it("en el resumen recién abierto el entreno ya ha terminado", () => {
    expect(isWorkoutInProgress(entreno({ justFinished: true }))).toBe(false);
  });

  it("una sesión guardada como completada tampoco es un entreno en marcha", () => {
    expect(
      isWorkoutInProgress(
        entreno({
          session: { completed: true } as unknown as ActiveWorkoutState["session"],
        }),
      ),
    ).toBe(false);
  });

  it("una rutina sin sesión no retiene nada", () => {
    expect(isWorkoutInProgress(entreno({ session: null }))).toBe(false);
  });

  it("sin estado (app recién abierta) tampoco retiene", () => {
    expect(isWorkoutInProgress(null)).toBe(false);
    expect(isWorkoutInProgress(undefined)).toBe(false);
  });

  it("deja un respiro para ver el resumen antes de taparlo", () => {
    // Un instante sería tapar el resumen; demasiado, perder el aviso de vista.
    expect(AVISO_TRAS_ENTRENO_MS).toBeGreaterThanOrEqual(1500);
    expect(AVISO_TRAS_ENTRENO_MS).toBeLessThanOrEqual(5000);
  });
});
