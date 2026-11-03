/**
 * A dónde lleva tocar el recordatorio diario (F9.2).
 *
 * El aviso ya viajaba con `extra.route`, pero nadie lo escuchaba: al tocar la
 * notificación la app se abría donde se hubiera quedado (a veces en
 * Estadísticas, a veces en medio de un formulario), así que el recordatorio no
 * servía para entrenar.
 *
 * La ruta del aviso es `/workout/hoy`: una pantalla que resuelve en el momento
 * de tocarla —no cuando se programó— qué toca hoy según el plan semanal, con la
 * misma función que usa la home (`sesionDeHoy`). Así, un aviso programado el
 * lunes y tocado el martes abre la sesión del martes.
 *
 * La decisión vive aquí, sin React ni Android, para poder probarla.
 */

import { sesionDeHoy } from "./weekly-plan";
import { getPlanSemanal } from "./weekly-plans";
import type { TrainingMode } from "./types";

/** Ruta que llevan los avisos del recordatorio. */
export const RUTA_RECORDATORIO = "/workout/hoy";

/** Dónde se recuerda el plan semanal elegido (lo escribe la home). */
export const PLAN_SEMANAL_STORAGE_KEY = "fortixam_plan_semanal";

/**
 * Qué hacer al tocar el aviso:
 * - `reanudar`: hay un entreno a medias; se vuelve a él sin tocarlo.
 * - `sesion`: toca entrenar hoy; se abre esa sesión.
 * - `inicio`: descanso o sin plan; la home explica qué pasa.
 */
export type DestinoRecordatorio =
  | { tipo: "reanudar"; modo: TrainingMode }
  | { tipo: "sesion"; dia: number }
  | { tipo: "inicio" };

/** Plan semanal guardado en el dispositivo, si lo hay. */
export function leerPlanSemanalId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(PLAN_SEMANAL_STORAGE_KEY);
    return id && id.trim() ? id : null;
  } catch {
    // Almacenamiento bloqueado (modo privado): se comporta como "sin plan".
    return null;
  }
}

function esModoDeEntreno(valor: unknown): valor is TrainingMode {
  return valor === "guided" || valor === "individual";
}

/**
 * Resuelve el destino del aviso. El orden importa:
 *
 * 1. Un entreno en curso manda: tocar el aviso nunca debe borrarlo.
 * 2. Sin plan no se puede saber qué toca; la home es lo honesto.
 * 3. En descanso tampoco se inventa una sesión.
 * 4. Si toca entrenar, el día que resuelve `sesionDeHoy` para HOY.
 */
export function decidirDestinoRecordatorio(opciones: {
  planId?: string | null;
  /** Modo del entreno abierto, si lo hay. */
  modoEnCurso?: string | null;
  fecha?: Date;
}): DestinoRecordatorio {
  if (esModoDeEntreno(opciones.modoEnCurso)) {
    return { tipo: "reanudar", modo: opciones.modoEnCurso };
  }

  const plan = opciones.planId ? getPlanSemanal(opciones.planId) : undefined;
  if (!plan) return { tipo: "inicio" };

  const hoy = sesionDeHoy(plan, opciones.fecha ?? new Date());
  if (hoy.dias.length === 0) return { tipo: "inicio" };

  return { tipo: "sesion", dia: hoy.dias[0] };
}

/**
 * Ruta a la que navegar al tocar un aviso.
 *
 * Los avisos programados antes de esta versión llevan `route: "/"`; se tratan
 * igual que los nuevos (abrir la sesión de hoy) para que el arreglo funcione
 * sin esperar a que caduquen los siete días ya programados.
 */
export function rutaDelAviso(extra: unknown): string {
  if (extra && typeof extra === "object" && "route" in extra) {
    const route = (extra as { route?: unknown }).route;
    if (typeof route === "string" && route.startsWith("/") && route !== "/") {
      return route;
    }
  }
  return RUTA_RECORDATORIO;
}
