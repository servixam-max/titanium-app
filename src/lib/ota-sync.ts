import { logger } from "./logger";

export const APP_VERSION = "6.7";

const CANDIDATE_IPS = [
  "100.126.164.101", // Tailscale VPN
  "192.168.2.107",   // WiFi Local
];

const PORT = "8082";

export function getCustomServerIp(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fortixam_server_ip");
}

export function setCustomServerIp(ip: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("fortixam_server_ip", ip.trim());
}

export async function findWorkingServer(): Promise<string> {
  const customIp = getCustomServerIp();
  const ips = customIp ? [customIp, ...CANDIDATE_IPS] : CANDIDATE_IPS;
  const uniqueIps = Array.from(new Set(ips.filter(Boolean)));

  for (const ip of uniqueIps) {
    const url = `http://${ip}:${PORT}/version.json`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeoutId);
      if (res.ok) {
        return `http://${ip}:${PORT}`;
      }
    } catch {
      // try next
    }
  }

  throw new Error(
    "No se pudo conectar con el servidor de actualizaciones. Comprueba tu conexión a Internet."
  );
}

const GITHUB_API_RELEASE_URL =
  "https://api.github.com/repos/servixam-max/titanium-app/releases/latest";
const GITHUB_RAW_VERSION_URL =
  "https://raw.githubusercontent.com/servixam-max/titanium-app/main/ota_server/version.json";

export async function checkOtaUpdate(): Promise<{
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  serverUrl: string;
}> {
  // 1. Primary: GitHub Releases API (instantaneous, global, zero cache delay)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(GITHUB_API_RELEASE_URL, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const tagName = String(data.tag_name || "").replace(/^v/, "").trim();
      const apkAsset = data.assets?.find((a: any) =>
        a.name?.toLowerCase().endsWith(".apk")
      );
      const downloadUrl = apkAsset?.browser_download_url || "";

      if (tagName && downloadUrl) {
        return {
          hasUpdate: tagName !== APP_VERSION,
          latestVersion: tagName,
          downloadUrl,
          serverUrl: "GitHub Cloud (Global)",
        };
      }
    }
  } catch (err) {
    logger.warn("GitHub Releases API check failed, trying raw fallback:", err);
  }

  // 2. Secondary: Global GitHub Raw version.json
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${GITHUB_RAW_VERSION_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const latestVersion = String(data.version || "").trim();
      const hasUpdate = Boolean(latestVersion && latestVersion !== APP_VERSION);
      const downloadUrl =
        data.url ||
        `https://github.com/servixam-max/titanium-app/releases/download/v${latestVersion}/${data.apkName || `FORTIXAM-${latestVersion}.apk`}`;

      return {
        hasUpdate,
        latestVersion,
        downloadUrl,
        serverUrl: "GitHub Cloud (Global)",
      };
    }
  } catch (err) {
    logger.warn("GitHub Raw check failed, trying local server fallback:", err);
  }

  // 3. Fallback: Local PC server (Tailscale / WiFi)
  const serverUrl = await findWorkingServer();
  const res = await fetch(`${serverUrl}/version.json?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error al leer version.json del servidor");
  const data = await res.json();

  const latestVersion = String(data.version || "").trim();
  const hasUpdate = Boolean(latestVersion && latestVersion !== APP_VERSION);
  
  const apkFileName = data.apkName || `FORTIXAM-${latestVersion || "latest"}.apk`;
  const downloadUrl = data.url?.startsWith("http")
    ? data.url
    : `${serverUrl}/${apkFileName}?t=${Date.now()}`;

  return {
    hasUpdate,
    latestVersion,
    downloadUrl,
    serverUrl,
  };
}

export async function syncToServer(data: any): Promise<boolean> {
  try {
    const serverUrl = await findWorkingServer();
    const res = await fetch(`${serverUrl}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (err) {
    logger.warn("Sync error:", err);
    return false;
  }
}

export async function syncFromServer(): Promise<any | null> {
  try {
    const serverUrl = await findWorkingServer();
    const res = await fetch(`${serverUrl}/sync.json`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    logger.warn("Fetch sync error:", err);
  }
  return null;
}

export async function openApkDownload(url: string): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, windowName: "_system" });
    return;
  } catch (e) {
    logger.warn("Browser.open error:", e);
  }

  // Fallback 1: window.open
  try {
    if (typeof window !== "undefined") {
      window.open(url, "_system");
    }
  } catch {}

  // Fallback 2: anchor click
  try {
    if (typeof document !== "undefined") {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = "FORTIXAM-latest.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch {}

  // Fallback 3: direct location
  try {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  } catch {}
}
