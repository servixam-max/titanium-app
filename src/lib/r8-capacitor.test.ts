import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * R8 y las anotaciones de Capacitor (F10.1).
 *
 * El APK de release se compila con `minifyEnabled true`, y desde AGP 8.0 R8
 * funciona en modo completo: borra los TIPOS de anotación que nadie conserva
 * y, con ellos, deduce que `PluginHandle.pluginAnnotation` solo puede ser
 * null. El campo desaparece y `Bridge.getPermissionStates()` se convierte en
 * un `throw null` literal, así que el primer `checkPermissions()` de un
 * plugin mata el proceso en el hilo CapacitorPlugins.
 *
 * En el APK v8.5.61 esto se veía en el DEX:
 *   getPermissionStates() → iget-object bridge; invoke getPluginHandle;
 *   const/4 v0, #0; throw v0
 *
 * La app se cerraba al abrir Ajustes con el recordatorio encendido (consulta
 * el permiso al montar la sección) y al intentar encenderlo. Estas pruebas
 * impiden que las reglas de `proguard-rules.pro` se pierdan. Para que una
 * build de release sea segura hacen falta las dos cosas: el keep del campo
 * (que impide la eliminación) y el de los tipos de anotación (que impide la
 * propagación de null).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function leer(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** Quita comentarios de ProGuard para no confundir reglas con explicaciones. */
function reglas(): string[] {
  return leer("android/app/proguard-rules.pro")
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0 && !linea.startsWith("#"));
}

describe("R8 conserva las anotaciones de Capacitor (F10.1)", () => {
  it("el release sigue minificando: si se apaga, esta guarda deja de aplicar", () => {
    const gradle = leer("android/app/build.gradle");
    expect(gradle).toMatch(/release\s*\{[\s\S]*?minifyEnabled\s+true/);
  });

  it("PluginHandle se conserva entero (incluido pluginAnnotation)", () => {
    const keep = reglas().find((r) => /^-keep\s+class\s+com\.getcapacitor\.PluginHandle\b/.test(r));
    expect(
      keep,
      "falta `-keep class com.getcapacitor.PluginHandle { *; }`: sin él R8 borra el campo pluginAnnotation y getPermissionStates queda en `throw null`",
    ).toBeDefined();
    expect(keep, "el keep de PluginHandle debe conservar todos sus miembros ({ *; })").toMatch(/\{\s*\*\s*;\s*\}/);
  });

  it("los tipos de anotación de Capacitor se conservan para la reflexión", () => {
    const keep = reglas().find((r) => /^-keep\s+@interface\s+com\.getcapacitor\.\*\*/i.test(r));
    expect(
      keep,
      "falta `-keep @interface com.getcapacitor.** { *; }`: R8 borra @CapacitorPlugin y Class.getAnnotation() devuelve null",
    ).toBeDefined();
  });

  it("ninguna regla reabre la puerta con un -dontwarn o un keep parcial de Plugin", () => {
    const sospechosas = reglas().filter(
      (r) => /^-keep\s+class\s+com\.getcapacitor\.Plugin\s*\{?\s*\}?$/.test(r),
    );
    expect(sospechosas, "un keep vacío de la clase Plugin no conserva los miembros del handle").toEqual([]);
  });
});
