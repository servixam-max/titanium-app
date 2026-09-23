import { logger } from "./logger";
import { APP_VERSION } from "./ota-sync";

/**
 * Novedades dentro de la app (F1.1).
 *
 * Lee la lista de releases publicadas desde la API pública de GitHub —la misma
 * que ya usa `ota-sync.ts` para detectar actualizaciones— y la deja lista para
 * pintarla en Ajustes → "Novedades", marcando la versión instalada.
 *
 * La app es offline-first: si GitHub no responde se devuelve la última copia
 * guardada en localStorage (el usuario sigue viendo las novedades que leyó el
 * último día con conexión).
 */

const REPO = "servixam-max/titanium-app";
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=12`;
const GITHUB_COMPARE_URL = `https://api.github.com/repos/${REPO}/compare`;

const CACHE_KEY = "fortixam_changelog_v1";
/** Las novedades cambian como mucho una vez al día: 6 h de caché es de sobra. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 6000;
/** Tope de consultas de comparación por carga (cuida el límite de la API). */
const MAX_COMPARE_REQUESTS = 4;

/** Máximo de cambios que se guardan por versión (las notas largas se recortan). */
export const MAX_NOTES_PER_RELEASE = 8;
/** Cambios que se listan en la tarjeta antes de resumir con "+N". */
export const NOTES_PREVIEW = 5;

export interface ChangelogEntry {
  /** Versión sin la "v", p. ej. "8.5.14". */
  version: string;
  /** Título de la release, p. ej. "FORTIXAM v8.5.14". */
  name: string;
  /** Fecha ISO de publicación. */
  publishedAt: string;
  /** Cambios legibles, sin markdown ni enlaces. */
  notes: string[];
  /** Enlace a la release en GitHub. */
  url: string;
}

interface CachedChangelog {
  savedAt: number;
  entries: ChangelogEntry[];
}

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

/** Limpia markdown de una línea de notas y descarta enlaces sueltos. */
function cleanInline(text: string): string {
  let out = text
    // [texto](url) -> texto
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // GitHub genera "* Título by @autor in https://..." -> nos quedamos con el título
    .replace(/\s+by\s+@[\w-]+\s+in\s+https?:\/\/\S+$/i, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`>]/g, "")
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  // Quita puntuación sobrante al final ("- algo:" / "- algo,")
  out = out.replace(/[\s;,·]+$/g, "").trim();
  return out;
}

/**
 * Convierte el cuerpo de una release (markdown) en una lista de cambios.
 * Devuelve [] cuando el cuerpo no aporta nada (p. ej. solo el enlace
 * automático "**Full Changelog**: https://...compare/...").
 */
export function parseReleaseNotes(body: string | null | undefined): string[] {
  if (!body) return [];
  const notes: string[] = [];
  for (const rawLine of String(body).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // "**Full Changelog**: <url>" — ruido automático de GitHub
    if (/^\*{0,2}full changelog\*{0,2}\s*:/i.test(line)) continue;
    if (/^#{1,6}\s/.test(line)) continue;
    if (/^<!--/.test(line)) continue;
    if (/^-{3,}$/.test(line)) continue;
    if (/^\|/.test(line)) continue; // tablas de markdown

    const bullet = line.match(/^[-*+]\s+(.+)$/);
    const candidate = bullet ? bullet[1] : line;
    const text = cleanInline(candidate);
    if (!text) continue;
    if (/^https?$/i.test(text)) continue;
    notes.push(text);
    if (notes.length >= MAX_NOTES_PER_RELEASE) break;
  }
  // Sin duplicados, conservando el orden
  return Array.from(new Set(notes));
}

/** Fecha corta en español: "22 sept 2026". */
export function formatReleaseDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = MONTHS_ES[date.getUTCMonth()];
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

/** ¿Esta versión de la lista es la que tiene instalada el usuario? */
export function isInstalledVersion(
  version: string | null | undefined,
  current: string = APP_VERSION.version,
): boolean {
  const clean = (v: string | null | undefined) =>
    String(v ?? "")
      .replace(/^[vV]/, "")
      .trim();
  if (!clean(version)) return false;
  return clean(version) === clean(current);
}

function mapRelease(raw: unknown): ChangelogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const tag = String(r.tag_name ?? "").replace(/^v/, "").trim();
  if (!tag || r.draft === true || r.prerelease === true) return null;
  return {
    version: tag,
    name: String(r.name ?? `FORTIXAM v${tag}`).trim() || `FORTIXAM v${tag}`,
    publishedAt: String(r.published_at ?? r.created_at ?? ""),
    notes: parseReleaseNotes(typeof r.body === "string" ? r.body : ""),
    url: typeof r.html_url === "string" && r.html_url ? r.html_url : `https://github.com/${REPO}/releases/tag/v${tag}`,
  };
}

