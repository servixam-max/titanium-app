// Base URL for API calls from the mobile app
// Override via NEXT_PUBLIC_API_BASE_URL env variable
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://servi.tail31979d.ts.net/titanium/api";

// Helper to build full API URLs
export function apiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}
