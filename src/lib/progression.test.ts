import { describe, it, expect } from "vitest";
import {
  parseRepRange,
  getLastPerformance,
  suggestNextLoad,
  incrementForExercise,
  countSessionsWithExercise,
  LastPerformance,
} from "./progression";
import { WorkoutSession, Exercise } from "./types";

function makeSession(
  id: string,
  endTime: string,
  exerciseId: string,
  sets: Array<{ setNumber: number; weight: number; reps: number; rpe?: number }>,
): WorkoutSession {
  const now = "2026-09-01T10:00:00.000Z";
  return {
    id,
    clientId: "c1",
    ownerUserId: "u1",
    createdAt: now,
    modifiedAt: now,
    version: 1,
    routineId: 1,
    mode: "guided",
    startTime: now,
    endTime,
    completed: true,
    exercises: [
      {
        id: `log-${id}`,
        clientId: "c1",
        ownerUserId: "u1",
        createdAt: now,
        modifiedAt: now,
        version: 1,
        exerciseId,
        exerciseName: "Ejercicio",
        order: 0,
        sets: sets.map((s) => ({
          id: `set-${id}-${s.setNumber}`,
          clientId: "c1",
          ownerUserId: "u1",
          createdAt: now,
          modifiedAt: now,
          version: 1,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          completed: true,
          timestamp: endTime,
        })),
      },
    ],
  };
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "bench",
    name: "Press de Banca",
    sets: 3,
    reps: "10-12",
    restSeconds: 75,
    equipment: "dumbbells",
    category: "chest",
    ...overrides,
  };
}

describe("parseRepRange", () => {
  it("parsea rangos y valores simples", () => {
    expect(parseRepRange("10-12")).toEqual({ min: 10, max: 12 });
    expect(parseRepRange("8")).toEqual({ min: 8, max: 8 });
    expect(parseRepRange("Al fallo")).toEqual({ min: 6, max: 20 });
    expect(parseRepRange("30s")).toBeNull();
    expect(parseRepRange(undefined)).toBeNull();
  });
});

describe("getLastPerformance", () => {
  it("toma la sesión más reciente con el ejercicio", () => {
    const sessions = [
      makeSession("old", "2026-09-10T10:00:00.000Z", "bench", [{ setNumber: 1, weight: 40, reps: 10 }]),
      makeSession("new", "2026-09-15T10:00:00.000Z", "bench", [
        { setNumber: 1, weight: 45, reps: 10, rpe: 8 },
        { setNumber: 2, weight: 45, reps: 9 },
      ]),
    ];

    const last = getLastPerformance(sessions, "bench");

    expect(last?.sessionId).toBe("new");
    expect(last?.topWeight).toBe(45);
    expect(last?.repsAtTopWeight).toBe(10);
    expect(last?.maxRpe).toBe(8);
  });

  it("ignora sesiones sin series completadas y devuelve undefined si no hay historial", () => {
    const sessions = [makeSession("s1", "2026-09-15T10:00:00.000Z", "bench", [])];
    expect(getLastPerformance(sessions, "bench")).toBeUndefined();
    expect(getLastPerformance([], "bench")).toBeUndefined();
  });
});

describe("suggestNextLoad", () => {
  const base: Omit<LastPerformance, "sets"> = {
    sessionId: "s1",
    date: "2026-09-15T10:00:00.000Z",
    topWeight: 20,
    repsAtTopWeight: 12,
    avgReps: 12,
  };
  const range = { min: 10, max: 12 };

  it("sube peso al llegar al tope del rango", () => {
    const suggestion = suggestNextLoad({
      last: { ...base, sets: [] },
      repRange: range,
      increment: 2.5,
    });
    expect(suggestion.action).toBe("increase");
    expect(suggestion.weight).toBe(22.5);
    expect(suggestion.reps).toBe(10);
  });

  it("NO sube peso si el esfuerzo fue máximo", () => {
    const suggestion = suggestNextLoad({
      last: { ...base, sets: [], maxRpe: 10 },
      repRange: range,
      increment: 2.5,
    });
    expect(suggestion.action).toBe("hold");
    expect(suggestion.weight).toBe(20);
  });

  it("mantiene el peso y pide una repetición más dentro del rango", () => {
    const suggestion = suggestNextLoad({
      last: { ...base, sets: [], repsAtTopWeight: 10, maxRpe: 7 },
      repRange: range,
      increment: 2.5,
    });
    expect(suggestion.action).toBe("hold");
    expect(suggestion.weight).toBe(20);
    expect(suggestion.reps).toBe(11);
  });

  it("baja el peso si se quedó por debajo del rango", () => {
    const suggestion = suggestNextLoad({
      last: { ...base, sets: [], repsAtTopWeight: 7, maxRpe: 9 },
      repRange: range,
      increment: 2.5,
    });
    expect(suggestion.action).toBe("down");
    expect(suggestion.weight).toBeLessThan(20);
  });

  it("marca como inicio cuando no hay historial", () => {
    const suggestion = suggestNextLoad({ repRange: range, increment: 2.5 });
    expect(suggestion.action).toBe("start");
    expect(suggestion.reps).toBe(10);
  });

  it("redondea los pesos al incremento disponible", () => {
    const suggestion = suggestNextLoad({
      last: { ...base, sets: [], topWeight: 21, repsAtTopWeight: 12 },
      repRange: range,
      increment: 2.5,
    });
    expect(suggestion.weight % 2.5).toBe(0);
  });
});

describe("incrementForExercise", () => {
  it("sube más en piernas que en bíceps", () => {
    expect(incrementForExercise(makeExercise({ category: "legs" }))).toBe(5);
    expect(incrementForExercise(makeExercise({ category: "biceps" }))).toBe(1);
    expect(incrementForExercise(makeExercise({ category: "chest" }))).toBe(2.5);
  });

  it("no sugiere peso en ejercicios por tiempo", () => {
    expect(incrementForExercise(makeExercise({ workSeconds: 40 }))).toBe(0);
  });
});

describe("countSessionsWithExercise", () => {
  it("cuenta sesiones con series completadas del ejercicio", () => {
    const sessions = [
      makeSession("a", "2026-09-10T10:00:00.000Z", "bench", [{ setNumber: 1, weight: 40, reps: 10 }]),
      makeSession("b", "2026-09-11T10:00:00.000Z", "squat", [{ setNumber: 1, weight: 60, reps: 8 }]),
    ];
    expect(countSessionsWithExercise(sessions, "bench")).toBe(1);
    expect(countSessionsWithExercise(sessions, "squat")).toBe(1);
    expect(countSessionsWithExercise(sessions, "curl")).toBe(0);
  });
});
