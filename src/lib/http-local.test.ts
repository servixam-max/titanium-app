import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * F6.3 — el http local sale nativo (CapacitorHttp), no por el WebView.
 *
 * El WebView vive en https://localhost y quedó en modo estricto
 * (allowMixedContent: false): una petición http desde la página sería
 * contenido mixto y estaría bloqueada. Estas pruebas fijan el contrato:
 * dentro del APK el http va por el plugin nativo; en web y para https todo
 * sigue con fetch normal.
 */

const nativo = vi.hoisted(() => ({ activo: true, request: vi.fn() }));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => nativo.activo,
    getPlatform: () => (nativo.activo ? "android" : "web"),
  },
  CapacitorHttp: { request: nativo.request },
}));

import { fetchLocal, esHttpLocal } from "./http-local";

const PUENTE = "http://10.0.2.2:8082/version.json";

function respuestaNativa(
  data: unknown,
  status = 200,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return { data, status, url: PUENTE, headers };
}

describe("fetchLocal: http local sale por petición nativa dentro del APK (F6.3)", () => {
  beforeEach(() => {
    nativo.activo = true;
    nativo.request.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clasifica las URLs: http sí, https y relativas no", () => {
    expect(esHttpLocal("http://192.168.2.107:3001/api/health")).toBe(true);
    expect(esHttpLocal("https://api.github.com/x")).toBe(false);
    expect(esHttpLocal("/api/health")).toBe(false);
    expect(esHttpLocal(undefined)).toBe(false);
  });

  it("en el APK una URL http la pide CapacitorHttp y devuelve un Response real", async () => {
    nativo.request.mockResolvedValue(respuestaNativa({ version: "9.9.9" }));

    const res = await fetchLocal(PUENTE);

    expect(nativo.request).toHaveBeenCalledTimes(1);
    const opciones = nativo.request.mock.calls[0][0];
    expect(opciones.url).toBe(PUENTE);
    expect(opciones.method).toBe("GET");
    expect(opciones.connectTimeout).toBeGreaterThan(0);
    expect(opciones.readTimeout).toBeGreaterThan(0);

    expect(res).toBeInstanceOf(Response);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: "9.9.9" });
  });

  it("un POST JSON viaja como objeto al plugin (con sus cabeceras)", async () => {
    nativo.request.mockResolvedValue(respuestaNativa({ ok: true }));

    await fetchLocal("http://10.0.2.2:8082/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "xam", changes: [1] }),
    });

    const opciones = nativo.request.mock.calls[0][0];
    expect(opciones.method).toBe("POST");
    expect(opciones.headers).toEqual({ "Content-Type": "application/json" });
    expect(opciones.data).toEqual({ clientId: "xam", changes: [1] });
  });

  it("https y rutas relativas siguen con fetch normal (ni se toca el plugin)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchLocal("https://api.github.com/repos/x");
    await fetchLocal("/api/health");

    expect(nativo.request).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("en navegador/PWA (sin plataforma nativa) el http también va con fetch", async () => {
    nativo.activo = false;
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchLocal(PUENTE);

    expect(nativo.request).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(PUENTE, {});
  });

  it("si la petición nativa falla, se intenta igualmente por el WebView", async () => {
    nativo.request.mockRejectedValue(new Error("host no permitido"));
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchLocal(PUENTE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
  });

  it("si la señal ya está abortada, no se inventa un fallback: rechaza con AbortError", async () => {
    nativo.request.mockResolvedValue(respuestaNativa({ version: "9.9.9" }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    controller.abort();

    await expect(fetchLocal(PUENTE, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("una respuesta 204 no revienta: llega sin cuerpo", async () => {
    nativo.request.mockResolvedValue(respuestaNativa(null, 204, {}));

    const res = await fetchLocal("http://10.0.2.2:8082/sync");

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("un cuerpo de texto plano no se intenta parsear como JSON", async () => {
    nativo.request.mockResolvedValue(respuestaNativa("ok", 200, { "content-type": "text/plain" }));

    await fetchLocal("http://10.0.2.2:8082/sync", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: "hola",
    });

    expect(nativo.request.mock.calls[0][0].data).toBe("hola");
  });

  it("un JSON de respuesta que llega como texto sigue pudiéndose leer con json()", async () => {
    nativo.request.mockResolvedValue(respuestaNativa('{"version":"8.5.49"}', 200, {}));

    const res = await fetchLocal(PUENTE);

    expect(await res.json()).toEqual({ version: "8.5.49" });
  });
});
