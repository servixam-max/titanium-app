// FORTIXAM — recordatorio de calentamiento por ausencia de fuerza (F2.4).
//
// La lógica vive aquí, separada de React y del store, para poder probarla sin
// WebView: qué sesiones cuentan como "fuerza", cuántos días han pasado desde la
// última completada y cuándo toca avisar.
//
// El modelo de sesión no guarda un tipo explícito (`mode` es guiado/individual,
// no fuerza/cardio), así que el tipo se infiere de lo anotado: una serie con
// repeticiones o peso entrena fuerza; una serie solo por tiempo (duración) es
// cardio/HIIT y no reinicia el contador de calentamiento.

import { SetLog } from "./types";

/**
 * Días sin sesión de fuerza a partir de los que conviene recordar calentar
 * (movilidad + series de aproximación) antes de la carga.
 *
 * 5 días: un puente sobre la cabeza ni dos semanas de espera. Con una semana
 * de parón la primera sesión se nota, así que avisamos antes de llegar a ella.
 */
export const WARMUP_REMINDER_THRESHOLD_DAYS = 5;

const MS_PER_DAY = 86_400_000;

/** Lo único de una serie que decide si entrena fuerza (`SetLog` real). */
type WarmupSetLike = Pick<SetLog, "reps" | "weight" | "duration">;

/** Datos mínimos de sesión para decidir el aviso; el resto no importa. */
export interface WarmupReminderSessionLike {
  startTime?: string | null;
  endTime?: string | null;
  completed?: boolean;
  deleted?: boolean;
  exercises?: Array<{ sets?: WarmupSetLike[] | null } | undefined> | null;
}

export interface WarmupReminderInput {
  /** Historial de sesiones del usuario (da igual el orden). */
  sessions?: WarmupReminderSessionLike[] | null;
  /** Momento actual (inyectable para pruebas). */
  now?: Date;
  /** Umbral en días de fuerza sin entrenar; por defecto el de la app. */
  thresholdDays?: number;
}

export interface WarmupReminderResult {
  shouldRemind: boolean;
  /** Días completos desde la última sesión de fuerza completada. */
  daysSinceLastStrength: number | null;
  /** Fecha (ISO) de esa última sesión de fuerza, o `null` si no hay. */
  lastStrengthAt: string | null;
  thresholdDays: number;
}

/** ¿Cuenta esta sesión como fuerza? Una serie anotada con reps o peso basta. */
export function isStrengthSession(
  session: WarmupReminderSessionLike | undefined | null,
): boolean {
  if (!session || session.deleted) return false;
  const exercises = session.exercises ?? [];
  return exercises.some((exercise) =>
    (exercise?.sets ?? []).some((set) => {
      if (!set) return false;
      const reps = set.reps;
      const weight = set.weight;
      const hasReps =
        typeof reps === "number" && Number.isFinite(reps) && reps > 0;
      const hasWeight =
        typeof weight === "number" && Number.isFinite(weight) && weight > 0;
      // Una serie solo por tiempo (HIIT) no es fuerza, aunque el resto de la
      // sesión lo sea: basta una serie con reps/peso para contar la sesión.
      return hasReps || hasWeight;
    }),
  );
}

/** Fecha de finalización válida de la sesión (endTime, y startTime de apoyo). */
export function completedSessionDate(
  session: WarmupReminderSessionLike | undefined | null,
): string | null {
  if (!session || session.deleted) return null;
  for (const iso of [session.endTime, session.startTime]) {
    if (typeof iso === "string" && iso.length > 0 && !Number.isNaN(new Date(iso).getTime())) {
      return iso;
    }
  }
  return null;
}

/** Días completos desde `dateIso` hasta `now`; `null` si la fecha no vale. */
export function fullDaysSince(
  dateIso: string | undefined | null,
  now: Date,
): number | null {
  if (!dateIso) return null;
  const then = new Date(dateIso);
  if (Number.isNaN(then.getTime())) return null;
  const diffMs = now.getTime() - then.getTime();
  // Una fecha futura (desfase de reloj) cuenta como 0 días, no como -1.
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
}

/** Última sesión de fuerza completada del historial (ignora fechas rotas). */
export function findLatestStrengthSession(
  sessions: WarmupReminderSessionLike[] | undefined | null,
): WarmupReminderSessionLike | null {
  const candidates = (sessions ?? [])
    .filter((session) => Boolean(session?.completed) && isStrengthSession(session))
    .map((session) => ({ session, date: completedSessionDate(session) }))
    .filter(
      (entry): entry is { session: WarmupReminderSessionLike; date: string } =>
        entry.date !== null,
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return candidates[0]?.session ?? null;
}

/** Decide si toca el aviso de calentamiento para este historial y momento. */
export function computeWarmupReminder(
  input: WarmupReminderInput,
): WarmupReminderResult {
  const now = input.now ?? new Date();
  const thresholdDays =
    typeof input.thresholdDays === "number" &&
    Number.isFinite(input.thresholdDays) &&
    input.thresholdDays > 0
      ? input.thresholdDays
      : WARMUP_REMINDER_THRESHOLD_DAYS;

  const latest = findLatestStrengthSession(input.sessions);
  const lastStrengthAt = latest ? completedSessionDate(latest) : null;
  const daysSinceLastStrength = fullDaysSince(lastStrengthAt, now);

  return {
    // Sin historial de fuerza (o con fechas rotas) no se avisa: no hay dato que
    // justifique el aviso y no queremos asustar en la primera apertura.
    shouldRemind:
      daysSinceLastStrength !== null && daysSinceLastStrength >= thresholdDays,
    daysSinceLastStrength,
    lastStrengthAt,
    thresholdDays,
  };
}
