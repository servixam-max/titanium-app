#!/usr/bin/env node
/**
 * Ajusta el campo `duration` de cada día a su duración real calculada.
 *
 * Así el cartel que ve el usuario ("35 MIN") coincide con lo que va a durar la
 * sesión de verdad, en vez de ser un número puesto a ojo. Los ejercicios
 * `optional` (remates) no cuentan.
 *
 * Uso: node scripts/ajustar-duraciones.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "lib", "data.ts");
const DRY = process.argv.includes("--dry");

/** Duración real de un bloque de día, según su tipo. */
function calcular(bloque) {
  const rounds = Number(bloque.match(/rounds:\s*(\d+)/)?.[1] ?? 0);
  const esHiit = rounds > 0;
  const principal = bloque.split("alternativeExercises")[0];

  const re = /name:\s*"([^"]+)"([\s\S]*?)(?=\n      \{|\n    \],)/g;
  let seg = 0;
  let n = 0;
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
    n++;
  }
  return { minutos: Math.round(seg / 60), ejercicios: n };
}

let src = readFileSync(DATA, "utf8");
const bloques = src.split(/(?=\n    day: \d+,)/g);

let cambios = 0;

const out = bloques.map((b) => {
  const day = b.match(/day: (\d+),/)?.[1];
  if (!day) return b;

  const { minutos } = calcular(b);
  if (!minutos) return b;

  // El Día 18 es el catálogo de ejercicios sueltos: no lleva duración.
  if (Number(day) === 18) return b;

  const actual = Number(b.match(/duration: "(\d+) MIN"/)?.[1] ?? 0);
  if (actual === minutos) return b;

  cambios++;
  console.log(`Día ${day}: ${actual} MIN -> ${minutos} MIN`);
  return b.replace(/duration: "\d+ MIN"/, `duration: "${minutos} MIN"`);
});

if (DRY) {
  console.log(`\n(${cambios} cambios, --dry: no se ha escrito nada)`);
} else {
  writeFileSync(DATA, out.join(""));
  console.log(`\n${cambios} duraciones ajustadas.`);
}
