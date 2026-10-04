// FORTIXAM — copia de seguridad de datos (F3.1).
//
// Todo lo que se puede decidir sin depender del WebView vive aquí, para
// probarlo sin móvil: la forma del archivo exportado, la lectura y validación
// de una copia, el nombre determinista del fichero, el resumen de restauración
// y la fusión de "última marca por ejercicio".
//
// El formato es el mismo que ya usaba la app (y que las copias antiguas
// respetan): { app, version, exportedAt, user, sessions, weights,
// lastExerciseWeights }. Leer copias antiguas sigue funcionando aunque no
// traigan `lastExerciseWeights`.

import type { WeightEntry, WorkoutSession } from "./types";

export const BACKUP_APP_ID = "FORTIXAM";

export interface BackupUserHeader {
  id?: string;
  username?: string;
  email?: string;
}

/** Lo que se escribe en el archivo .json. */
export interface SerializedBackup {
  app: typeof BACKUP_APP_ID;
  version: string;
  exportedAt: string;
  user: BackupUserHeader;
  sessions: WorkoutSession[];
  weights: WeightEntry[];
  lastExerciseWeights: Record<string, number>;
}

/** Lo que devuelve leer un archivo de copia (ya validado). */
export interface ParsedBackup {
  sessions: WorkoutSession[];
  weights: WeightEntry[];
  lastExerciseWeights: Record<string, number>;
  counts: {
    sessions: number;
    weights: number;
    lastWeights: number;
  };
  exportedAt: string | null;
}

export type BackupParseErrorCode = "invalid-json" | "not-fortixam" | "empty";

export class BackupParseError extends Error {
  readonly code: BackupParseErrorCode;
  readonly userMessage: string;

  constructor(code: BackupParseErrorCode) {
    const userMessages: Record<BackupParseErrorCode, string> = {
      "invalid-json": "El archivo no es un JSON válido.",
      "not-fortixam": "El archivo no es una copia de seguridad de FORTIXAM.",
      empty: "La copia no contiene entrenamientos ni pesajes.",
    };
    super(userMessages[code]);
    this.name = "BackupParseError";
    this.code = code;
    this.userMessage = userMessages[code];
  }
}

/** Construye el objeto que se serializa al exportar. Puro y determinista. */
export function buildBackupPayload(input: {
  version: string;
  user?: BackupUserHeader;
  sessions: WorkoutSession[];
  weights: WeightEntry[];
  lastExerciseWeights: Record<string, number>;
  exportedAt?: string;
}): SerializedBackup {
  return {
    app: BACKUP_APP_ID,
    version: input.version,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    user: input.user ?? {},
    sessions: input.sessions ?? [],
    weights: input.weights ?? [],
    lastExerciseWeights: input.lastExerciseWeights ?? {},
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlainObject);
}

/** Sesiones utilizables: objeto con `id` de texto (lo exige la base local). */
function asSessionArray(value: unknown): Record<string, unknown>[] {
  return asObjectArray(value).filter((s) => typeof s.id === "string" && s.id.length > 0);
}

/** Pesajes utilizables: objeto con `weight` numérico finito. */
function asWeightArray(value: unknown): Record<string, unknown>[] {
  return asObjectArray(value).filter(
    (w) => typeof w.weight === "number" && Number.isFinite(w.weight),
  );
}

function asWeightMap(value: unknown): Record<string, number> {
  if (!isPlainObject(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
  }
  return out;
}

/**
 * Lee y valida el texto de una copia de seguridad. Lanza `BackupParseError`
 * con un mensaje claro para el usuario cuando el archivo no sirve.
 */
export function parseBackupJson(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupParseError("invalid-json");
  }

  if (!isPlainObject(raw)) throw new BackupParseError("not-fortixam");

  // El campo `app` es obligatorio en todo lo exportado por FORTIXAM; si está y
  // no coincide, el archivo es de otra cosa.
  if (typeof raw.app === "string" && raw.app !== BACKUP_APP_ID) {
    throw new BackupParseError("not-fortixam");
  }

  const sessions = asSessionArray(raw.sessions);
  const weights = asWeightArray(raw.weights);
  const lastExerciseWeights = asWeightMap(raw.lastExerciseWeights);

  if (sessions.length === 0 && weights.length === 0 && Object.keys(lastExerciseWeights).length === 0) {
    throw new BackupParseError("empty");
  }

  return {
    // El contenido se usa tal cual: cada sesión/pesaje pasa por `saveSession`
    // y `saveWeight`, que completan los campos de sincronización.
    sessions: sessions as unknown as WorkoutSession[],
    weights: weights as unknown as WeightEntry[],
    lastExerciseWeights,
    counts: {
      sessions: sessions.length,
      weights: weights.length,
      lastWeights: Object.keys(lastExerciseWeights).length,
    },
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : null,
  };
}

/** Nombre determinista del archivo: `fortixam-backup-<usuario>-AAAA-MM-DD.json`. */
export function backupFileName(username: string | undefined, isoDate: string): string {
  const clean = (username || "usuario").toLowerCase().replace(/[^a-z0-9]/g, "_");
  const date = (isoDate || new Date().toISOString()).slice(0, 10);
  return `fortixam-backup-${clean}-${date}.json`;
}

/**
 * Fusiona las marcas del archivo con las de este dispositivo: lo que ya hay
 * aquí no se pisa (puede ser más reciente), y lo que falta se rellena.
 * En una instalación nueva todo viene del archivo.
 */
export function mergeLastExerciseWeights(
  current: Record<string, number> | undefined,
  restored: Record<string, number> | undefined,
): Record<string, number> {
  const merged: Record<string, number> = { ...(current ?? {}) };
  for (const [exerciseId, weight] of Object.entries(restored ?? {})) {
    if (merged[exerciseId] === undefined && Number.isFinite(weight)) {
      merged[exerciseId] = weight;
    }
  }
  return merged;
}

/** Resumen humano de lo restaurado, para el aviso de Ajustes. */
export function restoreSummary(counts: { sessions: number; weights: number; lastWeights: number }): string {
  const parts: string[] = [];
  if (counts.sessions > 0) {
    parts.push(counts.sessions === 1 ? "1 entrenamiento" : `${counts.sessions} entrenamientos`);
  }
  if (counts.weights > 0) {
    parts.push(counts.weights === 1 ? "1 pesaje" : `${counts.weights} pesajes`);
  }
  if (counts.lastWeights > 0) {
    parts.push(counts.lastWeights === 1 ? "1 marca por ejercicio" : `${counts.lastWeights} marcas por ejercicio`);
  }
  if (parts.length === 0) return "No había nada que restaurar.";
  return `¡Datos restaurados! ${parts.join(", ")}.`;
}
