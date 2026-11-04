/**
 * «Ahora no» del aviso de actualización (F9.3)
 *
 * El diálogo se cerraba sin dejar rastro: a los 3 s del siguiente arranque
 * volvía a saltar, y al otro, aunque el usuario ya hubiera dicho que no con
 * toda la claridad del mundo. Aquí se decide cuánto dura ese «no».
 *
 * Reglas:
 * - Vale solo para la versión que se descartó: en cuanto aparece otra, se
 *   vuelve a avisar (puede traer algo que sí importe).
 * - Caduca al cambiar el día: al día siguiente se recuerda una vez más y,
 *   si se vuelve a descartar, el descarte vuelve a contar desde ese día.
 * - Nunca silencia la comprobación manual de Ajustes: eso lo decide quien
 *   llama, no este módulo.
 *
 * Sin React y sin depender del reloj global salvo por defecto, para poder
 * probar el cambio de día sin tocar el sistema.
 */

const STORAGE_KEY = "fortixam:update-dismissed";

export interface UpdateDismissal {
  /** Versión que se descartó, tal cual la anunció el canal OTA. */
  version: string;
  /** Día local del descarte en formato `YYYY-MM-DD`. */
  day: string;
}

/** Quita la «v» y los espacios: `v8.5.61` y `8.5.61` son la misma versión. */
function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, "");
}

/** Día local, no UTC: el «mañana» del usuario es su medianoche, no la de Londres. */
export function localDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * ¿Sigue vigente el «ahora no» para esta versión?
 *
 * Solo silencia el aviso automático si es la misma versión y se descartó hoy.
 * Cualquier otro caso (otra versión, otro día, sin datos) devuelve `false`:
 * ante la duda, se avisa.
 */
export function isUpdateDismissed(
  dismissal: UpdateDismissal | null | undefined,
  latestVersion: string,
  now: Date = new Date(),
): boolean {
  if (!dismissal) return false;
  if (normalizeVersion(dismissal.version) !== normalizeVersion(latestVersion)) return false;
  return dismissal.day === localDayKey(now);
}

/** Lee el descarte guardado; cualquier cosa rara se trata como «no hay». */
export function readUpdateDismissal(): UpdateDismissal | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UpdateDismissal> | null;
    if (!parsed || typeof parsed.version !== "string" || parsed.version.trim() === "") return null;
    if (typeof parsed.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.day)) return null;
    return { version: parsed.version, day: parsed.day };
  } catch {
    return null;
  }
}

/**
 * Guarda el descarte de hoy. Si el almacenamiento falla (modo privado, cuota),
 * el diálogo se cierra igual: recordar el «no» es una comodidad, no un
 * requisito para poder cerrar el aviso.
 */
export function rememberUpdateDismissal(
  version: string,
  now: Date = new Date(),
): UpdateDismissal {
  const dismissal: UpdateDismissal = { version, day: localDayKey(now) };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissal));
    } catch {
      /* sin almacenamiento: no se recuerda, pero no se rompe nada */
    }
  }
  return dismissal;
}

/** Atajo para el chequeo automático: ¿toca enseñar el aviso de esta versión? */
export function shouldShowUpdateNotice(
  latestVersion: string,
  now: Date = new Date(),
): boolean {
  return !isUpdateDismissed(readUpdateDismissal(), latestVersion, now);
}

/** Clave de almacenamiento, expuesta para las pruebas y la limpieza. */
export const UPDATE_DISMISSAL_KEY = STORAGE_KEY;
