#!/usr/bin/env node
/**
 * Aplica los descansos recomendados a TODO el catálogo de ejercicios.
 *
 * Lee `src/lib/data.ts`, calcula el descanso que corresponde a cada ejercicio
 * según su nombre (con `descansoRecomendado`) y reescribe el `restSeconds`.
 *
 * Es idempotente: volver a ejecutarlo no cambia nada si ya está aplicado.
 *
 * Uso:  node scripts/aplicar-descansos.mjs [--dry]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "lib", "data.ts");
const DRY = process.argv.includes("--dry");

// Mismas reglas que src/lib/rest-guide.ts (se duplican aquí para poder ejecutar
// el script con node sin compilar TypeScript).
const REGLAS = [
  {
    cat: "metabolico",
    re: /salto|jump|pliométric|pliometric|plyo|burpee|thruster|devil|man maker|snatch|clean|swing|high knee|rodilla|mountain climber|escalador|skater|patinador|jumping jack|boxeo|shadow|tabata|sprint/i,
    s: 30,
  },
  {
    cat: "pierna-pesada",
    re: /sentadilla|squat|peso muerto|deadlift|hip thrust|puente de glúteo|glute bridge|búlgara|bulgarian|zancada|lunge|cossack|cosaca|step up|paso al cajón|sumo|goblet|pistol/i,
    s: 120,
  },
  {
    cat: "multiarticular",
    re: /press (de )?banca|bench press|floor press|press inclinado|incline|press militar|military|press arnold|arnold|push press|remo|row|dominada|pull.?up|jalón|lat pulldown|fondos|dip|flexiones|push.?up|pike/i,
    s: 90,
  },
  {
    cat: "isometrico",
    re: /plancha|plank|hollow|wall sit|isométric|isometric|hold|sostén|estátic|estatic/i,
    s: 60,
  },
  {
    cat: "core",
    re: /crunch|abdominal|bicicleta|bicycle|russian|giro|leñador|woodchop|elevación de piernas|leg raise/i,
    s: 60,
  },
  {
    cat: "aislamiento",
    re: /curl|extensión|extension|tríceps|triceps|patada|kickback|elevación|elevacion|lateral|pájaro|pajaro|reverse fly|apertura|fly|flye|shrug|encogimiento|gemelo|calf|antebrazo|forearm|farmer|granjero/i,
    s: 60,
  },
  {
    cat: "movilidad",
    re: /movilidad|rotación|rotacion|estiramiento|stretch|respiración|respiracion|relajación|relajacion|calentamiento|warm.?up|activación|activacion/i,
    s: 30,
  },
];

function descanso(nombre) {
  for (const r of REGLAS) if (r.re.test(nombre)) return { s: r.s, cat: r.cat };
  return { s: 75, cat: "general" };
}

const src = readFileSync(DATA, "utf8");

// Cada bloque de ejercicio: name: "...", ... restSeconds: N
const RE = /(name:\s*"([^"]+)"[\s\S]*?restSeconds:\s*)(\d+)/g;

let cambios = 0;
let iguales = 0;
const porCategoria = new Map();

const out = src.replace(RE, (m, pre, nombre, actual) => {
  const { s, cat } = descanso(nombre);
  porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + 1);
  if (Number(actual) === s) {
    iguales++;
    return m;
  }
  cambios++;
  return `${pre}${s}`;
});

console.log(`Ejercicios revisados: ${cambios + iguales}`);
console.log(`  descanso cambiado: ${cambios}`);
console.log(`  ya correcto:       ${iguales}`);
console.log("\nReparto por tipo:");
[...porCategoria.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, n]) => console.log(`  ${cat.padEnd(16)} ${n}`));

if (DRY) {
  console.log("\n(--dry: no se ha escrito nada)");
} else {
  writeFileSync(DATA, out);
  console.log(`\nEscrito: ${DATA}`);
}
