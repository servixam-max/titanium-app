// FORTIXAM — guardar y compartir la copia de seguridad (F3.1).
//
// El WebView de Android no puede descargar un archivo creado con `Blob` +
// `<a download>`: ese camino termina en un `Intent` sobre una URL `blob:`
// que ningún visor abre (verificado en el emulador con el APK real:
// `ActivityNotFoundException: No Activity found to handle Intent
// { act=android.intent.action.VIEW dat=blob: }`). El usuario veía
// "copia guardada" y no se guardaba nada.
//
// El camino real que sí funciona en el APK es el documentado por Capacitor:
// `Filesystem.writeFile` escribe el JSON en el dispositivo y `Share.share`
// ofrece el archivo al sistema (Guardar en Archivos, Drive, WhatsApp...).
// En el navegador/web se mantiene la descarga clásica, que allí sí funciona.

import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export type SaveBackupMethod = "native-share" | "download" | "none";
export type ShareBackupOutcome = "shared" | "cancelled" | "dismissed";

export interface SaveBackupResult {
  ok: boolean;
  method: SaveBackupMethod;
  /** Ruta del archivo en el dispositivo (solo camino nativo). */
  fileUri?: string;
  /** El usuario cerró la hoja de compartir: no es un error. */
  cancelled?: boolean;
  /** Detalle para el informe cuando algo falla de verdad. */
  error?: string;
}

/**
 * ¿El error de compartir es "el usuario cerró la hoja" (no es un fallo)?
 * El plugin nativo rechaza con "Share canceled" y en web con AbortError.
 */
export function isShareCancelled(error: unknown): boolean {
  const name = (error as { name?: unknown } | null | undefined)?.name;
  if (name === "AbortError") return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /cancel/i.test(message);
}

/**
 * Escribe la copia como archivo en el dispositivo y lo ofrece al sistema.
 * Solo tiene sentido en plataforma nativa; en web se usa `downloadBackupFile`.
 */
export async function saveBackupViaShare(
  fileName: string,
  jsonText: string,
): Promise<SaveBackupResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, method: "none", error: "no es plataforma nativa" };
  }

  let fileUri: string | undefined;
  try {
    const written = await Filesystem.writeFile({
      path: fileName,
      data: jsonText,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    fileUri = written.uri;
  } catch (error) {
    return {
      ok: false,
      method: "none",
      error: `no se pudo escribir el archivo: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  try {
    await Share.share({
      title: "Copia de seguridad de FORTIXAM",
      text: "Copia de seguridad de tus entrenamientos y pesajes.",
      files: [fileUri],
      dialogTitle: "Guardar o compartir tu copia",
    });
    return { ok: true, method: "native-share", fileUri };
  } catch (error) {
    if (isShareCancelled(error)) {
      // El archivo queda escrito en la caché de la app; cancelar la hoja no
      // es un fallo, pero el usuario no se lo ha llevado a ningún sitio.
      return { ok: false, method: "native-share", fileUri, cancelled: true };
    }
    return {
      ok: false,
      method: "none",
      fileUri,
      error: `no se pudo abrir la hoja de compartir: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Descarga clásica con `Blob` + `<a download>`. Es el camino de la web/PWA,
 * donde sí funciona; en el WebView del APK no se usa.
 */
export function downloadBackupFile(fileName: string, jsonText: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Algunos entornos (jsdom en las pruebas) no implementan revokeObjectURL.
    }
    return true;
  } catch {
    return false;
  }
}
