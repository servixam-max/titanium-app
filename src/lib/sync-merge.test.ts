import { describe, it, expect } from "vitest";
import { mergeEntity, hasExerciseDetail, resolveQueueItem } from "./sync-merge";

const now = "2026-09-21T10:00:00.000Z";
const earlier = "2026-09-20T10:00:00.000Z";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    clientId: "c1",
    ownerUserId: "u1",
    completed: true,
    exercises: [
      {
        id: "ex1",
        exerciseId: "bench",
        exerciseName: "Press de Banca",
        sets: [{ id: "set1", setNumber: 1, weight: 60, reps: 10 }],
      },
    ],
    version: 3,
    createdAt: earlier,
    modifiedAt: now,
    ...overrides,
  };
}

describe("mergeEntity", () => {
  it("inserta la entidad del servidor cuando no hay copia local", () => {
    const incoming = makeSession();
    const result = mergeEntity("WorkoutSession", undefined, incoming);
    expect(result.action).toBe("insert");
    expect(result.entity).toEqual(incoming);
  });

  it("REGRESIÓN: una sesión del servidor sin detalle no borra las series locales", () => {
    const local = makeSession();
    // El servidor devuelve la fila de workout_sessions sin `exercises`
    // (fila antigua, payload parcial o columna sin rellenar).
    const incoming = makeSession({ exercises: undefined, version: 4 });
    delete (incoming as Record<string, unknown>).exercises;

    const result = mergeEntity("WorkoutSession", local, incoming);

    expect(result.action).toBe("update");
    expect((result.entity as Record<string, unknown>).exercises).toEqual(local.exercises);
  });

  it("REGRESIÓN: un array de ejercicios vacío tampoco borra el detalle local", () => {
    const local = makeSession();
    const incoming = makeSession({ exercises: [], version: 4 });

    const result = mergeEntity("WorkoutSession", local, incoming);

    expect((result.entity as Record<string, unknown>).exercises).toEqual(local.exercises);
  });

  it("acepta el detalle del servidor cuando sí lo trae", () => {
    const local = makeSession();
    const serverExercises = [
      { id: "ex9", exerciseId: "squat", exerciseName: "Sentadilla", sets: [{ id: "set9", setNumber: 1, weight: 80, reps: 5 }] },
    ];
    const incoming = makeSession({ exercises: serverExercises, version: 5, modifiedAt: "2026-09-21T11:00:00.000Z" });

    const result = mergeEntity("WorkoutSession", local, incoming);

    expect((result.entity as Record<string, unknown>).exercises).toEqual(serverExercises);
  });

  it("no sobrescribe una copia local más nueva", () => {
    const local = makeSession({ modifiedAt: now, version: 5 });
    const incoming = makeSession({ modifiedAt: earlier, version: 2 });

    const result = mergeEntity("WorkoutSession", local, incoming);

    expect(result.action).toBe("skip");
    expect(result.reason).toBe("local_is_newer");
    expect(result.entity).toBe(local);
  });

  it("propaga el borrado del servidor", () => {
    const local = makeSession();
    const incoming = makeSession({ deleted: true, modifiedAt: "2026-09-21T12:00:00.000Z" });

    const result = mergeEntity("WorkoutSession", local, incoming);

    expect(result.action).toBe("update");
    expect((result.entity as Record<string, unknown>).deleted).toBe(true);
    expect((result.entity as Record<string, unknown>).exercises).toEqual(local.exercises);
  });

  it("conserva campos locales que el servidor no envía", () => {
    const local = { id: "w1", weight: 80, date: "2026-09-20", notes: "local", modifiedAt: earlier, version: 1 };
    const incoming = { id: "w1", weight: 81, modifiedAt: now, version: 2 };

    const result = mergeEntity("WeightEntry", local, incoming);

    expect(result.entity).toMatchObject({ weight: 81, notes: "local" });
  });
});

describe("hasExerciseDetail", () => {
  it("detecta detalle real", () => {
    expect(hasExerciseDetail({ exercises: [{ id: "x" }] })).toBe(true);
    expect(hasExerciseDetail({ exercises: [] })).toBe(false);
    expect(hasExerciseDetail({})).toBe(false);
    expect(hasExerciseDetail(null)).toBe(false);
  });
});

describe("resolveQueueItem", () => {
  const item = { entityType: "WorkoutSession", entityId: "s1", attempts: 0 };
  const empty = { applied: [], skipped: [] };

  it("elimina el item cuando el servidor lo aplicó", () => {
    const res = resolveQueueItem(item, {
      applied: [{ entityType: "WorkoutSession", entityId: "s1" }],
      skipped: [],
    });
    expect(res.remove).toBe(true);
  });

  it("elimina el item si el servidor ya tenía algo más nuevo", () => {
    const res = resolveQueueItem(item, {
      ...empty,
      skipped: [{ entityType: "WorkoutSession", entityId: "s1", reason: "server_newer" }],
    });
    expect(res.remove).toBe(true);
    expect(res.reason).toBe("server_newer");
  });

  it("elimina (sin bucle) lo que el servidor rechaza siempre", () => {
    const routineItem = { entityType: "Routine", entityId: "r1", attempts: 0 };
    const res = resolveQueueItem(routineItem, {
      ...empty,
      skipped: [{ entityType: "Routine", entityId: "r1", reason: "unknown_entity_type" }],
    });
    expect(res.remove).toBe(true);
    expect(res.reason).toBe("unknown_entity_type");
  });

  it("no confunde el rechazo de otra entidad con un item distinto", () => {
    const res = resolveQueueItem(item, {
      ...empty,
      skipped: [{ entityType: "Routine", entityId: "r1", reason: "unknown_entity_type" }],
    });
    expect(res.remove).toBe(false);
    expect(res.retry).toBe(true);
  });

  it("conserva y reintenta lo que el servidor no reconoció en la respuesta", () => {
    const res = resolveQueueItem(item, empty);
    expect(res.remove).toBe(false);
    expect(res.retry).toBe(true);
  });

  it("deja de reintentar tras agotar los intentos", () => {
    const res = resolveQueueItem({ ...item, attempts: 5 }, empty, 5);
    expect(res.remove).toBe(true);
    expect(res.reason).toBe("max_attempts_reached");
  });
});