/**
 * Cambios de una versión a partir de los mensajes de commit.
 *
 * Hoy las releases del proyecto las crea GitHub con notas automáticas, así que
 * el cuerpo viene vacío. Los mensajes de commit sí describen el cambio real, así
 * que se usan como respaldo para que "Novedades" nunca salga en blanco.
 * Se descartan los commits de release ("chore(release): ...").
 */
export function parseCommits(commits: unknown): string[] {
  if (!Array.isArray(commits)) return [];
  const notes: string[] = [];
  for (const raw of commits) {
    if (!raw || typeof raw !== "object") continue;
    const commit = (raw as Record<string, unknown>).commit;
    if (!commit || typeof commit !== "object") continue;
    const message = (commit as Record<string, unknown>).message;
    const subject = String(message ?? "")
      .split(/\r?\n/)[0]
      .trim();
    if (!subject) continue;
    if (/^chore\(release\)/i.test(subject)) continue;
    if (/^merge\b/i.test(subject)) continue;
    const text = cleanInline(subject);
    if (!text) continue;
    notes.push(text);
    if (notes.length >= MAX_NOTES_PER_RELEASE) break;
  }
  return Array.from(new Set(notes));
}

async function fetchCompareNotes(
  fromVersion: string,
  toVersion: string,
  signal: AbortSignal,
): Promise<string[]> {
  const res = await fetch(`${GITHUB_COMPARE_URL}/v${fromVersion}...v${toVersion}`, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { commits?: unknown };
  return parseCommits(data.commits);
}

/**
 * Rellena con los commits las versiones que no traen notas propias.
 * La versión más antigua de la tanda no tiene con qué compararse en el lote,
 * así que se compara con el tag inmediatamente anterior.
 */
async function fillNotesFromCommits(
  entries: ChangelogEntry[],
  signal: AbortSignal,
): Promise<ChangelogEntry[]> {
  const pending = entries.filter((e) => e.notes.length === 0);
  if (pending.length === 0) return entries;

  const filled = new Map<string, string[]>();
  const budget = pending.slice(0, MAX_COMPARE_REQUESTS);

  await Promise.all(
    budget.map(async (entry) => {
      const index = entries.indexOf(entry);
      const older = entries[index + 1];
      const from = older?.version ?? bumpDown(entry.version);
      if (!from) return;
      try {
        const notes = await fetchCompareNotes(from, entry.version, signal);
        if (notes.length > 0) filled.set(entry.version, notes);
      } catch (err) {
        logger.warn("Changelog compare error:", err);
      }
    }),
  );

  return entries.map((entry) => {
    const notes = filled.get(entry.version);
    return notes ? { ...entry, notes } : entry;
  });
}

/** Versión anterior aproximada (8.5.13 -> 8.5.12) para comparar con el tag previo. */
function bumpDown(version: string): string | null {
  const parts = version.split(".");
  const patch = parseInt(parts[parts.length - 1] ?? "", 10);
  if (!Number.isFinite(patch) || patch <= 0) return null;
  parts[parts.length - 1] = String(patch - 1);
  return parts.join(".");
}

/** Normaliza la respuesta de la API y deja las versiones ordenadas (nueva → vieja). */
export function mapReleases(payload: unknown): ChangelogEntry[] {
  if (!Array.isArray(payload)) return [];
  const entries = payload
    .map(mapRelease)
    .filter((e): e is ChangelogEntry => e !== null);
  return entries.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
}

export function getCachedChangelog(): ChangelogEntry[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChangelog;
    if (!parsed || !Array.isArray(parsed.entries) || parsed.entries.length === 0) return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.entries;
  } catch (err) {
    logger.warn("Changelog cache read error:", err);
    return null;
  }
}

function saveChangelog(entries: ChangelogEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: CachedChangelog = { savedAt: Date.now(), entries };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    logger.warn("Changelog cache write error:", err);
  }
}

/**
 * Novedades de las últimas versiones publicadas.
 * Usa la caché si está fresca; con `force` siempre consulta a GitHub.
 */
export async function fetchChangelog(
  options: { force?: boolean } = {},
): Promise<{ entries: ChangelogEntry[]; cached: boolean }> {
  if (!options.force) {
    const cached = getCachedChangelog();
    if (cached) return { entries: cached, cached: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
    let entries = mapReleases(await res.json());
    if (entries.length === 0) {
      throw new Error("Todavía no hay versiones publicadas con notas.");
    }
    // Las releases sin notas propias se rellenan con los commits del rango.
    entries = await fillNotesFromCommits(entries, controller.signal);
    saveChangelog(entries);
    return { entries, cached: false };
  } catch (err) {
    // Sin conexión pero con copia previa: mejor algo viejo que nada
    const stale = getStaleCache();
    if (stale) return { entries: stale, cached: true };
    throw err instanceof Error
      ? err
      : new Error("No se pudieron cargar las novedades.");
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Copia ignorando el TTL, solo como red de seguridad si GitHub no responde. */
function getStaleCache(): ChangelogEntry[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChangelog;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    return parsed.entries.length > 0 ? parsed.entries : null;
  } catch {
    return null;
  }
}
