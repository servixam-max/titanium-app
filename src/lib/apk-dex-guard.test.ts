import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditarDexDump,
  buscarThrowNulo,
  extraerMetodos,
  METODO_VIGILADO,
  MIN_INSTRUCCIONES,
} from "../../scripts/lib/apk-dex.mjs";

/**
 * F10.3 — la CI mira el APK que publica.
 *
 * El defecto de F10.1 (R8 borra las anotaciones de Capacitor y
 * `getPermissionStates()` acaba en `throw null`) llegó a tres versiones
 * publicadas porque ninguna puerta abría el binario. `scripts/verify-apk-dex.mjs`
 * desensambla el DEX con `dexdump` y estas pruebas fijan su criterio con los
 * volcados reales de un APK roto (v8.5.61) y de uno sano (v8.5.63).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Cabecera + cuerpo tal y como los imprime `dexdump -d`. */
function volcado(clase: string, instrucciones: string[], nombre = METODO_VIGILADO): string {
  const lineas = instrucciones.map((texto, i) => {
    const offset = (0x10 + i).toString(16).padStart(4, "0");
    return `0881fc: 0000                                   |${offset}: ${texto}`;
  });
  return [
    `    #14              : (in L${clase.replace(/\./g, "/")};)`,
    `      name          : '${nombre}'`,
    "      type          : '()Ljava/util/Map;'",
    "      access        : 0x0001 (PUBLIC)",
    `      insns size    : ${instrucciones.length * 2} 16-bit code units`,
    `0881fc:                                        |[0881fc] ${clase}.${nombre}:()Ljava/util/Map;`,
    ...lineas,
    "      catches       : (none)",
    "      positions     :",
    "        0x0000 line=1",
    "",
    `    #15              : (in L${clase.replace(/\./g, "/")};)`,
    "      name          : 'otroMetodo'",
    "      type          : '()V'",
    "      insns size    : 0 16-bit code units",
    "",
  ].join("\n");
}

/** El cuerpo exacto que R8 emitió en el APK v8.5.61 (medido en su classes.dex). */
const CUERPO_ROTO = [
  "iget-object v0, v1, Lcom/getcapacitor/D;.bridge:Lcom/getcapacitor/f;",
  "invoke-virtual {v0}, Ljava/lang/Object;.getClass:()Ljava/lang/Class;",
  "new-instance v0, Ljava/util/HashMap;",
  "invoke-direct {v0}, Ljava/util/HashMap;.<init>:()V",
  "invoke-virtual {v1}, Lcom/getcapacitor/D;.getPluginHandle:()Lcom/getcapacitor/G;",
  "move-result-object v0",
  "invoke-virtual {v0}, Ljava/lang/Object;.getClass:()Ljava/lang/Class;",
  "const/4 v0, #int 0 // #0",
  "throw v0",
];

/** Extracto del cuerpo sano de v8.5.63: consulta las anotaciones de verdad. */
const CUERPO_SANO = [
  "move-object/from16 v0, v16",
  "iget-object v1, v0, Lcom/getcapacitor/C;.bridge:Lcom/getcapacitor/f;",
  "invoke-virtual {v1}, Ljava/lang/Object;.getClass:()Ljava/lang/Class;",
  "new-instance v2, Ljava/util/HashMap;",
  "invoke-direct {v2}, Ljava/util/HashMap;.<init>:()V",
  "invoke-virtual {v0}, Lcom/getcapacitor/C;.getPluginHandle:()Lcom/getcapacitor/PluginHandle;",
  "move-result-object v3",
  "invoke-virtual {v3}, Lcom/getcapacitor/PluginHandle;.getPluginAnnotation:()Lcom/getcapacitor/annotation/CapacitorPlugin;",
  "move-result-object v3",
  "invoke-interface {v3}, Lcom/getcapacitor/annotation/CapacitorPlugin;.permissions:()[Lcom/getcapacitor/annotation/Permission;",
  "move-result-object v3",
  "array-length v4, v3",
  "const/4 v5, #int 0 // #0",
];

