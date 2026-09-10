import { logger } from "./logger";

export interface AppVersion {
  version: string; // display version, e.g. "6.16"
  versionCode: number; // numeric version, monotonic
  buildType?: "debug" | "release"; // optional build channel
}

// canonical current version: bump versionCode when releasing a new APK
export const APP_VERSION: AppVersion = {
  version: "7.0.0-alpha.5",
  versionCode: 765,
  buildType: "debug",
};
const CANDIDATE_IPS = [
  "100.126.164.101", // Tailscale VPN
  "192.168.2.107", // WiFi Local
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
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return `http://${ip}:${PORT}`;
      }
    } catch {
      // try next
    }
  }

  throw new Error(
    "No se pudo conectar con el servidor de actualizaciones. Comprueba tu conexión a Internet.",
  );
}

const GITHUB_API_RELEASE_URL =
  "https://api.github.com/repos/servixam-max/titanium-app/releases/latest";
const GITHUB_RAW_VERSION_URL =
  "https://raw.githubusercontent.com/servixam-max/titanium-app/main/ota_server/version.json";

interface RemoteVersion {
  version: string;
  versionCode?: number;
  apkName?: string;
  url?: string;
}

function parseVersionCode(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return null;
}

function parseSemver(version: string): [number, number, number, string] {
  const clean = String(version || "0").replace(/^[vV]/, "");
  // Split numeric part from pre-release part, e.g. "7.0.0-alpha.5"
  const [core, pre = ""] = clean.split("-") as [string, string | undefined];
  const parts = core.split(".").map((p) => parseInt(p, 10));
  return [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] : 0,
    pre,
  ];
}

function comparePreRelease(a: string, b: string): number {
  // No pre-release is always newer than any pre-release in semver
  if (a === "" && b === "") return 0;
  if (a === "") return 1;
  if (b === "") return -1;
  const aParts = a.split(".");
  const bParts = b.split(".");
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const av = aParts[i];
    const bv = bParts[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    const aNum = parseInt(av, 10);
    const bNum = parseInt(bv, 10);
    const aIsNum = Number.isFinite(aNum);
    const bIsNum = Number.isFinite(bNum);
    if (aIsNum && bIsNum) {
      if (aNum !== bNum) return aNum - bNum;
    } else if (aIsNum) {
      return -1;
    } else if (bIsNum) {
      return 1;
    } else if (av !== bv) {
      return av.localeCompare(bv);
    }
  }
  return 0;
}

/**
 * Compare two version objects. Returns true if remote is newer than current.
 * Prefer numeric versionCode when available; fall back to semver comparison.
 */
export function isRemoteNewer(
  current: AppVersion,
  remote: RemoteVersion,
): boolean {
  const remoteVersionCode = parseVersionCode(remote.versionCode);
  if (current.versionCode != null && remoteVersionCode != null) {
    return remoteVersionCode > current.versionCode;
  }

  const [rMajor, rMinor, rPatch, rPre] = parseSemver(remote.version);
  const [cMajor, cMinor, cPatch, cPre] = parseSemver(current.version);

  if (rMajor !== cMajor) return rMajor > cMajor;
  if (rMinor !== cMinor) return rMinor > cMinor;
  if (rPatch !== cPatch) return rPatch > cPatch;

  // Same core version: compare pre-release identifiers
  return comparePreRelease(rPre, cPre) > 0;
}

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
      const remoteVersionCode = parseVersionCode(data.versionCode);
      const apkAsset = data.assets?.find(
        (a: { name?: string; browser_download_url?: string }) =>
          a.name?.toLowerCase().endsWith(".apk"),
      );
      const downloadUrl = apkAsset?.browser_download_url || "";

      if (tagName && downloadUrl) {
        const remote: RemoteVersion = {
          version: tagName,
          versionCode: remoteVersionCode ?? undefined,
        };
        return {
          hasUpdate: isRemoteNewer(APP_VERSION, remote),
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
      const data = (await res.json()) as RemoteVersion;
      const latestVersion = String(data.version || "").trim();
      const hasUpdate = isRemoteNewer(APP_VERSION, {
        version: latestVersion,
        versionCode: parseVersionCode(data.versionCode) ?? undefined,
      });
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
  const res = await fetch(`${serverUrl}/version.json?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al leer version.json del servidor");
  const data = (await res.json()) as RemoteVersion;

  const latestVersion = String(data.version || "").trim();
  const hasUpdate = isRemoteNewer(APP_VERSION, {
    version: latestVersion,
    versionCode: parseVersionCode(data.versionCode) ?? undefined,
  });

  const apkFileName =
    data.apkName || `FORTIXAM-${latestVersion || "latest"}.apk`;
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

export async function syncToServer(data: unknown): Promise<boolean> {
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

export async function syncFromServer(): Promise<unknown> {
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
