import { describe, it, expect, vi } from "vitest";
import {
  buildWorkoutSummary,
  computeWorkoutSummaryStats,
  formatThousands,
  formatWorkoutSummaryDate,
  isShareAbort,
  legacyCopyText,
  shareSummaryText,
  type ShareEnvironment,
} from "./share-summary";

// El resumen compartible del entrenamiento (F2.5). Se prueba el texto exacto
// que se envía y la cadena de intentos (hoja nativa → portapapeles → copia
// antigua), incluidos los casos que en producción se ven de verdad: WebView
// sin navigator.share, usuario que cancela la hoja, y error real que debe caer
// al portapapeles en vez de perderse.

const SESION = {
  routineId: 1,
  routineName: "Día 1: Empuje",
  startTime: "2026-10-02T10:00:00.000Z",
  endTime: "2026-10-02T10:42:00.000Z",
  exercises: [
    { sets: [{ weight: 40, reps: 12 }, { weight: 42.5, reps: 10 }] },
    { sets: [{ weight: 20, reps: 15 }] },
  ],
};

describe("formatThousands — cifras con punto de miles", () => {
  it("agrupa de tres en tres", () => {
    expect(formatThousands(6420)).toBe("6.420");
    expect(formatThousands(999)).toBe("999");
    expect(formatThousands(1_234_567)).toBe("1.234.567");
  });

  it("con decimales redondea y no rompe con valores raros", () => {
    expect(formatThousands(42.4)).toBe("42");
    expect(formatThousands(NaN)).toBe("0");
    expect(formatThousands(-1500)).toBe("1.500");
  });
});

describe("formatWorkoutSummaryDate — fecha corta en español", () => {
  it("devuelve día, mes y año", () => {
    // 2 de octubre de 2026 (hora local del entorno)
    const iso = new Date(2026, 9, 2, 12, 0).toISOString();
    expect(formatWorkoutSummaryDate(iso)).toBe("2 oct 2026");
  });

  it("sin fecha válida devuelve cadena vacía", () => {
    expect(formatWorkoutSummaryDate(null)).toBe("");
    expect(formatWorkoutSummaryDate("")).toBe("");
    expect(formatWorkoutSummaryDate("no-es-fecha")).toBe("");
  });
});

describe("computeWorkoutSummaryStats — cifras del resumen", () => {
  it("suma series, reps y volumen (peso × reps)", () => {
    const stats = computeWorkoutSummaryStats(SESION);
    expect(stats.sets).toBe(3);
    expect(stats.reps).toBe(37);
    expect(stats.volumeKg).toBe(40 * 12 + 42.5 * 10 + 20 * 15);
    expect(stats.minutes).toBe(42);
  });

  it("aguanta sesiones vacías o malformadas sin romperse", () => {
    expect(computeWorkoutSummaryStats(null)).toEqual({
      minutes: null,
      sets: 0,
      reps: 0,
      volumeKg: 0,
    });
    const raro = computeWorkoutSummaryStats({
      exercises: [{ sets: null }, {}, { sets: [{}] }],
    });
    expect(raro.sets).toBe(1);
    expect(raro.reps).toBe(0);
    expect(raro.volumeKg).toBe(0);
  });

  it("con tiempos rotos no inventa duración", () => {
    const stats = computeWorkoutSummaryStats({
      startTime: "ayer",
      endTime: "2026-10-02T10:00:00.000Z",
      exercises: [],
    });
    expect(stats.minutes).toBeNull();
  });
});

describe("buildWorkoutSummary — el texto que se comparte", () => {
  it("incluye título, cifras y fecha", () => {
    const texto = buildWorkoutSummary(SESION, { routineTitle: "Día 1: Empuje" });

    expect(texto).toContain("¡Entreno completado en FORTIXAM! 💪");
    expect(texto).toContain("Día 1: Empuje");
    expect(texto).toContain("⏱️ 42 min");
    expect(texto).toContain("🔢 3 series");
    expect(texto).toContain("🏋️ 1.205 kg");
    expect(texto).toMatch(/\d{1,2} \w{3} \d{4}/);
  });

  it("sin volumen (peso corporal) no enseña la línea de kilos", () => {
    const texto = buildWorkoutSummary({
      routineId: 3,
      startTime: "2026-10-02T10:00:00.000Z",
      endTime: "2026-10-02T10:20:00.000Z",
      exercises: [{ sets: [{ reps: 10 }, { reps: 12 }] }],
    });

    expect(texto).toContain("Día 3");
    expect(texto).toContain("💯 22 reps");
    expect(texto).not.toContain("kg");
  });

  it("sin datos no miente: solo cabecera y título", () => {
    const texto = buildWorkoutSummary(null);
    expect(texto).toBe("¡Entreno completado en FORTIXAM! 💪\nEntrenamiento");
  });
});

describe("shareSummaryText — cadena compartir → copiar", () => {
  function env(parcial: Partial<ShareEnvironment>): ShareEnvironment {
    return parcial;
  }

  it("usa la hoja nativa cuando existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const resultado = await shareSummaryText("hola", env({ share }));
    expect(resultado).toEqual({ method: "web-share", status: "shared" });
    expect(share).toHaveBeenCalledWith({ text: "hola", title: "FORTIXAM" });
  });

  it("el usuario que cancela la hoja no es un fallo ni cae al portapapeles", async () => {
    const abort = Object.assign(new Error("cancelado"), { name: "AbortError" });
    const share = vi.fn().mockRejectedValue(abort);
    const writeText = vi.fn();
    const resultado = await shareSummaryText(
      "hola",
      env({ share, clipboard: { writeText } }),
    );
    expect(resultado).toEqual({ method: "web-share", status: "cancelled" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("error real de share cae al portapapeles", async () => {
    const share = vi.fn().mockRejectedValue(new Error("sin destinos"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const resultado = await shareSummaryText(
      "hola",
      env({ share, clipboard: { writeText } }),
    );
    expect(resultado).toEqual({ method: "clipboard", status: "copied" });
    expect(writeText).toHaveBeenCalledWith("hola");
  });

  it("WebView sin share (el caso del APK) copia directo", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const resultado = await shareSummaryText(
      "hola",
      env({ share: null, clipboard: { writeText } }),
    );
    expect(resultado).toEqual({ method: "clipboard", status: "copied" });
  });

  it("sin Clipboard API usa la copia antigua", async () => {
    const legacyCopy = vi.fn().mockReturnValue(true);
    const resultado = await shareSummaryText(
      "hola",
      env({ share: null, clipboard: null, legacyCopy }),
    );
    expect(resultado).toEqual({ method: "legacy-copy", status: "copied" });
    expect(legacyCopy).toHaveBeenCalledWith("hola");
  });

  it("si todo falla lo dice, no lo esconde", async () => {
    const resultado = await shareSummaryText(
      "hola",
      env({ share: null, clipboard: null, legacyCopy: null }),
    );
    expect(resultado).toEqual({ method: "none", status: "failed" });
  });

  it("isShareAbort solo reconoce AbortError", () => {
    expect(isShareAbort({ name: "AbortError" })).toBe(true);
    expect(isShareAbort({ name: "NotAllowedError" })).toBe(false);
    expect(isShareAbort(null)).toBe(false);
  });

  it("legacyCopyText no rompe sin DOM (SSR/pruebas)", () => {
    // En jsdom sí hay document: la llamada real devuelve true o false sin lanzar.
    expect(typeof legacyCopyText("x")).toBe("boolean");
  });
});
