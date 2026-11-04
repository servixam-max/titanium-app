import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  UPDATE_DISMISSAL_KEY,
  isUpdateDismissed,
  localDayKey,
  readUpdateDismissal,
  rememberUpdateDismissal,
  shouldShowUpdateNotice,
  type UpdateDismissal,
} from "./update-dismissal";

// El «ahora no» del aviso de actualización (F9.3): antes no se guardaba nada,
// así que el diálogo volvía a saltar a los 3 s del siguiente arranque. Aquí se
// fija cuánto dura el descarte sin tocar el reloj del sistema.

const HOY = new Date(2026, 10, 4, 18, 30); // 4 nov 2026, hora local
const MANANA = new Date(2026, 10, 5, 8, 0);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isUpdateDismissed — un «no» que dura lo que debe", () => {
  it("sin descarte guardado el aviso no se silencia", () => {
    expect(isUpdateDismissed(null, "9.0.0", HOY)).toBe(false);
    expect(isUpdateDismissed(undefined, "9.0.0", HOY)).toBe(false);
  });

  it("misma versión descartada hoy: el aviso espera", () => {
    const descarte: UpdateDismissal = { version: "9.0.0", day: localDayKey(HOY) };
    expect(isUpdateDismissed(descarte, "9.0.0", HOY)).toBe(true);
  });

  it("al día siguiente vuelve a avisar", () => {
    const descarte: UpdateDismissal = { version: "9.0.0", day: localDayKey(HOY) };
    expect(isUpdateDismissed(descarte, "9.0.0", MANANA)).toBe(false);
  });

  it("caduca justo al pasar la medianoche local", () => {
    const antes: UpdateDismissal = {
      version: "9.0.0",
      day: localDayKey(new Date(2026, 10, 4, 23, 59)),
    };
    expect(isUpdateDismissed(antes, "9.0.0", new Date(2026, 10, 4, 23, 59))).toBe(true);
    expect(isUpdateDismissed(antes, "9.0.0", new Date(2026, 10, 5, 0, 1))).toBe(false);
  });

  it("una versión nueva vuelve a avisar aunque se descartara hoy", () => {
    const descarte: UpdateDismissal = { version: "9.0.0", day: localDayKey(HOY) };
    expect(isUpdateDismissed(descarte, "9.1.0", HOY)).toBe(false);
  });

  it("la «v» del tag no hace que parezca otra versión", () => {
    const descarte: UpdateDismissal = { version: "v9.0.0", day: localDayKey(HOY) };
    expect(isUpdateDismissed(descarte, "9.0.0", HOY)).toBe(true);
    expect(isUpdateDismissed(descarte, " V9.0.0 ", HOY)).toBe(true);
  });
});

describe("localDayKey — el día del usuario, no el de UTC", () => {
  it("rellena mes y día con cero", () => {
    expect(localDayKey(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
  });

  it("no cambia de día a las 23:59 locales", () => {
    expect(localDayKey(new Date(2026, 10, 4, 23, 59))).toBe("2026-11-04");
  });
});

describe("rememberUpdateDismissal / readUpdateDismissal", () => {
  it("guarda la versión y el día de hoy en el almacenamiento del móvil", () => {
    rememberUpdateDismissal("9.0.0", HOY);

    const raw = localStorage.getItem(UPDATE_DISMISSAL_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ version: "9.0.0", day: "2026-11-04" });
    expect(readUpdateDismissal()).toEqual({ version: "9.0.0", day: "2026-11-04" });
  });

  it("sin nada guardado devuelve null", () => {
    expect(readUpdateDismissal()).toBeNull();
  });

  it("un valor corrupto se trata como «no hay descarte»", () => {
    for (const raw of ["no es json", "{}", '{"version":"","day":"2026-11-04"}', '{"version":"9.0.0","day":"ayer"}', "null"]) {
      localStorage.setItem(UPDATE_DISMISSAL_KEY, raw);
      expect(readUpdateDismissal()).toBeNull();
    }
  });

  it("si el almacenamiento falla, cerrar el aviso no se rompe", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => rememberUpdateDismissal("9.0.0", HOY)).not.toThrow();
    expect(readUpdateDismissal()).toBeNull();
  });
});

describe("shouldShowUpdateNotice — la decisión que usa el chequeo automático", () => {
  it("sin descarte enseña el aviso", () => {
    expect(shouldShowUpdateNotice("9.0.0", HOY)).toBe(true);
  });

  it("con el descarte de hoy de la misma versión, no", () => {
    rememberUpdateDismissal("9.0.0", HOY);
    expect(shouldShowUpdateNotice("9.0.0", HOY)).toBe(false);
  });

  it("mañana vuelve a enseñarlo", () => {
    rememberUpdateDismissal("9.0.0", HOY);
    expect(shouldShowUpdateNotice("9.0.0", MANANA)).toBe(true);
  });

  it("con otra versión, también", () => {
    rememberUpdateDismissal("9.0.0", HOY);
    expect(shouldShowUpdateNotice("9.0.1", HOY)).toBe(true);
  });
});