describe("el DEX del APK que se publica (F10.3)", () => {
  it("detecta el `throw null` real del APK v8.5.61", () => {
    const r = auditarDexDump(volcado("com.getcapacitor.D", CUERPO_ROTO));
    expect(r.ok).toBe(false);
    expect(r.errores.join("\n")).toMatch(/throw null/);
    expect(r.errores.join("\n")).toMatch(/R8 ha borrado las anotaciones/);
    expect(r.metodo?.clase).toBe("com.getcapacitor.D");
  });

  it("acepta el cuerpo sano de v8.5.63", () => {
    const r = auditarDexDump(volcado("com.getcapacitor.C", CUERPO_SANO));
    expect(r.errores).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.avisos).toEqual([]);
  });

  it("encuentra el método aunque la clase esté ofuscada con otro nombre", () => {
    const r = auditarDexDump(volcado("a.b.C", [...CUERPO_SANO, "nop", "nop"]));
    expect(r.ok).toBe(true);
    expect(r.metodo?.clase).toBe("a.b.C");
  });

  it("no confunde un `throw null` de otro método con el de los permisos", () => {
    const dump = [
      volcado("com.getcapacitor.D", [...CUERPO_ROTO], "otroMetodo"),
      volcado("com.getcapacitor.D", CUERPO_SANO),
    ].join("\n");
    expect(auditarDexDump(dump).ok).toBe(true);
  });

  it("un `throw` de un valor que no es cero no se marca como defecto", () => {
    const cuerpo = [
      ...CUERPO_SANO,
      "const/4 v1, #int 1 // #1",
      "throw v1",
    ];
    expect(buscarThrowNulo(extraerMetodos(volcado("com.getcapacitor.C", cuerpo))[0].instrucciones)).toBe(false);
    const r = auditarDexDump(volcado("com.getcapacitor.C", cuerpo));
    expect(r.errores).toEqual([]);
  });

  it("si R8 deja el método casi vacío, también falla aunque no lance nada", () => {
    const cuerpo = ["iget-object v0, v1, Lcom/getcapacitor/C;.bridge:Lcom/getcapacitor/f;"];
    const r = auditarDexDump(volcado("com.getcapacitor.C", cuerpo));
    expect(r.ok).toBe(false);
    expect(r.errores.join("\n")).toMatch(new RegExp(`mínimo ${MIN_INSTRUCCIONES}`));
  });

  it("avisa si el método existe pero no consulta permissions()", () => {
    const cuerpo = Array.from({ length: 12 }, () => "nop");
    const r = auditarDexDump(volcado("com.getcapacitor.C", cuerpo));
    expect(r.ok).toBe(true);
    expect(r.avisos.join("\n")).toMatch(/no invoca a permissions\(\)/);
  });

  it("sin el método en el DEX no se puede dar fe de nada: error", () => {
    const r = auditarDexDump(volcado("com.getcapacitor.C", CUERPO_SANO, "otroMetodo"));
    expect(r.ok).toBe(false);
    expect(r.metodo).toBeNull();
    expect(r.errores.join("\n")).toMatch(/no aparece getPermissionStates\(\)/);
  });
});

describe("el circuito de release ejecuta la auditoría antes de publicar (F10.3)", () => {
  const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/build-apk.yml"), "utf8");

  it("el job compila, audita el DEX y solo después publica", () => {
    const auditoria = workflow.indexOf("verify-apk-dex.mjs");
    const publicacion = workflow.indexOf("Publicar APK en GitHub Releases");
    expect(auditoria, "el workflow no llama a scripts/verify-apk-dex.mjs").toBeGreaterThan(-1);
    expect(publicacion).toBeGreaterThan(-1);
    expect(auditoria, "la auditoría debe ir antes de subir la release").toBeLessThan(publicacion);
  });

  it("el paso de auditoría está después de compilar el APK", () => {
    const compilar = workflow.indexOf("Compilar APK Release");
    const auditoria = workflow.indexOf("verify-apk-dex.mjs");
    expect(compilar).toBeGreaterThan(-1);
    expect(auditoria).toBeGreaterThan(compilar);
  });

  it("hay un comando para repetir la revisión a mano", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["verify:apk"]).toBe("node scripts/verify-apk-dex.mjs");
    expect(fs.existsSync(path.join(ROOT, "scripts/verify-apk-dex.mjs"))).toBe(true);
  });
});
