// Custom Zustand storage with Date revival so active-workout sessions survive
// page reloads / static HTML navigation in exported builds.
import { StateStorage, createJSONStorage } from "zustand/middleware";
import { logger } from "./logger";

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?$/;

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return value;
}

function serializeDates(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export const localStorageWithDates: StateStorage = {
  getItem: (name: string): string | null | Promise<string | null> => {
    if (typeof window === "undefined") return "{}";
    const raw = window.localStorage.getItem(name);
    if (!raw) return "{}";
    try {
      return JSON.stringify(JSON.parse(raw, reviveDates));
    } catch {
      return "{}";
    }
  },
  setItem: (name: string, value: string): void | Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      const parsed = JSON.parse(value);
      window.localStorage.setItem(
        name,
        JSON.stringify(parsed, serializeDates),
      );
    } catch (err) {
      logger?.error?.("[storage] failed to write", name, err);
    }
  },
  removeItem: (name: string): void | Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

export function createDateAwareStorage() {
  return createJSONStorage(() => localStorageWithDates);
}
