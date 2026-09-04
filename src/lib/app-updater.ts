import { registerPlugin, Capacitor, PluginListenerHandle } from "@capacitor/core";
import { openApkDownload } from "./ota-sync";

export interface DownloadProgress {
  percent: number;
  bytesDownloaded: number;
  totalBytes: number;
}

export interface AppUpdatePluginInterface {
  canRequestPackageInstalls(): Promise<{ canInstall: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  downloadAndInstall(options: { url: string }): Promise<{ success: boolean; filePath: string }>;
  installApk(options?: { filePath?: string }): Promise<void>;
  addListener(
    eventName: "downloadProgress",
    listenerFunc: (progress: DownloadProgress) => void
  ): Promise<PluginListenerHandle>;
}

export const AppUpdate = registerPlugin<AppUpdatePluginInterface>("AppUpdate");

export async function canInstallUnknownApps(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await AppUpdate.canRequestPackageInstalls();
    return res.canInstall;
  } catch (e) {
    console.warn("Error checking install permission:", e);
    return true; // Fallback to avoid blocking
  }
}

export async function requestInstallPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AppUpdate.openInstallPermissionSettings();
  } catch (e) {
    console.warn("Error opening install settings:", e);
  }
}

export async function startInAppUpdate(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  // If running in standard browser/dev, fallback to browser download
  if (!Capacitor.isNativePlatform()) {
    await openApkDownload(url);
    return { success: true };
  }

  let progressListener: PluginListenerHandle | null = null;
  try {
    if (onProgress) {
      progressListener = await AppUpdate.addListener(
        "downloadProgress",
        (progress) => {
          onProgress(progress);
        }
      );
    }

    const result = await AppUpdate.downloadAndInstall({ url });
    if (progressListener) {
      await progressListener.remove();
    }
    return { success: result.success };
  } catch (err: any) {
    if (progressListener) {
      try {
        await progressListener.remove();
      } catch {}
    }
    console.error("In-app update error:", err);
    return {
      success: false,
      error: err?.message || "Error al descargar o instalar la actualización",
    };
  }
}
