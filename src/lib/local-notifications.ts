/**
 * Puente con las notificaciones locales de Android (F8.3).
 *
 * La app es también una PWA, pero programar un aviso con la app cerrada solo
 * se puede hacer desde el APK con el plugin nativo. En el navegador se dice en
 * claro en vez de prometer algo que no va a pasar.
 *
 * Regla de oro: `syncTrainingReminders` NUNCA pide permiso por su cuenta. Pedir
 * permiso solo cuando el usuario enciende el interruptor (`request…`); el
 * resto de sincronizaciones son silenciosas y, si el permiso ya no está, se
 * limitan a no programar nada.
 */

import { Capacitor } from "@capacitor/core";
import {
  buildReminderNotification,
  nextReminderDates,
  REMINDER_NOTIFICATION_IDS,
  TrainingReminder,
} from "./training-reminder";
import { WorkoutSession } from "./types";

export type ReminderPermission = "granted" | "denied" | "unavailable" | "error";

export interface ReminderSyncResult {
  ok: boolean;
  scheduled: number;
  permission: ReminderPermission | null;
  /** Aviso del plugin (por ejemplo, alarma inexacta por falta de permiso). */
  warning?: string;
  error?: string;
}

type SessionLike = Pick<WorkoutSession, "completed" | "endTime">;

/** ¿Estamos dentro del APK? En web no hay notificaciones programadas. */
export function remindersSupported(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function plugin() {
  return import("@capacitor/local-notifications");
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** Consulta el permiso sin abrir ningún diálogo. */
export async function checkReminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported()) return "unavailable";

  try {
    const { LocalNotifications } = await plugin();
    const current = await LocalNotifications.checkPermissions();
    return current.display === "granted" ? "granted" : "denied";
  } catch {
    return "error";
  }
}

/** Pide permiso de notificaciones (Android 13+ muestra el diálogo del sistema). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported()) return "unavailable";

  try {
    const { LocalNotifications } = await plugin();
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return "granted";

    const asked = await LocalNotifications.requestPermissions();
    return asked.display === "granted" ? "granted" : "denied";
  } catch {
    return "error";
  }
}

/** Cancela los avisos pendientes. No pide permiso ni falla si no había ninguno. */
export async function cancelTrainingReminders(): Promise<void> {
  if (!remindersSupported()) return;

  try {
    const { LocalNotifications } = await plugin();
    await LocalNotifications.cancel({
      notifications: REMINDER_NOTIFICATION_IDS.map((id) => ({ id })),
    });
  } catch {
    // Cancelar de más nunca debe romper la pantalla; el próximo sync reintenta.
  }
}

/**
 * Deja programados los avisos de la próxima semana (o ninguno, si el
 * recordatorio está apagado o no hay permiso).
 */
export async function syncTrainingReminders(
  reminder: TrainingReminder,
  sessions: SessionLike[] | null | undefined,
  now: Date = new Date(),
): Promise<ReminderSyncResult> {
  if (!remindersSupported()) {
    return { ok: false, scheduled: 0, permission: "unavailable" };
  }

  if (!reminder.enabled) {
    await cancelTrainingReminders();
    return { ok: true, scheduled: 0, permission: null };
  }

  try {
    const { LocalNotifications } = await plugin();
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted") {
      await cancelTrainingReminders();
      return { ok: false, scheduled: 0, permission: "denied" };
    }

    await cancelTrainingReminders();

    const dates = nextReminderDates(reminder, sessions, now);
    if (dates.length === 0) {
      return { ok: true, scheduled: 0, permission: "granted" };
    }

    const notifications = dates.map((at, index) =>
      buildReminderNotification(at, REMINDER_NOTIFICATION_IDS[index]),
    );
    const result = await LocalNotifications.schedule({ notifications });
    const warning =
      result && typeof result === "object" && result.warning
        ? `${result.warning.code}: ${result.warning.message}`
        : undefined;

    return { ok: true, scheduled: dates.length, permission: "granted", warning };
  } catch (error) {
    return {
      ok: false,
      scheduled: 0,
      permission: "error",
      error: errorMessage(error),
    };
  }
}
