/**
 * Temporizador de descanso (F2.2) — utilidades puras.
 *
 * El descanso del modo individual dejó de tapar la pantalla completa: ahora es
 * una tarjeta flotante sobre los controles. Aquí vive lo que se puede probar
 * sin componentes: el formato del reloj, el aviso del último tramo y la
 * fracción restante del anillo de progreso.
 */

/** Reloj compacto "m:ss": 75 → "1:15", 8 → "0:08". */
export function formatRestClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Último tramo del descanso (≤ 10 s): el reloj se pone en aviso. */
export function isRestUrgent(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 10;
}

/** Fracción restante (0..1) para el anillo de progreso del descanso. */
export function restRemainingFraction(seconds: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(1, seconds / total));
}
