"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { routines } from "@/lib/data";
import { hasPersistedWorkout, useStoreHydrated } from "@/hooks/useStoreHydrated";
import { decidirDestinoRecordatorio, leerPlanSemanalId } from "@/lib/notification-route";

/**
 * Puerta del recordatorio diario (F9.2).
 *
 * Tocar el aviso lleva aquí. La ruta es fija, pero el día se resuelve al
 * tocarla: `sesionDeHoy` es la misma función que usa la home, así que un aviso
 * programado ayer abre la sesión de hoy, no la de ayer.
 *
 * Nunca pisa un entreno a medias (vuelve a él) y en descanso no inventa una
 * sesión: manda a la home, que es donde se entiende qué pasa hoy.
 */
export default function WorkoutToday() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  // Suscripción a propósito: con el estado persistido recién volcado, este
  // efecto debe volver a correr cuando la rutina activa aparece en el store.
  const routineActiva = useAppStore((s) => s.activeWorkout.routine);
  const modoActivo = useAppStore((s) => s.activeWorkout.mode);
  const resuelto = useRef(false);

  useEffect(() => {
    if (!hydrated || resuelto.current) return;

    const state = useAppStore.getState();
    // Hueco conocido (~140 ms): hay entreno guardado pero aún no está en el
    // store. Se espera al siguiente volcado en vez de decidir en falso.
    if (hasPersistedWorkout() && !state.activeWorkout.routine) return;

    resuelto.current = true;

    const destino = decidirDestinoRecordatorio({
      planId: leerPlanSemanalId(),
      modoEnCurso: state.activeWorkout.routine ? state.activeWorkout.mode : null,
    });

    if (destino.tipo === "reanudar") {
      router.replace(`/workout/${destino.modo}`);
      return;
    }

    if (destino.tipo === "sesion") {
      const routine = routines.find((r) => r.day === destino.dia);
      if (routine) {
        state.startWorkout(routine, "guided", 0);
        router.replace("/workout/guided");
        return;
      }
    }

    router.replace("/");
  }, [hydrated, routineActiva, modoActivo, router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
      <div
        role="status"
        aria-live="polite"
        className="animate-pulse text-[15px] text-[color:var(--text-tertiary)]"
      >
        Preparando la sesión de hoy…
      </div>
    </div>
  );
}
