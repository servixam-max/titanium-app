/**
 * Recordatorio diario de entreno (F8.3).
 *
 * Todo lo que se puede decidir sin Android ni React vive aquí: la hora elegida
 * por el usuario, cuántos avisos quedan por delante y —lo importante— si hoy
 * ya se ha entrenado, en cuyo caso el aviso de hoy no se programa.
 *
 * Los avisos se programan como notificaciones locales de un solo disparo sobre
 * un horizonte de una semana. Cada vez que la app arranca o termina un entreno
 * se vuelve a calcular el horizonte completo: así el aviso de hoy desaparece en
 * cuanto hay una sesión terminada y los días siguientes siguen cubiertos aunque
 * el teléfono se reinicie o la app no se abra en varios días.
 */

import { sameDay } from "./metrics";
import { WorkoutSession } from "./types";
import { RUTA_RECORDATORIO } from "./notification-route";

export const REMINDER_STORAGE_KEY = "fortixam_training_reminder_v1";
export const REMINDER_DEFAULT_HOUR = 19;
export const REMINDER_DEFAULT_MINUTE = 0;
/** Días de avisos que se programan de una vez. */
export const REMINDER_HORIZON_DAYS = 7;
/** Identificadores fijos: cancelar es siempre cancelar esta lista. */
export const REMINDER_NOTIFICATION_IDS = Array.from(
  { length: REMINDER_HORIZON_DAYS },
  (_, index) => 7301 + index,
);

const ANON_USER = "__anon__";

export interface TrainingReminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_TRAINING_REMINDER: TrainingReminder = {
  enabled: false,
  hour: REMINDER_DEFAULT_HOUR,
  minute: REMINDER_DEFAULT_MINUTE,
};

type ReminderMap = Record<string, TrainingReminder>;

function userKey(userId?: string | null): string {
  return userId || ANON_USER;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isValidReminderTime(hour: number, minute: number): boolean {
  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

/** `19:05` — siempre dos dígitos, para que la hora se lea de un vistazo. */
export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Lee el valor de un `<input type="time">` (`19:05`, o `19:05:00`). */
export function parseReminderTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return isValidReminderTime(hour, minute) ? { hour, minute } : null;
}

function sanitize(value: unknown): TrainingReminder | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const hour = Number(candidate.hour);
  const minute = Number(candidate.minute);
  if (!isValidReminderTime(hour, minute)) return null;

  return { enabled: candidate.enabled === true, hour, minute };
}

function readReminders(): ReminderMap {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const reminders: ReminderMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const reminder = sanitize(value);
      if (reminder) reminders[key] = reminder;
    }
    return reminders;
  } catch {
    return {};
  }
}

function writeReminders(reminders: ReminderMap): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    // Sin espacio o almacenamiento bloqueado: el ajuste no persiste, pero la
    // pantalla sigue funcionando.
  }
}

/** Ajuste guardado del usuario; apagado y a las 19:00 si nunca lo ha tocado. */
export function loadTrainingReminder(userId?: string | null): TrainingReminder {
  const stored = readReminders()[userKey(userId)];
  return stored ? { ...stored } : { ...DEFAULT_TRAINING_REMINDER };
}

export function saveTrainingReminder(
  userId: string | null | undefined,
  reminder: TrainingReminder,
): TrainingReminder {
  const clean: TrainingReminder = {
    enabled: reminder.enabled === true,
    hour: reminder.hour,
    minute: reminder.minute,
  };
  if (!isValidReminderTime(clean.hour, clean.minute)) return { ...DEFAULT_TRAINING_REMINDER };
  if (!getStorage()) return clean;

  const reminders = readReminders();
  reminders[userKey(userId)] = clean;
  writeReminders(reminders);
  return clean;
}

/** ¿Hay una sesión terminada hoy? Las sesiones a medias no cuentan. */
export function entrenoTerminadoHoy(
  sessions: Pick<WorkoutSession, "completed" | "endTime">[] | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!Array.isArray(sessions)) return false;

  return sessions.some((session) => {
    if (!session || session.completed !== true || !session.endTime) return false;
    const end = new Date(session.endTime);
    if (Number.isNaN(end.getTime())) return false;
    return sameDay(end, now);
  });
}

/**
 * Próximos avisos, en orden. Se salta el de hoy si ya pasó la hora o si ya hay
 * un entreno terminado hoy; nunca devuelve fechas en el pasado.
 */
export function nextReminderDates(
  reminder: Pick<TrainingReminder, "hour" | "minute">,
  sessions: Pick<WorkoutSession, "completed" | "endTime">[] | null | undefined,
  now: Date = new Date(),
  horizonDays: number = REMINDER_HORIZON_DAYS,
): Date[] {
  if (!isValidReminderTime(reminder.hour, reminder.minute)) return [];

  const entrenadoHoy = entrenoTerminadoHoy(sessions, now);
  const dates: Date[] = [];
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Se recorre un día de más para poder saltar hoy y seguir completando el
  // horizonte pedido.
  for (let offset = 0; dates.length < horizonDays && offset <= horizonDays; offset += 1) {
    const at = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset,
      reminder.hour,
      reminder.minute,
      0,
      0,
    );

    if (at.getTime() <= now.getTime()) continue;
    if (offset === 0 && entrenadoHoy) continue;
    dates.push(at);
  }

  return dates;
}

export interface ReminderNotification {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle: boolean };
  extra: { route: string };
}

/**
 * Contenido del aviso. El texto no promete "hoy toca X": un día de descanso
 * también puede caer aquí y la app no debe mentir.
 *
 * La ruta es `/workout/hoy`: el día se resuelve al tocarla, no al programarla
 * (un aviso del lunes puede tocarse el martes).
 */
export function buildReminderNotification(
  at: Date,
  id: number,
): ReminderNotification {
  return {
    id,
    title: "FORTIXAM",
    body: "¿Ya has entrenado hoy? Un entreno corto también cuenta.",
    schedule: { at, allowWhileIdle: true },
    extra: { route: RUTA_RECORDATORIO },
  };
}

/**
 * Frase para Ajustes: qué va a pasar de verdad, sin promesas. Devuelve null
 * cuando el aviso está apagado (la UI pone su propio texto).
 */
export function describeReminder(
  reminder: TrainingReminder,
  sessions: Pick<WorkoutSession, "completed" | "endTime">[] | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!reminder.enabled) return null;

  const [next] = nextReminderDates(reminder, sessions, now, 1);
  if (!next) return "No hay ningún aviso programado.";

  const hora = formatReminderTime(reminder.hour, reminder.minute);
  if (entrenoTerminadoHoy(sessions, now)) {
    return `Hoy ya has entrenado: el próximo aviso es mañana a las ${hora}.`;
  }

  if (sameDay(next, now)) {
    return `Próximo aviso: hoy a las ${hora}.`;
  }

  return `Próximo aviso: mañana a las ${hora}.`;
}
