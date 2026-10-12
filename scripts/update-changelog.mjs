#!/usr/bin/env node
/**
 * FORTIXAM — genera `ota_server/changelog.json` (F5.1).
 *
 * Las notas de las releases (Ajustes → Novedades, aviso de actualización) se
 * leen de la API de GitHub, que se limita por IP (60 peticiones/hora). Este
 * archivo publica las mismas entradas por el canal raw
 * (raw.githubusercontent.com, servido por CDN y sin ese límite) para que la
 * app tenga un respaldo cuando la API responda 403 o venga sin notas.
 *
 * Regeneración completa e idempotente a partir de los tags y el historial:
 *   - últimas MAX_VERSIONS versiones, más la versión pendiente de version.json
 *     si aún no tiene tag (el día de su publicación);
 *   - notas = asuntos de los commits del rango de cada versión, con los
 *     mismos filtros que usa la app: fuera `chore(release)` y merges,
 *     sin duplicados, máximo MAX_NOTES.
 *
 * Uso:
 *   node scripts/update-changelog.mjs          # escribe ota_server/changelog.json
 *   node scripts/update-changelog.mjs --dry    # imprime el JSON sin escribir
 *
 * Lo llama `scripts/daily-improve.sh` en cada publicación, antes del commit
 * de versión, para que el archivo viaje en ese mismo commit. No es puerta de
 * calidad: si falla, la release sale igual y se reintenta al día siguiente
 * (la generación es completa, así que se autocorrige).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "ota_server", "changelog.json");
const REPO = "servixam-max/titanium-app";
const MAX_VERSIONS = 12;
const MAX_NOTES = 8;
const TAG_RE = /^v(\d+\.\d+\.\d+)$/;

const dryRun = process.argv.includes("--dry");

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf-8" }).trim();
}

function parseVersion(version) {
  return String(version)
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
}

/** Comparador: negativo si `a` es más nueva que `b` (para ordenar nueva → vieja). */
function compareDesc(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
  }
  return 0;
}

/** Asuntos de commit del rango, con los mismos filtros y orden que usa la app
 * (la API de compare lista del más antiguo al más nuevo). */
function notesForRange(base, ref) {
  if (!base) return [];
  const out = git(["log", "--reverse", "--pretty=format:%s", `${base}..${ref}`])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((subject) => !/^chore\(release\)/i.test(subject) && !/^merge\b/i.test(subject));
  return Array.from(new Set(out)).slice(0, MAX_NOTES);
}

/** Fecha ISO (UTC) del commit al que apunta la referencia. */
function commitDate(ref) {
  const iso = git(["log", "-1", "--format=%cI", ref]);
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function main() {
  const current = String(
    JSON.parse(fs.readFileSync(path.join(ROOT, "version.json"), "utf-8")).version || "",
  ).trim();
  if (!current) throw new Error("version.json sin versión");

  const tagNames = git(["tag", "--list", "v*"])
    .split("\n")
    .map((tag) => tag.trim())
    .filter((tag) => TAG_RE.test(tag))
    .sort((a, b) => compareDesc(a.replace(/^v/, ""), b.replace(/^v/, "")));
  const tags = tagNames.map((tag) => tag.replace(/^v/, ""));

  // La versión de version.json que aún no tiene tag es la release en curso.
  const pendingRelease = tags.length === 0 || compareDesc(current, tags[0]) < 0;

  const queue = [];
  if (pendingRelease) queue.push({ version: current, ref: "HEAD", base: tagNames[0] ?? null });
  for (let i = 0; i < tags.length; i++) {
    queue.push({ version: tags[i], ref: tagNames[i], base: tagNames[i + 1] ?? null });
  }

  const warnings = [];
  const releases = queue.slice(0, MAX_VERSIONS).map(({ version, ref, base }, index) => {
    const notes = notesForRange(base, ref);
    if (notes.length === 0) {
      warnings.push(`v${version} sin notas (rango ${base ?? "sin base"}..${ref})`);
    }
    return {
      version,
      name: `FORTIXAM v${version}`,
      publishedAt: commitDate(ref),
      notes,
      url: `https://github.com/${REPO}/releases/tag/v${version}`,
    };
  });

  // Validación: sin esto, un archivo roto se publicaría tal cual.
  if (releases.length === 0) throw new Error("sin versiones que publicar");
  for (let i = 0; i < releases.length; i++) {
    const r = releases[i];
    if (!/^\d+\.\d+\.\d+$/.test(r.version)) throw new Error(`versión inválida: ${r.version}`);
    if (i > 0 && compareDesc(releases[i - 1].version, r.version) >= 0) {
      throw new Error(`orden roto entre v${releases[i - 1].version} y v${r.version}`);
    }
    if (!r.publishedAt) throw new Error(`sin fecha en v${r.version}`);
    if (r.notes.length > MAX_NOTES) throw new Error(`demasiadas notas en v${r.version}`);
  }
  // La versión en curso sin notas es una señal roja (sale un día con huecos);
  // las históricas solo se avisan: el historial no se puede reescribir.
  if (pendingRelease && releases[0] && releases[0].notes.length === 0) {
    throw new Error(`la versión pendiente v${releases[0].version} no tiene notas que publicar`);
  }
  for (const warning of warnings) console.warn(`WARN: ${warning}`);

  const payload = {
    generatedAt: new Date().toISOString(),
    repo: REPO,
    releases,
  };
  const json = JSON.stringify(payload, null, 2) + "\n";

  if (dryRun) {
    process.stdout.write(json);
    return;
  }

  fs.writeFileSync(OUTPUT, json);
  console.log(
    `OK: ota_server/changelog.json — ${releases.length} versiones (v${releases[0].version} … v${releases[releases.length - 1].version})`,
  );
}

try {
  main();
} catch (err) {
  console.error(`FAIL: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
