import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * El generador del service worker (scripts/generate-sw.js).
 *
 * Regresión F5.3: el SW solo debe gestionar peticiones del propio origen.
 * Si intercepta las de otros orígenes (la API de GitHub o el puente
 * LAN/Tailscale), su fetch interno de http falla desde el contexto https
 * (mixed content) y devuelve su respuesta de reserva — «Offline» —, con lo
 * que la app daría el servidor local por caído sin haberlo intentado.
 * Medido en el WebView del emulador con la política de red endurecida.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function generarSw(): string {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), "fortixam-sw-"));
  try {
    // Estructura mínima de un export estático.
    fs.writeFileSync(path.join(dist, "index.html"), "<html></html>");
    fs.writeFileSync(path.join(dist, "history.html"), "<html></html>");
    fs.mkdirSync(path.join(dist, "_next"), { recursive: true });
    fs.writeFileSync(path.join(dist, "_next", "app.js"), "// app");
    fs.mkdirSync(path.join(dist, "images"), { recursive: true });
    fs.writeFileSync(path.join(dist, "images", "a.webp"), "x");

    const res = spawnSync("node", [path.join(ROOT, "scripts", "generate-sw.js"), dist], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(res.status, res.stderr).toBe(0);

    return fs.readFileSync(path.join(dist, "sw.js"), "utf8");
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
}

describe("service worker generado", () => {
  const sw = generarSw();

  it("deja pasar directamente las peticiones de otros orígenes (puente LAN/Tailscale, GitHub)", () => {
    const guarda = sw.indexOf("url.origin !== self.location.origin");
    expect(guarda, "falta la guarda de origen cruzado").toBeGreaterThan(-1);

    // La guarda debe ir ANTES de cualquier estrategia de caché (las llamadas
    // del handler, no las definiciones de las funciones de arriba) para que
    // la petición ni siquiera entre en respondWith.
    const apiCall = sw.indexOf("if (isApiRequest(url)) return;");
    const primeraEstrategia = sw.indexOf("if (isStaticAsset(url))");
    expect(apiCall).toBeGreaterThan(-1);
    expect(primeraEstrategia).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(apiCall);
    expect(guarda).toBeLessThan(primeraEstrategia);
  });

  it("mantiene las estrategias del propio origen (shell de la PWA)", () => {
    expect(sw).toContain("caches.match(event.request)");
    expect(sw).toContain("const CACHE_NAME = 'fortixam-v");
  });
});
