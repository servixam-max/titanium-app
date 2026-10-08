#!/usr/bin/env node
/**
 * Corrige los descansos de los días HIIT/Tabata.
 *
 * Bug real: el subtítulo de estos días promete intervalos concretos
 * ("40s trabajo / 20s descanso", "20s/10s", "30s/20s") pero sus ejercicios
 * tenían descansos de fuerza (120 s, 90 s) porque el pase genérico de descansos
 * los trató como levantamiento. Al ejecutarse, la app respeta `restSeconds`, así
 * que el día no se parecía en nada a lo que anuncia.
 *
 * Aquí se alinean con lo que dice su propio subtítulo. Solo toca días que
 * declaran `rounds` (HIIT/Tabata).
 *
 * Uso: node scripts/corregir-hiit.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "lib", "data.ts");
const DRY = process.argv.includes("--dry");

/** Descanso que declara cada día HIIT en su subtítulo. */
const DESCANSOS = {
  4: 20,  // "40s trabajo / 20s descanso"
  9: 20,  // "40s trabajo / 20s descanso"
  13: 10, // "20s de máxima intensidad por 10s de descanso"
  15: 10, // "8 ejercicios a 20s/10s"
  17: 20, // "30s de trabajo por 20s de descanso"
};

let src = readFileSync(DATA, "utf8");
let total = 0;

for (const [dia, rest] of Object.entries(DESCANSOS)) {
  const ini = src.indexOf(`\n    day: ${dia},`);
  if (ini < 0) {
    console.log(`Día ${dia}: no encontrado`);
    continue;
  }
  const siguiente = src.indexOf(`\n    day: ${Number(dia) + 1},`, ini);
  const fin = siguiente > 0 ? siguiente : src.length;

  let bloque = src.slice(ini, fin);
  const antes = (bloque.match(/restSeconds:\s*\d+/g) || []).length;

  // Solo el bloque principal. Las alternativas de peso corporal del mismo día
  // también se ajustan: pertenecen a la misma sesión HIIT.
  bloque = bloque.replace(/restSeconds:\s*\d+/g, `restSeconds: ${rest}`);

  src = src.slice(0, ini) + bloque + src.slice(fin);
  total += antes;
  console.log(`Día ${dia}: ${antes} descansos -> ${rest}s`);
}

if (DRY) {
  console.log("\n(--dry: no se ha escrito nada)");
} else {
  writeFileSync(DATA, src);
  console.log(`\nEscrito. ${total} descansos ajustados.`);
}
