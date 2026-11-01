"use client";

import { useCallback, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "@/lib/store";
import { loadTrainingReminder } from "@/lib/training-reminder";
import { syncTrainingReminders } from "@/lib/local-notifications";

/**
 * Mantiene al día los avisos del recordatorio diario (F8.3).
 *
 * Se vuelve a programar en tres momentos: al abrir la app, cada vez que cambia
 * el historial (terminar un entreno cancela el aviso de hoy) y al volver del
 * segundo plano (por si el permiso o la hora cambiaron fuera de la app).
 * Siempre en silencio: pedir permiso es cosa del interruptor de Ajustes.
 */
export function useTrainingReminderSync() {
  const sessions = useAppStore((state) => state.sessions);
  const userId = useAppStore((state) => state.currentUser?.id);

  const run = useCallback(() => {
    const reminder = loadTrainingReminder(userId);
    if (!reminder.enabled) return;
    void syncTrainingReminders(reminder, sessions);
  }, [sessions, userId]);

  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) runRef.current();
        }),
      )
      .then((handle) => {
        if (cancelled) {
          void handle.remove();
          return;
        }
        remove = () => void handle.remove();
      })
      .catch(() => {
        // Sin el plugin App la app sigue funcionando; solo se pierde el
        // reajuste al volver del segundo plano.
      });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
}
