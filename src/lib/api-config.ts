// Base URL for API calls from the mobile app
// Override via NEXT_PUBLIC_API_BASE_URL env variable
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Helper to build full API URLs
export function apiUrl(path: string): string {
  const base = API_BASE_URL;
  if (!base) return "";
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${base.replace(/\/$/, "")}/${cleanPath}`;
}

/** Returns true when a remote API endpoint is configured. */
export function isApiEnabled(): boolean {
  return Boolean(API_BASE_URL);
}
