// Altura corporal para el IMC (F12.1).
//
// El IMC necesita la altura REAL de cada persona: una media de 1,75 m hace que
// el mismo peso salga como "normopeso" en alguien alto y como "sobrepeso" en
// alguien bajo. Aquí se guarda por usuario en el dispositivo, igual que los
// objetivos de peso, y la pantalla decide si está guardada o sigue estimada.

export const HEIGHT_STORAGE_KEY = "fortixam_body_height_v1";
export const BODY_HEIGHT_CHANGED_EVENT = "fortixam:body-height-changed";
export const DEFAULT_HEIGHT_CM = 175;
export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 230;

const ANON_USER = "__anon__";

type HeightMap = Record<string, number>;

export function isValidHeightCm(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_HEIGHT_CM &&
    value <= MAX_HEIGHT_CM
  );
}

function userKey(userId?: string | null): string {
  return userId || ANON_USER;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readHeights(): HeightMap {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(HEIGHT_STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const heights: HeightMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && isValidHeightCm(value)) {
        heights[key] = value;
      }
    }
    return heights;
  } catch {
    return {};
  }
}

function writeHeights(heights: HeightMap): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(HEIGHT_STORAGE_KEY, JSON.stringify(heights));
  } catch {
    // Sin espacio o almacenamiento bloqueado: la altura no persiste, pero el
    // cálculo del IMC sigue funcionando con lo que haya en memoria.
  }
}

export function loadHeightCm(userId?: string | null): number | null {
  if (!getStorage()) return null;

  const value = readHeights()[userKey(userId)];
  return typeof value === "number" && isValidHeightCm(value) ? value : null;
}

export function saveHeightCm(
  userId: string | null | undefined,
  cm: number,
): number | null {
  if (!isValidHeightCm(cm)) return null;
  if (!getStorage()) return null;

  const rounded = Math.round(cm);
  const heights = readHeights();
  heights[userKey(userId)] = rounded;
  writeHeights(heights);
  return rounded;
}

export function clearHeightCm(userId?: string | null): void {
  if (!getStorage()) return;

  const heights = readHeights();
  const key = userKey(userId);
  if (!(key in heights)) return;

  delete heights[key];
  writeHeights(heights);
}

export function effectiveHeight(userId?: string | null): {
  cm: number;
  estimated: boolean;
} {
  const saved = loadHeightCm(userId);
  if (saved === null) return { cm: DEFAULT_HEIGHT_CM, estimated: true };
  return { cm: saved, estimated: false };
}

export function formatHeightM(cm: number): string {
  return `${(cm / 100).toFixed(2).replace(".", ",")} m`;
}

export function computeBmi(
  weightKg: number,
  heightCm: number,
):
  | {
      value: number;
      category: "Bajo peso" | "Normopeso" | "Muscular / Sobrepeso" | "Elevado";
    }
  | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !isValidHeightCm(heightCm)) {
    return null;
  }

  const meters = heightCm / 100;
  const value = weightKg / (meters * meters);

  // Categorías de la OMS. El valor se devuelve sin redondear: la pantalla ya
  // lo formatea con `formatKg`, que usa coma decimal española.
  let category: "Bajo peso" | "Normopeso" | "Muscular / Sobrepeso" | "Elevado";
  if (value < 18.5) {
    category = "Bajo peso";
  } else if (value < 25) {
    category = "Normopeso";
  } else if (value < 30) {
    category = "Muscular / Sobrepeso";
  } else {
    category = "Elevado";
  }

  return { value, category };
}
