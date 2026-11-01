"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bell, BellOff, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { WorkoutSession } from "@/lib/types";
import {
  describeReminder,
  formatReminderTime,
  loadTrainingReminder,
  parseReminderTime,
  saveTrainingReminder,
  TrainingReminder,
} from "@/lib/training-reminder";
import {
  checkReminderPermission,
  remindersSupported,
  requestReminderPermission,
  syncTrainingReminders,
} from "@/lib/local-notifications";

interface TrainingReminderSectionProps {
  userId?: string | null;
  sessions: WorkoutSession[];
}

type Aviso = { tone: "ok" | "error"; text: string } | null;

/**
 * Recordatorio diario de entreno (F8.3).
 *
 * El interruptor solo se enciende si el permiso de notificaciones está de
 * verdad concedido: si se deniega, vuelve a apagado y se explica por qué. En el
 * navegador se dice que los avisos con la app cerrada necesitan la app
 * instalada, en vez de fingir que funcionan.
 */
export default function TrainingReminderSection({
  userId,
  sessions,
}: TrainingReminderSectionProps) {
  const [reminder, setReminder] = useState<TrainingReminder>(() =>
    loadTrainingReminder(userId),
  );
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  useEffect(() => {
    setNative(remindersSupported());
  }, []);

  useEffect(() => {
    setReminder(loadTrainingReminder(userId));
  }, [userId]);

  // Si el permiso se retiró desde los ajustes de Android, el interruptor no
  // puede seguir diciendo que está encendido.
  useEffect(() => {
    let cancelled = false;
    if (!native) return;

    (async () => {
      const guardado = loadTrainingReminder(userId);
      if (!guardado.enabled) return;

      const permission = await checkReminderPermission();
      if (cancelled || permission === "granted") return;

      const apagado = saveTrainingReminder(userId, { ...guardado, enabled: false });
      setReminder(apagado);
      setAviso({
        tone: "error",
        text: "El permiso de notificaciones está desactivado en el sistema, así que el aviso sigue apagado.",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [native, userId]);

  const cambiarHora = useCallback(
    async (value: string) => {
      const parsed = parseReminderTime(value);
      if (!parsed) return;

      const actualizado = saveTrainingReminder(userId, { ...reminder, ...parsed });
      setReminder(actualizado);
      setAviso(null);

      if (actualizado.enabled) {
        const result = await syncTrainingReminders(actualizado, sessions);
        if (!result.ok) {
          setAviso({
            tone: "error",
            text: "No se pudo reprogramar el aviso. Vuelve a intentarlo.",
          });
        }
      }
    },
    [reminder, sessions, userId],
  );

  const alternar = useCallback(async () => {
    if (!native || busy) return;
    setBusy(true);
    setAviso(null);
    haptics.selection();

    try {
      if (reminder.enabled) {
        const apagado = saveTrainingReminder(userId, { ...reminder, enabled: false });
        await syncTrainingReminders(apagado, sessions);
        setReminder(apagado);
        setAviso({ tone: "ok", text: "Recordatorio apagado: no habrá más avisos." });
        return;
      }

      const permission = await requestReminderPermission();
      if (permission !== "granted") {
        const apagado = saveTrainingReminder(userId, { ...reminder, enabled: false });
        setReminder(apagado);
        await syncTrainingReminders(apagado, sessions);
        setAviso({
          tone: "error",
          text:
            permission === "unavailable"
              ? "Los avisos programados solo funcionan en la app instalada."
              : "Sin permiso de notificaciones no puedo avisarte. El interruptor sigue apagado: puedes darlo en Ajustes de Android → FORTIXAM → Notificaciones.",
        });
        return;
      }

      const encendido = saveTrainingReminder(userId, { ...reminder, enabled: true });
      setReminder(encendido);

      const result = await syncTrainingReminders(encendido, sessions);
      if (!result.ok) {
        const apagado = saveTrainingReminder(userId, { ...encendido, enabled: false });
        setReminder(apagado);
        setAviso({
          tone: "error",
          text:
            result.permission === "denied"
              ? "Android no ha dado el permiso, así que el aviso vuelve a estar apagado."
              : "No se pudo programar el aviso. El interruptor vuelve a estar apagado.",
        });
        return;
      }

      setAviso({
        tone: "ok",
        text: describeReminder(encendido, sessions) ?? "Recordatorio activado.",
      });
    } finally {
      setBusy(false);
    }
  }, [busy, native, reminder, sessions, userId]);

  // En el navegador el interruptor no puede estar encendido: aunque el ajuste
  // venga guardado del APK, aquí no hay forma de programar el aviso.
  const activo = native && reminder.enabled;
  const descripcion = activo ? describeReminder(reminder, sessions) : null;

  return (
    <section className="flex flex-col gap-stack-gap" data-testid="training-reminder">
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 mb-1">
        <span className="text-primary">
          <Bell className="w-4 h-4" aria-hidden="true" />
        </span>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
          Recordatorio de Entreno
        </h3>
      </div>

      <div className="fx-card rounded-2xl p-4 flex flex-col gap-3 shadow-sm dark:shadow-lg">
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label="Recordatorio diario de entreno"
          onClick={alternar}
          disabled={!native || busy}
          className={`w-full h-touch-target-min rounded-2xl flex items-center justify-between px-4 transition-all active:scale-95 ${
            native ? "cursor-pointer" : "cursor-not-allowed opacity-70"
          } ${
            activo
              ? "border-primary/40 bg-primary/10 shadow-sm"
              : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#131626]"
          }`}
        >
          <div className="flex items-center gap-3">
            {activo ? (
              <Bell className="w-6 h-6 text-primary" aria-hidden="true" />
            ) : (
              <BellOff className="w-6 h-6 text-zinc-400" aria-hidden="true" />
            )}
            <span className="text-left">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                {activo ? "Aviso diario activado" : "Aviso diario apagado"}
              </span>
              <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {activo
                  ? `Cada día a las ${formatReminderTime(reminder.hour, reminder.minute)}`
                  : "Un toque al día para no perder la costumbre"}
              </span>
            </span>
          </div>

          <span
            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
              activo ? "bg-primary shadow-sm" : "bg-slate-200 dark:bg-white/10"
            }`}
            aria-hidden="true"
          >
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full bg-white transition-transform ${
                activo ? "translate-x-5" : "translate-x-0"
              }`}
            >
              {busy && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
            </span>
          </span>
        </button>

        {activo && (
          <label className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              Hora del aviso
            </span>
            <input
              type="time"
              step={60}
              value={formatReminderTime(reminder.hour, reminder.minute)}
              onChange={(event) => cambiarHora(event.target.value)}
              aria-label="Hora del recordatorio diario"
              className="h-12 px-3 rounded-xl bg-slate-100 dark:bg-[#0b0f1a] border border-slate-200 dark:border-white/10 text-base font-bold text-slate-900 dark:text-white"
            />
          </label>
        )}

        {descripcion && (
          <p className="text-xs text-slate-600 dark:text-zinc-300" data-testid="reminder-next">
            {descripcion}
          </p>
        )}

        {!native && (
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Los avisos con la app cerrada necesitan la app instalada: el navegador no
            puede programarlos.
          </p>
        )}

        {aviso && (
          <p
            role="status"
            data-tone={aviso.tone}
            className={`flex items-start gap-2 text-xs font-bold ${
              aviso.tone === "ok" ? "text-primary" : "text-danger"
            }`}
          >
            {aviso.tone === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <span>{aviso.text}</span>
          </p>
        )}
      </div>
    </section>
  );
}
