import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  clearHeightCm,
  computeBmi,
  DEFAULT_HEIGHT_CM,
  effectiveHeight,
  formatHeightM,
  HEIGHT_STORAGE_KEY,
  isValidHeightCm,
  loadHeightCm,
  saveHeightCm,
} from "./body-height";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("body-height — altura por usuario", () => {
  it("sin nada guardado devuelve null y 1,75 m estimada", () => {
    expect(loadHeightCm()).toBeNull();
    expect(loadHeightCm("e2e-user-id")).toBeNull();
    expect(effectiveHeight()).toEqual({ cm: DEFAULT_HEIGHT_CM, estimated: true });
    expect(effectiveHeight("e2e-user-id")).toEqual({
      cm: DEFAULT_HEIGHT_CM,
      estimated: true,
    });
  });

  it("guarda y carga la altura de un usuario", () => {
    expect(saveHeightCm("e2e-user-id", 182)).toBe(182);
    expect(loadHeightCm("e2e-user-id")).toBe(182);
    expect(effectiveHeight("e2e-user-id")).toEqual({ cm: 182, estimated: false });
    expect(localStorage.getItem(HEIGHT_STORAGE_KEY)).toContain("e2e-user-id");
  });

  it("aísla la altura entre usuarios", () => {
    saveHeightCm("u1", 170);
    saveHeightCm("u2", 195);
    expect(loadHeightCm("u1")).toBe(170);
    expect(loadHeightCm("u2")).toBe(195);
  });

  it("usa __anon__ cuando no hay usuario", () => {
    saveHeightCm(null, 168);
    expect(loadHeightCm()).toBe(168);
    expect(loadHeightCm(null)).toBe(168);
    expect(loadHeightCm("__anon__")).toBe(168);

    clearHeightCm();
    expect(loadHeightCm()).toBeNull();
  });

  it("redondea a centímetro entero", () => {
    expect(saveHeightCm("u1", 181.6)).toBe(182);
    expect(loadHeightCm("u1")).toBe(182);
  });

  it("rechaza valores inválidos sin guardarlos", () => {
    expect(saveHeightCm("u1", 119)).toBeNull();
    expect(saveHeightCm("u1", 231)).toBeNull();
    expect(saveHeightCm("u1", Number.NaN)).toBeNull();
    expect(saveHeightCm("u1", Number.POSITIVE_INFINITY)).toBeNull();
    expect(saveHeightCm("u1", "182" as unknown as number)).toBeNull();
    expect(saveHeightCm("u1", null as unknown as number)).toBeNull();
    expect(loadHeightCm("u1")).toBeNull();
  });

  it("valida el rango de altura", () => {
    expect(isValidHeightCm(120)).toBe(true);
    expect(isValidHeightCm(230)).toBe(true);
    expect(isValidHeightCm(119)).toBe(false);
    expect(isValidHeightCm(231)).toBe(false);
    expect(isValidHeightCm(Number.NaN)).toBe(false);
    expect(isValidHeightCm("170")).toBe(false);
  });

  it("tolera un JSON corrupto o con basura", () => {
    localStorage.setItem(HEIGHT_STORAGE_KEY, "{esto no es json");
    expect(loadHeightCm("u1")).toBeNull();

    localStorage.setItem(
      HEIGHT_STORAGE_KEY,
      JSON.stringify({ u1: "182", u2: 100, u3: null, u4: 175 }),
    );
    expect(loadHeightCm("u1")).toBeNull();
    expect(loadHeightCm("u2")).toBeNull();
    expect(loadHeightCm("u3")).toBeNull();
    expect(loadHeightCm("u4")).toBe(175);
  });

  it("borra solo la altura del usuario indicado", () => {
    saveHeightCm("u1", 170);
    saveHeightCm("u2", 190);
    clearHeightCm("u1");
    expect(loadHeightCm("u1")).toBeNull();
    expect(loadHeightCm("u2")).toBe(190);
  });

  it("no rompe en SSR sin window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => loadHeightCm("u1")).not.toThrow();
    expect(loadHeightCm("u1")).toBeNull();
    expect(saveHeightCm("u1", 182)).toBeNull();
    expect(() => clearHeightCm("u1")).not.toThrow();
    expect(effectiveHeight("u1")).toEqual({ cm: 175, estimated: true });
  });
});

describe("body-height — formato y cálculo del IMC", () => {
  it("formatea la altura en metros con coma española", () => {
    expect(formatHeightM(175)).toBe("1,75 m");
    expect(formatHeightM(182)).toBe("1,82 m");
    expect(formatHeightM(200)).toBe("2,00 m");
  });

  it("calcula el IMC y su categoría", () => {
    const bmi = computeBmi(80, 175);
    expect(bmi).not.toBeNull();
    expect(bmi?.value).toBeCloseTo(26.12, 2);
    expect(bmi?.category).toBe("Muscular / Sobrepeso");

    expect(computeBmi(80, 200)).toEqual({ value: 20, category: "Normopeso" });
  });

  it("respeta los límites de las categorías OMS", () => {
    // 18,5 · 1,75² = 56,65625 kg
    expect(computeBmi(56.65625, 175)?.category).toBe("Normopeso");
    expect(computeBmi(56.65, 175)?.category).toBe("Bajo peso");

    // 25 · 1,75² = 76,5625 kg
    expect(computeBmi(76.5625, 175)?.category).toBe("Muscular / Sobrepeso");
    expect(computeBmi(76.56, 175)?.category).toBe("Normopeso");

    // 30 · 1,75² = 91,875 kg
    expect(computeBmi(91.875, 175)?.category).toBe("Elevado");
    expect(computeBmi(91.87, 175)?.category).toBe("Muscular / Sobrepeso");
  });

  it("devuelve null con peso o altura inválidos", () => {
    expect(computeBmi(0, 175)).toBeNull();
    expect(computeBmi(-5, 175)).toBeNull();
    expect(computeBmi(Number.NaN, 175)).toBeNull();
    expect(computeBmi(80, 119)).toBeNull();
    expect(computeBmi(80, 231)).toBeNull();
    expect(computeBmi(80, Number.NaN)).toBeNull();
  });
});
