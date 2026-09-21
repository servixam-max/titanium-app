import { describe, it, expect } from "vitest";
import {
  TYPED_TABLES,
  DOCUMENT_ENTITIES,
  isKnownEntityType,
  normalizeEntity,
  rowToEntity,
} from "./sync-mapping";

describe("sync-mapping", () => {
  it("incluye exercises en las columnas de la sesión (el detalle ya no se pierde)", () => {
    expect(TYPED_TABLES.WorkoutSession.columns).toContain("exercises");
    expect(TYPED_TABLES.WorkoutSession.json).toContain("exercises");
  });

  it("normaliza una sesión con ejercicios y los serializa a JSONB", () => {
    const session = {
      id: "s1",
      clientId: "c1",
      routineId: 3,
      mode: "guided",
      startTime: "2026-09-21T10:00:00.000Z",
      endTime: "2026-09-21T11:00:00.000Z",
      completed: true,
      exercises: [{ id: "ex1", sets: [{ id: "set1", weight: 60 }] }],
      version: 2,
    };

    const normalized = normalizeEntity("WorkoutSession", session);

    expect(normalized).not.toBeNull();
    expect(normalized!.id).toBe("s1");
    expect(normalized!.routine_id).toBe(3);
    expect(normalized!.start_time).toBe("2026-09-21T10:00:00.000Z");
    // El JSONB viaja como texto en la consulta SQL
    expect(typeof normalized!.exercises).toBe("string");
    expect(JSON.parse(normalized!.exercises as string)).toHaveLength(1);
  });

  it("usa un array vacío cuando faltan ejercicios (nunca null)", () => {
    const normalized = normalizeEntity("WorkoutSession", { id: "s2", clientId: "c1" });
    expect(JSON.parse(normalized!.exercises as string)).toEqual([]);
  });

  it("convierte una fila de BD al shape del cliente y deserializa el JSONB", () => {
    const row = {
      id: "s1",
      user_id: "u1",
      client_id: "c1",
      routine_id: "3",
      start_time: "2026-09-21T10:00:00.000Z",
      completed: true,
      exercises: JSON.stringify([{ id: "ex1" }]),
      version: 2,
      modified_at: "2026-09-21T11:00:00.000Z",
      deleted: false,
    };

    const entity = rowToEntity("WorkoutSession", row);

    expect(entity.id).toBe("s1");
    expect(entity.routineId).toBe("3");
    expect(entity.startTime).toBe("2026-09-21T10:00:00.000Z");
    expect(entity.exercises).toEqual([{ id: "ex1" }]);
  });

  it("devuelve [] si el JSONB está corrupto en lugar de romper el sync", () => {
    const entity = rowToEntity("WorkoutSession", { id: "s1", exercises: "{no-json" });
    expect(entity.exercises).toEqual([]);
  });

  it("reconoce las entidades documento", () => {
    expect(DOCUMENT_ENTITIES.has("Routine")).toBe(true);
    expect(DOCUMENT_ENTITIES.has("Exercise")).toBe(true);
    expect(isKnownEntityType("PlannedSession")).toBe(true);
    expect(isKnownEntityType("WorkoutSession")).toBe(true);
    expect(isKnownEntityType("LoQueSea")).toBe(false);
  });

  it("devuelve null al normalizar una entidad desconocida", () => {
    expect(normalizeEntity("Desconocida", { id: "x" })).toBeNull();
  });
});
