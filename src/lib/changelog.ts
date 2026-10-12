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
 *
 * Desde F5.1 hay un segundo canal: `ota_server/changelog.json` servido por el
 * CDN raw de GitHub, que no tiene el límite por IP de la API. Si la API
 * responde 403 (límite agotado) o deja versiones sin notas, esas notas se
 * completan desde el canal raw en vez de rendirse.
 */

const REPO = "servixam-max/titanium-app";
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=12`;
const GITHUB_COMPARE_URL = `https://api.github.com/repos/${REPO}/compare`;
/**
 * Canal raw de las novedades: mismo contenido que la API, servido por el CDN
 * de GitHub y sin el límite de peticiones por IP. Lo regenera
 * `scripts/update-changelog.mjs` en cada publicación.
 */
const GITHUB_RAW_CHANGELOG_URL = `https://raw.githubusercontent.com/${REPO}/main/ota_server/changelog.json`;

const CACHE_KEY = "fortixam_changelog_v1";
/** Las novedades cambian como mucho una vez al día: 6 h de caché es de sobra. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 6000;
/** El CDN raw responde rápido; si no contesta en este margen, no vale esperar. */
const RAW_REQUEST_TIMEOUT_MS = 4000;
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

/** "v8.5.23" -> "8.5.23" (comparaciones y claves de versión). */
function cleanVersion(version: string | null | undefined): string {
  return String(version ?? "")
    .replace(/^[vV]/, "")
    .trim();
}

/** ¿Dos textos se refieren a la misma versión? ("v8.5.23" == "8.5.23") */
export function sameVersion(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ca = cleanVersion(a);
  const cb = cleanVersion(b);
  if (!ca || !cb) return false;
  return ca === cb;
}

/** ¿Esta versión de la lista es la que tiene instalada el usuario? */
export function isInstalledVersion(
  version: string | null | undefined,
  current: string = APP_VERSION.version,
): boolean {
  return sameVersion(version, current);
}

/** Busca en la lista la entrada de una versión concreta. */
export function findEntryByVersion(
  entries: ChangelogEntry[],
  version: string | null | undefined,
): ChangelogEntry | undefined {
  if (!version) return undefined;
  return entries.find((e) => sameVersion(e.version, version));
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

/** Deja las versiones ordenadas (nueva → vieja por fecha de publicación). */
function sortByNewest(entries: ChangelogEntry[]): ChangelogEntry[] {
  return entries.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
}

/** Normaliza la respuesta de la API y deja las versiones ordenadas (nueva → vieja). */
export function mapReleases(payload: unknown): ChangelogEntry[] {
  if (!Array.isArray(payload)) return [];
  const entries = payload
    .map(mapRelease)
    .filter((e): e is ChangelogEntry => e !== null);
  return sortByNewest(entries);
}

/**
 * Normaliza la lista del canal raw (`ota_server/changelog.json`): acepta la
 * envoltura `{ releases: [...] }` que genera el script o una lista suelta, y
 * deja las entradas con la misma forma que las de la API.
 */
export function mapRawChangelog(payload: unknown): ChangelogEntry[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).releases)
      ? ((payload as Record<string, unknown>).releases as unknown[])
      : [];
  const entries: ChangelogEntry[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const version = cleanVersion(typeof r.version === "string" ? r.version : "");
    if (!version) continue;
    const notes = Array.isArray(r.notes)
      ? Array.from(
          new Set(
            r.notes
              .map((note) => cleanInline(String(note ?? "")))
              .filter((note) => note.length > 0),
          ),
        ).slice(0, MAX_NOTES_PER_RELEASE)
      : [];
    entries.push({
      version,
      name: String(r.name ?? `FORTIXAM v${version}`).trim() || `FORTIXAM v${version}`,
      publishedAt: String(r.publishedAt ?? r.published_at ?? ""),
      notes,
      url:
        typeof r.url === "string" && r.url
          ? r.url
          : `https://github.com/${REPO}/releases/tag/v${version}`,
    });
  }
  return sortByNewest(entries);
}

/**
 * Fusiona la lista de la API con la del canal raw: manda la primera, pero las
 * entradas sin notas se rellenan desde el respaldo y las versiones que solo
 * existan en él se añaden (p. ej. una release recién publicada que la API aún
 * no lista, o la API limitada sirviendo la lista entera).
 */
export function mergeChangelog(
  primary: ChangelogEntry[],
  fallback: ChangelogEntry[],
): ChangelogEntry[] {
  if (fallback.length === 0) return primary;
  if (primary.length === 0) return fallback;
  const rawByVersion = new Map(fallback.map((e) => [cleanVersion(e.version), e]));
  const merged = primary.map((entry) => {
    if (entry.notes.length > 0) return entry;
    const raw = rawByVersion.get(cleanVersion(entry.version));
    return raw && raw.notes.length > 0 ? { ...entry, notes: raw.notes } : entry;
  });
  const known = new Set(primary.map((e) => cleanVersion(e.version)));
  for (const entry of fallback) {
    if (!known.has(cleanVersion(entry.version))) merged.push(entry);
  }
  return sortByNewest(merged);
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

/** Lee la lista del canal raw. Devuelve [] si el archivo no está o no responde. */
async function fetchRawChangelog(): Promise<ChangelogEntry[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RAW_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GITHUB_RAW_CHANGELOG_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return mapRawChangelog(await res.json());
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Novedades de las últimas versiones publicadas.
 * Usa la caché si está fresca; con `force` siempre consulta a GitHub.
 * Si la API falla o deja versiones sin notas (límite por IP), completa con el
 * canal raw antes de rendirse.
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
    let apiEntries: ChangelogEntry[] = [];
    let apiError: unknown = null;
    try {
      const res = await fetch(GITHUB_RELEASES_URL, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/vnd.github.v3+json" },
      });
      if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
      apiEntries = mapReleases(await res.json());
    } catch (err) {
      apiError = err;
      logger.warn("Changelog API error:", err);
    }

    // Las releases sin notas propias se rellenan con los commits del rango.
    if (apiEntries.length > 0) {
      apiEntries = await fillNotesFromCommits(apiEntries, controller.signal);
    }

    // Canal raw: cubre las notas que falten y, con la API caída, sirve la
    // lista entera (la API pública se limita por IP; el CDN raw no).
    let entries = apiEntries;
    if (entries.length === 0 || entries.some((entry) => entry.notes.length === 0)) {
      const rawEntries = await fetchRawChangelog().catch((err) => {
        logger.warn("Changelog raw error:", err);
        return [] as ChangelogEntry[];
      });
      entries = mergeChangelog(entries, rawEntries);
    }

    if (entries.length === 0) {
      throw apiError ?? new Error("Todavía no hay versiones publicadas con notas.");
    }
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
