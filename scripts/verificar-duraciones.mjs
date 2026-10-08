#!/usr/bin/env node
/**
 * Comprueba que el campo `duration` de cada día coincide con la duración real
 * calculada desde los ejercicios, y que el subtítulo no miente.
 *
 * Dos formatos de sesión, porque no se calculan igual:
 *  - FUERZA: 45 s por serie + descansos entre series.
 *  - HIIT/Tabata (con `rounds`): todas las rondas × (trabajo + descanso) de
 *    cada ejercicio, que es como se ejecuta de verdad.
 *
 * Los ejercicios `optional` (remates) no cuentan para el tiempo.
 *
 * Uso: node scripts/verificar-duraciones.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "..", "src", "lib", "data.ts"), "utf8");

const bloques = src.split(/(?=\n    day: \d+,)/g).filter((b) => /day: \d+,/.test(b));

console.log("Día | tipo  | declarado | real | ej. | estado");
console.log("-".repeat(58));

let desajustes = 0;

for (const b of bloques) {
  const day = b.match(/day: (\d+),/)?.[1];
  if (!day) continue;

  const declarado = Number(b.match(/duration: "(\d+) MIN"/)?.[1] ?? 0);
  const rounds = Number(b.match(/rounds:\s*(\d+)/)?.[1] ?? 0);
  const esHiit = rounds > 0;

  // Solo el bloque principal (sin las alternativas de peso corporal).
  const principal = b.split("alternativeExercises")[0];

  // Cada ejercicio: sets/reps/restSeconds (+ workSeconds si lo hubiera).
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
      // Tabata/HIIT: cómo se ejecuta depende de cómo estén escritos los datos.
      //  - sets > 1 (Días 13/15): las series YA son los intervalos.
      //  - sets == 1 y rounds > 1 (Días 4/9/17): el ejercicio se repite en cada
      //    ronda, así que hay que multiplicar por `rounds`.
      const trabajoPorSerie = work > 0 ? work : 40;
      const repeticiones = sets > 1 ? sets : Math.max(1, rounds);
      seg += repeticiones * (trabajoPorSerie + rest);
    } else {
      seg += sets * 45 + Math.max(0, sets - 1) * rest;
    }
    n++;
  }

  const real = Math.round(seg / 60);
  const diff = Math.abs(real - declarado);
  const ok = diff <= 4;
  if (!ok) desajustes++;

  console.log(
    `${String(day).padStart(3)} | ${esHiit ? "HIIT " : "fuerza"} | ${String(declarado).padStart(9)} | ${String(real).padStart(4)} | ${String(n).padStart(3)} | ${ok ? "ok" : `⚠️ desajuste ${diff} min`}`,
  );
}

console.log("-".repeat(58));
console.log(desajustes ? `⚠️ ${desajustes} días con duración mal declarada` : "✅ Todas las duraciones cuadran");
