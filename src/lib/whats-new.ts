import { logger } from "./logger";
import { APP_VERSION } from "./ota-sync";

/**
 * Aviso de novedades tras actualizar (F1.2).
 *
 * Guarda en localStorage la última versión cuyas novedades ha visto el usuario.
 * Cuando la app arranca con una versión instalada más nueva que esa, se muestra
 * una pantalla corta de bienvenida y queda un punto de aviso en Ajustes hasta
 * que se leen. En una instalación nueva no se avisa de nada: no hay nada "nuevo"
 * que contar todavía.
 */

export const LAST_SEEN_KEY = "fortixam_last_seen_version";
/** Evento que avisa a la interfaz de que el aviso ya se ha leído. */
export const WHATS_NEW_SEEN_EVENT = "fortixam-whats-new-seen";

/**
 * Claves que dejan las versiones anteriores: si están, la app ya se usó antes.
 *
 * Solo cuentan claves que escribe una acción del usuario (iniciar sesión,
 * abrir Ajustes...). `titanium-storage` y `fortixam-theme` se escriben solas al
 * arrancar, así que no sirven para distinguir una instalación nueva.
 */
const HISTORY_KEYS = [
  "fortixam_active_user_id",
  "fortixam_access_token",
  "fortixam_server_user",
  "fortixam_user_accounts",
  "fortixam_changelog_v1",
];

/** "v8.5.17" -> "8.5.17" */
export function normalizeVersion(version: string | null | undefined): string {
  return String(version ?? "")
    .replace(/^[vV]/, "")
    .trim();
}

/** Compara dos versiones por número (8.5.10 va después de 8.5.9). */
export function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a)
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  const pb = normalizeVersion(b)
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Última versión cuyas novedades vio el usuario (null si nunca se apuntó). */
export function getLastSeenVersion(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = normalizeVersion(localStorage.getItem(LAST_SEEN_KEY));
    return raw || null;
  } catch (err) {
    logger.warn("Whats-new read error:", err);
    return null;
  }
}

export function setLastSeenVersion(version: string): void {
  if (typeof localStorage === "undefined") return;
  const clean = normalizeVersion(version);
  if (!clean) return;
  try {
    localStorage.setItem(LAST_SEEN_KEY, clean);
  } catch (err) {
    logger.warn("Whats-new write error:", err);
  }
}

/** ¿La app ya se había abierto antes en este dispositivo? */
export function hasAppHistory(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return HISTORY_KEYS.some((key) => localStorage.getItem(key) !== null);
  } catch {
    return false;
  }
}

/** ¿La versión instalada es más nueva que la última leída? (punto de aviso) */
export function hasUnseenNews(current: string = APP_VERSION.version): boolean {
  const clean = normalizeVersion(current);
  if (!clean) return false;
  const lastSeen = getLastSeenVersion();
  if (!lastSeen) {
    // Antes de este aviso no se apuntaba nada: si la app ya se usaba, hay
    // novedades pendientes de leer (las de la versión instalada).
    return hasAppHistory();
  }
  return compareVersions(clean, lastSeen) > 0;
}

/**
 * Apunte inicial, al arrancar la app: si es una instalación nueva se apunta la
 * versión sin molestar (no hay nada "nuevo" que contar y la bienvenida la da el
 * Onboarding). Si ya había datos de uso -versiones anteriores a este aviso-, no
 * se apunta nada para que las novedades se muestren una vez.
 */
export function initWhatsNewTracking(current: string = APP_VERSION.version): void {
  const clean = normalizeVersion(current);
  if (!clean) return;
  if (getLastSeenVersion()) return;
  if (hasAppHistory()) return;
  setLastSeenVersion(clean);
}

/**
 * ¿Toca mostrar la pantalla de bienvenida?
 *
 * - Veníamos de una versión anterior (o de antes de tener el aviso): sí.
 * - Ya se leyeron las de esta versión: no.
 * - Instalación nueva sin apunte previo: no (no hay nada nuevo que contar).
 */
export function shouldShowWhatsNew(current: string = APP_VERSION.version): boolean {
  const clean = normalizeVersion(current);
  if (!clean) return false;
  const lastSeen = getLastSeenVersion();
  if (!lastSeen) return hasAppHistory();
  const diff = compareVersions(clean, lastSeen);
  if (diff > 0) return true;
  // Versión más antigua (reinstalación de un APK viejo): nada nuevo que contar.
  if (diff < 0) setLastSeenVersion(clean);
  return false;
}

/** Marca la versión instalada como leída y avisa a la interfaz. */
export function markCurrentVersionSeen(current: string = APP_VERSION.version): void {
  setLastSeenVersion(current);
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(WHATS_NEW_SEEN_EVENT));
  } catch (err) {
    logger.warn("Whats-new event error:", err);
  }
}
