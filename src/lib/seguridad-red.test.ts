import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Endurecimiento de la red del APK (F5.3).
 *
 * Antes de esta tarea el APK pedía permiso para HTTP sin cifrar "a todo"
 * (`android:usesCleartextTraffic="true"` + `allowNavigation` amplio), cuando
 * lo único que necesita texto claro es el puente local de desarrollo
 * (el Mac del usuario sirviendo version.json/APK en http://<ip>:8082) y el
 * host del emulador. Ahora la política vive en el network-security-config
 * de Android y estas pruebas impiden que se relaje sin querer.
 *
 * Si el Mac cambia de IP hay que actualizar DOS sitios a la vez — CANDIDATE_IPS
 * de ota-sync.ts y el XML — y esta suite es la que lo recuerda.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function leer(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** IPs del puente local declaradas en el código (fuente de verdad). */
function ipsDelPuente(): string[] {
  const fuente = leer("src/lib/ota-sync.ts");
  const bloque = fuente.match(/const CANDIDATE_IPS = \[([\s\S]*?)\];/);
  expect(bloque, "no se encontró CANDIDATE_IPS en src/lib/ota-sync.ts").not.toBeNull();
  return [...(bloque![1].matchAll(/"(\d{1,3}(?:\.\d{1,3}){3})"/g) ?? [])].map((m) => m[1]);
}

/** IPs del servidor de la API declaradas en el código (api-config.ts). */
function ipsDelServidorApi(): string[] {
  const fuente = leer("src/lib/api-config.ts");
  const bloque = fuente.match(/const DEFAULT_SERVER_URLS = \[([\s\S]*?)\];/);
  expect(bloque, "no se encontró DEFAULT_SERVER_URLS en src/lib/api-config.ts").not.toBeNull();
  return [...(bloque![1].matchAll(/http:\/\/(\d{1,3}(?:\.\d{1,3}){3}):\d+/g) ?? [])].map((m) => m[1]);
}

describe("Política de red del APK (endurecimiento F5.3)", () => {
  it("capacitor.config.json ya no abre HTTP sin cifrar ni navegación externa", () => {
    const config = JSON.parse(leer("capacitor.config.json"));
    expect(config.server.cleartext, "cleartext no debe volver a estar en true").not.toBe(true);
    expect(
      config.server.allowNavigation ?? [],
      "allowNavigation debe quedar vacío: las URLs externas se abren en el navegador del sistema",
    ).toEqual([]);
  });

  it("el manifiesto exige el network-security-config y ya no pide cleartext a lo ancho", () => {
    const manifest = leer("android/app/src/main/AndroidManifest.xml");
    expect(
      manifest,
      "el atributo usesCleartextTraffic='true' abre HTTP a cualquier destino; usar la lista blanca del NSC",
    ).not.toMatch(/usesCleartextTraffic="true"/);
    expect(manifest).toMatch(/android:networkSecurityConfig="@xml\/network_security_config"/);
  });

  it("el network-security-config bloquea HTTP salvo el puente local y el emulador", () => {
    const nsc = leer("android/app/src/main/res/xml/network_security_config.xml");
    expect(nsc, "la base debe prohibir el tráfico en claro").toMatch(
      /base-config[^>]*cleartextTrafficPermitted="false"/,
    );
    expect(nsc).toMatch(/domain-config[^>]*cleartextTrafficPermitted="true"/);

    // El emulador llega al Mac anfitrión por 10.0.2.2.
    expect(nsc, "falta 10.0.2.2 (emulador)").toContain(">10.0.2.2<");

    // El lint de release exige `includeSubdomains` explícito en cada <domain>
    // (v8.5.46: su ausencia tumbó el primer build de CI).
    for (const ip of ["10.0.2.2", ...ipsDelPuente()]) {
      expect(
        nsc,
        `la entrada <domain ${ip}> debe declarar includeSubdomains="false" o el lint de release falla`,
      ).toMatch(new RegExp(`<domain includeSubdomains="false">${ip.replace(/\./g, "\\.")}<\\/domain>`));
    }

    // Cada IP del puente declarada en el código debe seguir permitida aquí,
    // o la app dejaría de poder actualizarse/compartir por la red local.
    for (const ip of ipsDelPuente()) {
      expect(nsc, `la IP del puente ${ip} (CANDIDATE_IPS) falta en el network-security-config`).toContain(
        `>${ip}<`,
      );
    }
  });

  it("las IPs del puente y del servidor de la API siguen siendo las esperadas (Mac: WiFi + Tailscale)", () => {
    const ips = ipsDelPuente();
    expect(ips).toContain("192.168.2.107");
    expect(ips).toContain("100.126.164.101");

    const api = ipsDelServidorApi();
    expect(api).toContain("192.168.2.107");
    expect(api).toContain("100.126.164.101");
  });

  it("cada IP local usada por la app está en la lista blanca del NSC", () => {
    const nsc = leer("android/app/src/main/res/xml/network_security_config.xml");
    for (const ip of [...ipsDelPuente(), ...ipsDelServidorApi()]) {
      expect(nsc, `la IP local ${ip} (usada por la app) debe estar en el network-security-config`).toContain(
        `>${ip}<`,
      );
    }
  });
});

describe("Contenido mixto (F6.3): el WebView no acepta https→http", () => {
  it("allowMixedContent queda en false y no vuelve a encenderse", () => {
    const config = JSON.parse(leer("capacitor.config.json"));
    expect(
      config.android?.allowMixedContent,
      "con true, cualquier http:// vuelve a colarse en el WebView; el http local va por petición nativa (fetchLocal)",
    ).toBe(false);
  });

  it("las URLs http locales pasan por fetchLocal y nunca por fetch directo", () => {
    const vigilados = [
      "src/lib/ota-sync.ts",
      "src/lib/api-config.ts",
      "src/lib/auth.ts",
      "src/lib/email-service.ts",
    ];
    for (const archivo of vigilados) {
      const fuente = leer(archivo);
      expect(fuente, `${archivo} debe importar fetchLocal`).toMatch(
        /import \{ fetchLocal \} from "\.\/http-local"/,
      );
      expect(fuente, `${archivo} debe usar fetchLocal para el http local`).toMatch(/fetchLocal\(/);
    }

    const prohibidos: Array<[string, RegExp, string]> = [
      ["src/lib/ota-sync.ts", /fetch\(url, \{/, "la sonda del puente"],
      ["src/lib/ota-sync.ts", /fetch\(`\$\{serverUrl\}/, "las llamadas al puente"],
      ["src/lib/api-config.ts", /fetch\(`\$\{candidate\}/, "la sonda de la API"],
      ["src/lib/auth.ts", /fetch\(buildApiUrl\(/, "las llamadas a la API"],
      ["src/lib/auth.ts", /await fetch\(url, \{/, "login y registro"],
      ["src/lib/email-service.ts", /fetch\(webhookUrl/, "el webhook de correo"],
    ];
    for (const [archivo, patron, donde] of prohibidos) {
      expect(
        leer(archivo),
        `${archivo}: ${donde} debe seguir usando fetchLocal (el WebView bloquea el contenido mixto)`,
      ).not.toMatch(patron);
    }
  });

  it("el helper nativo está acotado: solo http, solo dentro del APK, y delega en fetch en web", () => {
    const fuente = leer("src/lib/http-local.ts");
    expect(fuente, "solo las URLs http necesitan salir del WebView").toMatch(/startsWith\("http:\/\/"\)/);
    expect(fuente, "la decisión nativa depende de estar dentro del APK").toMatch(
      /Capacitor\.isNativePlatform\(\)/,
    );
    expect(fuente, "la salida nativa es CapacitorHttp").toMatch(/CapacitorHttp\.request\(/);
    expect(fuente, "en web se mantiene window\.fetch").toMatch(/return fetch\(url, init\)/);
  });
});
