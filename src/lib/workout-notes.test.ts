import { describe, it, expect } from "vitest";
import {
  MAX_NOTE_LENGTH,
  normalizeNote,
  getExerciseNote,
  applyExerciseNote,
} from "./workout-notes";
import { ExerciseLog } from "./types";

function log(exerciseId: string, note?: string): ExerciseLog {
  return {
    id: `log-${exerciseId}`,
    clientId: "c",
    ownerUserId: "u",
    createdAt: "2026-09-30T10:00:00.000Z",
    modifiedAt: "2026-09-30T10:00:00.000Z",
    version: 1,
    exerciseId,
    exerciseName: exerciseId,
    order: 0,
    sets: [],
    note,
  };
}

describe("normalizeNote — qué cuenta como nota (F2.1)", () => {
  it("recorta los espacios de los extremos", () => {
    expect(normalizeNote("  subir 2,5 kg  ")).toBe("subir 2,5 kg");
  });

  it("colapsa saltos de línea y espacios repetidos en un espacio", () => {
    expect(normalizeNote("codo\n  pegado   al cuerpo")).toBe("codo pegado al cuerpo");
  });

  it("trata el texto vacío o solo espacios como ausencia de nota", () => {
    expect(normalizeNote("")).toBeUndefined();
    expect(normalizeNote("   \n  ")).toBeUndefined();
    expect(normalizeNote(undefined)).toBeUndefined();
    expect(normalizeNote(null)).toBeUndefined();
  });

  it("limita la longitud para no romper la tarjeta del historial", () => {
    const larga = "a".repeat(MAX_NOTE_LENGTH + 50);
    expect(normalizeNote(larga)?.length).toBe(MAX_NOTE_LENGTH);
  });
});

describe("getExerciseNote — lectura de la nota guardada", () => {
  it("devuelve la nota del ejercicio pedido", () => {
    const exercises = [log("bench", "  banco a 2 "), log("flyes")];
    expect(getExerciseNote(exercises, "bench")).toBe("banco a 2");
  });

  it("sin nota guardada devuelve undefined", () => {
    expect(getExerciseNote([log("bench")], "bench")).toBeUndefined();
  });

  it("no confunde ejercicios: pide el que toca", () => {
    const exercises = [log("bench", "nota del press"), log("flyes", "nota de aperturas")];
    expect(getExerciseNote(exercises, "flyes")).toBe("nota de aperturas");
  });

  it("aguanta listas o ids ausentes", () => {
    expect(getExerciseNote(undefined, "bench")).toBeUndefined();
    expect(getExerciseNote([log("bench", "x")], undefined)).toBeUndefined();
  });
});

describe("applyExerciseNote — guardado dentro de la sesión", () => {
  it("guarda la nota en el ejercicio indicado sin tocar los demás", () => {
    const exercises = [log("bench"), log("flyes")];
    const updated = applyExerciseNote(exercises, "bench", "subir a 42,5");

    expect(updated[0].note).toBe("subir a 42,5");
    expect(updated[1].note).toBeUndefined();
  });

  it("con texto vacío la nota se borra (no queda una nota fantasma)", () => {
    const exercises = [log("bench", "vieja")];
    expect(applyExerciseNote(exercises, "bench", "   ")[0].note).toBeUndefined();
  });

  it("no muta la lista original", () => {
    const exercises = [log("bench", "vieja")];
    applyExerciseNote(exercises, "bench", "nueva");
    expect(exercises[0].note).toBe("vieja");
  });

  it("un id que no existe deja la sesión igual", () => {
    const exercises = [log("bench", "nota")];
    const updated = applyExerciseNote(exercises, "otro", "x");
    expect(updated).toHaveLength(1);
    expect(updated[0].note).toBe("nota");
  });
});
