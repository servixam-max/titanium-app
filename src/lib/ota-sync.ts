import { logger } from "./logger";

export const APP_VERSION = "4.0";

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
    `No se pudo conectar con el PC en ${uniqueIps.join(" ni en ")} (puerto ${PORT}). Comprueba que Tailscale o el WiFi estén conectados.`
  );
}

export async function checkOtaUpdate(): Promise<{
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  serverUrl: string;
}> {
  const serverUrl = await findWorkingServer();
  const res = await fetch(`${serverUrl}/version.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error al leer version.json del servidor");
  const data = await res.json();

  const latestVersion = String(data.version || "").trim();
  const hasUpdate = Boolean(latestVersion && latestVersion !== APP_VERSION);
  
  // Build download URL using the reachable server IP
  const downloadUrl = `${serverUrl}/FORTIXAM-latest.apk`;

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
