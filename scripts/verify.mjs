#!/usr/bin/env node
/**
 * FORTIXAM — `npm run verify`
 *
 * Las tres puertas de calidad del proyecto en un solo comando, en el mismo
 * orden en que las exige el circuito diario (docs/plan-mejora-diaria.md):
 *
 *   1. lint        -> `npm run lint` (ESLint sobre src/)
 *   2. test        -> `npm test -- --run` (Vitest, modo CI)
 *   3. build APK   -> `BUILD_MODE=apk npm run build` (export estático)
 *
 * Se detiene en la primera puerta en rojo y devuelve su código de salida, así
 * que sirve tanto para uso manual como para cualquier automatización.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DOORS = [
  { nombre: "lint (ESLint)", cmd: "npm", args: ["run", "lint"] },
  { nombre: "tests (Vitest)", cmd: "npm", args: ["test", "--", "--run"] },
  {
    nombre: "build APK (export estático)",
    cmd: "npm",
    args: ["run", "build"],
    env: { BUILD_MODE: "apk" },
  },
];

const seg = (ms) => `${(ms / 1000).toFixed(1)}s`;

function run(puerta) {
  const inicio = Date.now();
  const res = spawnSync(puerta.cmd, puerta.args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...(puerta.env || {}) },
    shell: false,
  });
  const code = res.status === null ? 1 : res.status;
  return { code, ms: Date.now() - inicio };
}

console.log("🔎 FORTIXAM verify — 3 puertas de calidad\n");

const tiempos = [];
for (let i = 0; i < DOORS.length; i++) {
  const puerta = DOORS[i];
  console.log(`[${i + 1}/${DOORS.length}] ${puerta.nombre}...`);
  const { code, ms } = run(puerta);
  if (code !== 0) {
    console.log(`\n❌ Puerta ${i + 1}/${DOORS.length} FALLÓ: ${puerta.nombre} (código ${code}, ${seg(ms)})`);
    console.log("   Nada se publica hasta que esta puerta esté en verde.");
    process.exit(code);
  }
  tiempos.push(seg(ms));
  console.log(`✅ ${puerta.nombre} OK (${seg(ms)})\n`);
}

console.log(`🎉 verify OK — ${DOORS.length}/${DOORS.length} puertas en verde (${tiempos.join(" · ")})`);
