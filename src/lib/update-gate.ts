import type { ActiveWorkoutState } from "./types";

/**
 * ¿Hay un entreno de verdad en marcha? (F9.1)
 *
 * El aviso de actualización es un diálogo a pantalla completa: saltar con él
 * entre series es justo lo que no queremos. Mientras esto devuelva `true`, el
 * aviso se guarda y espera.
 *
 * No cuentan como entreno en marcha:
 * - el resumen recién abierto (`justFinished`): el entreno ya ha terminado,
 *   aunque el store conserve la rutina para no expulsar de la pantalla;
 * - una sesión ya marcada como completada;
 * - una rutina sin sesión (no debería pasar, pero no se retiene nada por ello).
 */
export function isWorkoutInProgress(
  activeWorkout:
    | Pick<ActiveWorkoutState, "routine" | "session" | "justFinished">
    | null
    | undefined,
): boolean {
  if (!activeWorkout?.routine) return false;
  if (activeWorkout.justFinished) return false;
  if (!activeWorkout.session) return false;
  if (activeWorkout.session.completed) return false;
  return true;
}

/**
 * Margen entre el final del entreno y el aviso de actualización.
 *
 * Al terminar, la app abre el resumen del entrenamiento: taparlo al instante
 * sería cambiar una interrupción por otra. Con este respiro da tiempo a ver el
 * resumen antes de que aparezca el diálogo.
 */
export const AVISO_TRAS_ENTRENO_MS = 2500;
