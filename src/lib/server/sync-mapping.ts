// FORTIXAM — mapeo de entidades del sync (sin dependencias de BD, testeable)

export interface TableMeta {
  table: string;
  columns: string[];
  json?: string[];
}

/**
 * Tablas con columnas tipadas. `exercises` viaja como JSONB dentro de la
 * sesión: es el detalle (ejercicios → series) que antes se perdía.
 */
export const TYPED_TABLES: Record<string, TableMeta> = {
  WorkoutSession: {
    table: "workout_sessions",
    columns: [
      "id",
      "user_id",
      "client_id",
      "routine_id",
      "routine_name",
      "mode",
      "start_time",
      "end_time",
      "duration_seconds",
      "total_sets",
      "total_reps",
      "total_volume",
      "completed",
      "notes",
      "exercises",
      "version",
      "created_at",
      "modified_at",
      "deleted",
    ],
    json: ["exercises"],
  },
  WeightEntry: {
    table: "weight_entries",
    columns: ["id", "user_id", "client_id", "weight", "date", "version", "created_at", "modified_at", "deleted"],
  },
  Plan: {
    table: "plans",
    columns: [
      "id",
      "user_id",
      "client_id",
      "name",
      "description",
      "goal",
      "level",
      "days_per_week",
      "weeks",
      "schedule",
      "active",
      "version",
      "created_at",
      "modified_at",
      "deleted",
    ],
    json: ["schedule"],
  },
};

/** Entidades documento: se guardan enteras como JSONB en user_documents. */
export const DOCUMENT_ENTITIES = new Set([
  "Routine",
  "Exercise",
  "PlannedSession",
  "Achievement",
  "UserProfile",
  "CustomRoutine",
]);

export function isKnownEntityType(entityType: string): boolean {
  return Boolean(TYPED_TABLES[entityType]) || DOCUMENT_ENTITIES.has(entityType);
}

function parseIso(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function toIsoOrNull(value: unknown): string | null {
  const parsed = parseIso(typeof value === "string" ? value : null);
  return parsed ? parsed.toISOString() : null;
}

/** Normaliza una entidad tipada al shape de columnas de su tabla. */
export function normalizeEntity(
  entityType: string,
  data: Record<string, unknown>,
): Record<string, unknown> | null {
  const meta = TYPED_TABLES[entityType];
  if (!meta) return null;

  const normalized: Record<string, unknown> = {};
  for (const col of meta.columns) {
    const camel = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = data[camel] ?? data[col] ?? null;

    if (col === "created_at" || col === "modified_at" || col === "start_time" || col === "end_time") {
      value = toIsoOrNull(value);
    }

    if (meta.json?.includes(col)) {
      if (value === null) {
        value = JSON.stringify(col === "schedule" ? [] : []);
      } else if (typeof value !== "string") {
        value = JSON.stringify(value);
      }
    }

    normalized[col] = value;
  }
  return normalized;
}

/** Convierte una fila de la BD al shape camelCase que espera el cliente. */
export function rowToEntity(
  entityType: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const meta = TYPED_TABLES[entityType];
  if (!meta) return row;

  const result: Record<string, unknown> = {};
  for (const col of meta.columns) {
    const camel = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = row[col];
    if (meta.json?.includes(col)) {
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          value = [];
        }
      } else if (value === null || value === undefined) {
        value = [];
      }
    }
    result[camel] = value;
  }
  return result;
}
