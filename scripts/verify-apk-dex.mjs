#!/usr/bin/env node
/**
 * FORTIXAM — `npm run verify:apk` (F10.3)
 *
 * La CI solo comprobaba que el APK existía. Este script abre el APK que se va
 * a publicar, saca sus `classes*.dex` y los desensambla con `dexdump` para
 * mirar el bytecode de `Plugin.getPermissionStates()`: si vuelve a estar
 * compilado como `throw null`, la publicación falla.
 *
 * Uso:
 *   node scripts/verify-apk-dex.mjs [ruta/al/Apk.apk]
 *
 * Sin argumento usa el APK de release de Gradle. Requiere el SDK de Android
 * (`dexdump` vive en `build-tools/<versión>/`); se puede forzar la ruta con
 * la variable DEXDUMP. Códigos de salida: 0 sano · 1 defecto · 2 no se pudo
 * verificar.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditarDexDump, METODO_VIGILADO } from "./lib/apk-dex.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const APK_POR_DEFECTO = path.join(
  ROOT,
  "android/app/build/outputs/apk/release/app-release.apk",
);

const apk = path.resolve(process.argv[2] ? process.argv[2] : APK_POR_DEFECTO);

function fallar(mensaje) {
  console.error(`\n❌ ${mensaje}`);
  process.exit(2);
}

if (!fs.existsSync(apk)) {
  fallar(`no existe el APK: ${apk}\n   Compílalo antes: BUILD_MODE=apk npm run build`);
}

const tamano = fs.statSync(apk).size;

/** Busca `dexdump` en las build-tools del SDK, de la versión más nueva a la más vieja. */
function localizarDexdump() {
  const candidatos = [];
  if (process.env.DEXDUMP) candidatos.push(process.env.DEXDUMP);

  const raices = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library/Android/sdk"),
    "/usr/local/lib/android/sdk",
    "/opt/android-sdk",
  ].filter(Boolean);

  for (const raiz of raices) {
    const buildTools = path.join(raiz, "build-tools");
    if (!fs.existsSync(buildTools)) continue;
    const versiones = fs
      .readdirSync(buildTools)
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
      .sort((a, b) => {
        const [a1, a2, a3] = a.split(".").map(Number);
        const [b1, b2, b3] = b.split(".").map(Number);
        return b1 - a1 || b2 - a2 || b3 - a3;
      });
    for (const v of versiones) candidatos.push(path.join(buildTools, v, "dexdump"));
  }
  return candidatos.find((c) => fs.existsSync(c)) ?? null;
}

const dexdump = localizarDexdump();
if (!dexdump) {
  fallar(
    "no encuentro `dexdump` en el SDK de Android.\n" +
      "   Instala build-tools o indica la ruta: DEXDUMP=/ruta/a/dexdump node scripts/verify-apk-dex.mjs",
  );
}

const trabajo = fs.mkdtempSync(path.join(os.tmpdir(), "fortixam-dex-"));
let salida = 0;

try {
  const extraer = spawnSync("unzip", ["-o", "-q", apk, "classes*.dex", "-d", trabajo], {
    encoding: "utf8",
  });
  if (extraer.status !== 0) {
    fallar(
      `no se pudo extraer classes.dex del APK (${extraer.status}): ${(extraer.stderr || "").trim()}`,
    );
  }

  const dexes = fs
    .readdirSync(trabajo)
    .filter((f) => /^classes\d*\.dex$/.test(f))
    .sort();
  if (dexes.length === 0) fallar("el APK no contiene ningún classes.dex");

  console.log(`🔎 FORTIXAM verify:apk — ${path.basename(apk)} (${(tamano / 1048576).toFixed(1)} MB)`);
  console.log(`   dexdump: ${dexdump}`);

  const hallazgos = [];
  for (const dex of dexes) {
    const ruta = path.join(trabajo, dex);
    const volcado = spawnSync(dexdump, ["-d", ruta], {
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
    });
    if (volcado.status !== 0) {
      fallar(`dexdump falló con ${dex} (código ${volcado.status}): ${(volcado.stderr || "").trim()}`);
    }
    const resultado = auditarDexDump(volcado.stdout);
    hallazgos.push({ dex, ...resultado });
  }

  const conMetodo = hallazgos.filter((h) => h.metodo);
  if (conMetodo.length === 0) {
    fallar(
      `el APK no trae ${METODO_VIGILADO}() en ningún DEX: la comprobación no puede dar fe de nada`,
    );
  }

  const errores = conMetodo.flatMap((h) => h.errores);
  const avisos = conMetodo.flatMap((h) => h.avisos);
  for (const h of conMetodo) {
    const m = h.metodo;
    console.log(
      `   ${h.dex}: ${m.clase}.${METODO_VIGILADO}() — ${m.instrucciones.length} instrucciones`,
    );
  }
  for (const aviso of avisos) console.log(`   ⚠️  ${aviso}`);

  if (errores.length > 0) {
    for (const error of errores) console.error(`   ❌ ${error}`);
    console.error(
      "\n❌ El APK no se puede publicar: `getPermissionStates()` quedaría roto en el móvil." +
        "\n   Revisa android/app/proguard-rules.pro (F10.1) y vuelve a compilar.",
    );
    salida = 1;
  } else {
    console.log("✅ El DEX resuelve los permisos de verdad: no hay ningún `throw null`.");
  }
} finally {
  fs.rmSync(trabajo, { recursive: true, force: true });
}

process.exit(salida);
