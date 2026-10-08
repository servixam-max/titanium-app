#!/usr/bin/env node
/**
 * Sincroniza los subtítulos con la duración real de cada día.
 *
 * Los subtítulos llevan la duración escrita a mano ("~35 min") y se quedaban
 * desfasados cuando cambiaba la sesión: el cartel decía una cosa y la sesión
 * duraba otra. Aquí se reescribe ese "~NN min" con el valor calculado.
 *
 * Uso: node scripts/ajustar-subtitulos.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "lib", "data.ts");
const DRY = process.argv.includes("--dry");

function calcular(bloque) {
  const rounds = Number(bloque.match(/rounds:\s*(\d+)/)?.[1] ?? 0);
  const esHiit = rounds > 0;
  const principal = bloque.split("alternativeExercises")[0];
  const re = /name:\s*"([^"]+)"([\s\S]*?)(?=\n      \{|\n    \],)/g;
  let seg = 0;
  let m;
  while ((m = re.exec(principal))) {
    const [, , cuerpo] = m;
    if (/optional: true/.test(cuerpo)) continue;
    const sets = Number(cuerpo.match(/sets:\s*(\d+)/)?.[1] ?? 1);
    const rest = Number(cuerpo.match(/restSeconds:\s*(\d+)/)?.[1] ?? 0);
    const work = Number(cuerpo.match(/workSeconds:\s*(\d+)/)?.[1] ?? 0);
    if (esHiit) {
      const trabajo = work > 0 ? work : 40;
      const reps = sets > 1 ? sets : Math.max(1, rounds);
      seg += reps * (trabajo + rest);
    } else {
      seg += sets * 45 + Math.max(0, sets - 1) * rest;
    }
  }
  return Math.round(seg / 60);
}

let src = readFileSync(DATA, "utf8");
const bloques = src.split(/(?=\n    day: \d+,)/g);
let cambios = 0;

const out = bloques.map((b) => {
  const day = b.match(/day: (\d+),/)?.[1];
  if (!day || Number(day) === 18) return b;

  const minutos = calcular(b);
  if (!minutos) return b;

  // El subtítulo va justo tras el título, en las primeras líneas del bloque.
  const antes = b.match(/~(\d+) min/)?.[1];
  if (antes === undefined) return b;
  if (Number(antes) === minutos) return b;

  cambios++;
  console.log(`Día ${day}: subtítulo ~${antes} min -> ~${minutos} min`);
  return b.replace(/~(\d+) min/, `~${minutos} min`);
});

if (DRY) {
  console.log(`\n(${cambios} cambios, --dry)`);
} else {
  writeFileSync(DATA, out.join(""));
  console.log(`\n${cambios} subtítulos ajustados.`);
}
