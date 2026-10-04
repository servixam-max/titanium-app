import { describe, it, expect, vi, beforeEach } from "vitest";

// El guardado real de la copia en el APK (F3.1): escribir el archivo con el
// plugin Filesystem y entregarlo con la hoja nativa (Share), que es lo único
// que funciona en el WebView de Android — el camino Blob+<a download> muere
// en un Intent sobre `blob:` que ningún visor abre.

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
  Filesystem: {
    writeFile: vi.fn(),
  },
}));

vi.mock("@capacitor/share", () => ({
  Share: {
    share: vi.fn(),
  },
}));

import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  downloadBackupFile,
  isShareCancelled,
  saveBackupViaShare,
} from "./backup-save";

const writeFileMock = vi.mocked(Filesystem.writeFile);
const shareMock = vi.mocked(Share.share);
const isNativeMock = vi.mocked(Capacitor.isNativePlatform);

beforeEach(() => {
  vi.clearAllMocks();
  isNativeMock.mockReturnValue(true);
});

describe("saveBackupViaShare — guardar y compartir la copia en el APK", () => {
  it("escribe el archivo en la caché y lo entrega con la hoja nativa", async () => {
    writeFileMock.mockResolvedValue({ uri: "file:///cache/fortixam-backup-xam.json" });
    shareMock.mockResolvedValue({ activityType: "com.whatsapp" });

    const result = await saveBackupViaShare(
      "fortixam-backup-xam-2026-10-03.json",
      '{"app":"FORTIXAM"}',
    );

    expect(writeFileMock).toHaveBeenCalledWith({
      path: "fortixam-backup-xam-2026-10-03.json",
      data: '{"app":"FORTIXAM"}',
      directory: "CACHE",
      encoding: "utf8",
    });
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ["file:///cache/fortixam-backup-xam.json"],
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.method).toBe("native-share");
    expect(result.fileUri).toBe("file:///cache/fortixam-backup-xam.json");
  });

  it("si el usuario cierra la hoja lo marca como cancelado, no como error", async () => {
    writeFileMock.mockResolvedValue({ uri: "file:///cache/copia.json" });
    shareMock.mockRejectedValue(new Error("Share canceled"));

    const result = await saveBackupViaShare("copia.json", "{}");

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.fileUri).toBe("file:///cache/copia.json");
  });

  it("si no se puede escribir el archivo, cuenta el motivo real", async () => {
    writeFileMock.mockRejectedValue(new Error("OS-PLUG-FILE-0013"));

    const result = await saveBackupViaShare("copia.json", "{}");

    expect(result.ok).toBe(false);
    expect(result.method).toBe("none");
    expect(result.error).toContain("no se pudo escribir el archivo");
    expect(shareMock).not.toHaveBeenCalled();
  });

  it("si la hoja falla de verdad (no cancelar), informa del error", async () => {
    writeFileMock.mockResolvedValue({ uri: "file:///cache/copia.json" });
    shareMock.mockRejectedValue(new Error("Can't share while sharing is in progress"));

    const result = await saveBackupViaShare("copia.json", "{}");

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBeUndefined();
    expect(result.error).toContain("no se pudo abrir la hoja");
  });

  it("en web no intenta el camino nativo", async () => {
    isNativeMock.mockReturnValue(false);

    const result = await saveBackupViaShare("copia.json", "{}");

    expect(result.ok).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(shareMock).not.toHaveBeenCalled();
  });
});

describe("isShareCancelled — cancelar no es un fallo", () => {
  it("reconoce el AbortError del navegador y el 'Share canceled' nativo", () => {
    const abort = new Error("The user aborted a request");
    abort.name = "AbortError";
    expect(isShareCancelled(abort)).toBe(true);
    expect(isShareCancelled(new Error("Share canceled"))).toBe(true);
    expect(isShareCancelled("share canceled")).toBe(true);
  });

  it("un error de verdad no se confunde con cancelar", () => {
    expect(isShareCancelled(new Error("no hay apps para compartir"))).toBe(false);
    expect(isShareCancelled(null)).toBe(false);
  });
});

describe("downloadBackupFile — la vía web clásica", () => {
  it("crea el enlace con el nombre correcto y lo pulsa", () => {
    const clicks: HTMLAnchorElement[] = [];
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      clicks.push(this);
    };

    const createdUrls: string[] = [];
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:test-${createdUrls.length}`;
      createdUrls.push(url);
      return url;
    }) as unknown as typeof URL.createObjectURL;

    try {
      const ok = downloadBackupFile("fortixam-backup-xam.json", '{"app":"FORTIXAM"}');
      expect(ok).toBe(true);
      expect(clicks).toHaveLength(1);
      expect(clicks[0].download).toBe("fortixam-backup-xam.json");
      expect(clicks[0].href).toContain("blob:");
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
      URL.createObjectURL = originalCreate;
    }
  });
});
