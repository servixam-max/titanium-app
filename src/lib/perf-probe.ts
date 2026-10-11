/**
 * Sonda de rendimiento (mejora F4.4) — cuenta renderizados reales para poder
 * medir y vigilar los re-renderizados del entreno activo.
 *
 * Los componentes instrumentados avisan aquí en cada commit (hook
 * `useRenderProbe`); el contador solo acumula si alguien enciende la sonda
 * desde fuera de la app:
 *
 *   window.__FORTIXAM_PERF__ = true   // e2e (addInitScript) o CDP
 *
 * Sin sonda encendida el coste es una comparación booleana por render: en el
 * APK de producción nadie la enciende y los contadores quedan vacíos. Con ella
 * encendida, `window.__fxPerf` acumula `nombre del componente → nº renders`.
 */

declare global {
  interface Window {
    /** Interruptor de la sonda de rendimiento (F4.4). */
    __FORTIXAM_PERF__?: boolean;
    /** Contadores acumulados por componente cuando la sonda está encendida. */
    __fxPerf?: Record<string, number>;
  }
}

/** ¿Sonda encendida? (Fuera del navegador nunca lo está.) */
export function perfProbeEnabled(): boolean {
  return typeof window !== "undefined" && window.__FORTIXAM_PERF__ === true;
}

/** Suma 1 al contador del componente si la sonda está encendida. */
export function bumpRender(name: string): void {
  if (!perfProbeEnabled()) return;
  const counters = (window.__fxPerf ??= {});
  counters[name] = (counters[name] ?? 0) + 1;
}

/** Copia de los contadores actuales (e2e / depuración por CDP). */
export function readPerfCounters(): Record<string, number> {
  if (typeof window === "undefined") return {};
  return { ...(window.__fxPerf ?? {}) };
}
