// FORTIXAM — peticiones a los servidores locales fuera del WebView (F6.3).
//
// La app se sirve desde https://localhost, pero el puente OTA (:8082) y el
// servidor de la API (:3001) hablan http:// a la IP del Mac. Una petición
// http desde una página https es «contenido mixto» y el WebView la bloquea
// (android.allowMixedContent quedó en false, en modo estricto).
//
// La salida es pedirlas de forma nativa (CapacitorHttp): la petición la hace
// el sistema operativo, donde no existe la restricción de contenido mixto,
// y sigue valiendo el network-security-config — el texto claro solo está
// permitido hacia las IPs del puente (10.0.2.2, 192.168.2.107,
// 100.126.164.101, ver android/app/src/main/res/xml/network_security_config.xml).
// Así el WebView ya no necesita aceptar mezcla https→http para nada.
//
// En navegador/PWA no hay plugin nativo: se usa window.fetch de siempre.

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { logger } from "./logger";

/** Tiempo máximo (ms) para conectar y para leer en la petición nativa. */
const TIMEOUT_MS = 2500;

/** ¿La URL es http:// y por tanto no puede salir del WebView? */
export function esHttpLocal(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("http://");
}

/** Convierte las cabeceras del fetch clásico al mapa que espera el plugin. */
function cabecerasDelFetch(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...(headers as Record<string, string>) };
}

function esCuerpoJson(cabeceras: Record<string, string> | undefined): boolean {
  if (!cabeceras) return false;
  return Object.entries(cabeceras).some(
    ([clave, valor]) =>
      clave.toLowerCase() === "content-type" && valor.toLowerCase().includes("application/json"),
  );
}

/** Envuelve la respuesta nativa en un Response real (ok/status/json/text/…). */
function respuestaComoFetch(
  status: number,
  data: unknown,
  headers: Record<string, string> | undefined,
): Response {
  const sinCuerpo = status === 204 || status === 205 || status === 304;
  const cuerpo = sinCuerpo
    ? null
    : typeof data === "string"
      ? data
      : JSON.stringify(data ?? null);
  try {
    return new Response(cuerpo, { status, headers });
  } catch {
    // Alguna cabecera que el constructor de Response no acepta: mejor una
    // respuesta sin cabeceras que romper la llamada.
    return new Response(cuerpo, { status });
  }
}

async function fetchNativo(url: string, init: RequestInit): Promise<Response> {
  const cabeceras = cabecerasDelFetch(init.headers);
  let data: unknown;
  if (typeof init.body === "string" && init.body.length > 0) {
    if (esCuerpoJson(cabeceras)) {
      try {
        data = JSON.parse(init.body);
      } catch {
        data = init.body;
      }
    } else {
      data = init.body;
    }
  }

  const respuesta = await CapacitorHttp.request({
    url,
    method: init.method ?? "GET",
    headers: cabeceras,
    data,
    connectTimeout: TIMEOUT_MS,
    readTimeout: TIMEOUT_MS,
  });

  if (init.signal?.aborted) {
    throw new DOMException("La petición se abortó", "AbortError");
  }
  return respuestaComoFetch(respuesta.status, respuesta.data, respuesta.headers);
}

/**
 * Igual que `fetch`, pero si la URL es http:// y corremos dentro del APK, la
 * petición la hace el sistema (CapacitorHttp) en lugar del WebView — que
 * desde F6.3 está en modo estricto y bloquearía el contenido mixto.
 * En web y para https:// delega en el fetch normal, sin cambiar nada.
 */
export async function fetchLocal(url: string, init: RequestInit = {}): Promise<Response> {
  if (esHttpLocal(url) && Capacitor.isNativePlatform()) {
    try {
      return await fetchNativo(url, init);
    } catch (err) {
      if (init.signal?.aborted) throw err;
      logger.warn("La petición nativa falló; se intenta desde el WebView:", err);
    }
  }
  return fetch(url, init);
}
