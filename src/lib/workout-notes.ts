// FORTIXAM — notas rápidas por ejercicio durante el entreno (F2.1).
//
// La lógica vive aquí, separada de React y del store, para poder probarla sin
// WebView: qué es una nota válida, dónde se guarda y cómo se recupera.

import { ExerciseLog } from "./types";

/** Longitud máxima de una nota: cabe en el historial sin romper la tarjeta. */
export const MAX_NOTE_LENGTH = 280;

/**
 * Normaliza lo escrito por el usuario: colapsa espacios, recorta y limita la
 * longitud. Devuelve `undefined` si se queda vacía, para no guardar notas
 * fantasma al borrar el texto.
 */
export function normalizeNote(raw: string | undefined | null): string | undefined {
  const clean = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NOTE_LENGTH);
  return clean.length > 0 ? clean : undefined;
}

/** Nota del ejercicio en la lista de la sesión (si existe y no está vacía). */
export function getExerciseNote(
  exercises: ExerciseLog[] | undefined,
  exerciseId: string | undefined,
): string | undefined {
  if (!exercises || !exerciseId) return undefined;
  const log = exercises.find((ex) => ex.exerciseId === exerciseId);
  return normalizeNote(log?.note);
}

/**
 * Devuelve la lista de ejercicios con la nota del ejercicio indicado
 * actualizada. Con `rawNote` vacío la nota se elimina. No toca el resto de
 * ejercicios ni de series.
 */
export function applyExerciseNote(
  exercises: ExerciseLog[],
  exerciseId: string,
  rawNote: string,
): ExerciseLog[] {
  const note = normalizeNote(rawNote);
  return exercises.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, note } : ex));
}
