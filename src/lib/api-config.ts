export const SERVER_URL_KEY = "fortixam_server_url";

export const DEFAULT_SERVER_URLS = [
  "http://192.168.2.107:3001",    // WiFi LAN
  "http://100.126.164.101:3001", // Tailscale
  "http://10.0.2.2:3001",         // Android Emulator loopback
];

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const port = window.location.port;

  // Capacitor schemes or Android WebView localhost without port
  if (protocol === "capacitor:" || protocol === "ionic:") return true;
  if (host === "localhost" && (!port || port === "80" || port === "443")) return true;
  return false;
}

export function getServerUrl(): string {
  if (typeof window === "undefined") return "";
  const custom = localStorage.getItem(SERVER_URL_KEY);
  if (custom && custom.trim()) return custom.trim().replace(/\/$/, "");

  if (!isNativeApp()) {
    // When running in a standard browser on the Mac / Web, relative URL works
    return "";
  }

  // Running inside APK: default to LAN / Tailscale
  return DEFAULT_SERVER_URLS[0];
}

export function setServerUrl(url: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/$/, ""));
}

export async function detectActiveServer(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const custom = localStorage.getItem(SERVER_URL_KEY);
  const candidates = custom ? [custom.trim().replace(/\/$/, ""), ...DEFAULT_SERVER_URLS] : DEFAULT_SERVER_URLS;
  const uniqueCandidates = Array.from(new Set(candidates));

  for (const candidate of uniqueCandidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${candidate}/api/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        setServerUrl(candidate);
        return candidate;
      }
    } catch {
      // continue searching next candidate
    }
  }
  return null;
}

export function buildApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base = getServerUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}
