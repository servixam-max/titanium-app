import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  clearWeightGoal,
  isValidWeightGoal,
  loadWeightGoal,
  saveWeightGoal,
} from "./weight-goal";

const STORAGE_KEY = "fortixam_weight_goals_v1";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("weight-goal — persistencia del objetivo", () => {
  it("sin nada guardado devuelve null", () => {
    expect(loadWeightGoal()).toBeNull();
    expect(loadWeightGoal("e2e-user-id")).toBeNull();
  });

  it("guarda y carga el objetivo de un usuario", () => {
    expect(saveWeightGoal("e2e-user-id", 75)).toBe(75);
    expect(loadWeightGoal("e2e-user-id")).toBe(75);
    expect(localStorage.getItem(STORAGE_KEY)).toContain("e2e-user-id");
  });

  it("aísla el objetivo entre usuarios", () => {
    saveWeightGoal("u1", 75);
    saveWeightGoal("u2", 82);
    expect(loadWeightGoal("u1")).toBe(75);
    expect(loadWeightGoal("u2")).toBe(82);
  });

  it("rechaza valores inválidos sin guardarlos", () => {
    expect(saveWeightGoal("u1", 20)).toBeNull();
    expect(saveWeightGoal("u1", 300)).toBeNull();
    expect(saveWeightGoal("u1", Number.NaN)).toBeNull();
    expect(saveWeightGoal("u1", Number.POSITIVE_INFINITY)).toBeNull();
    expect(loadWeightGoal("u1")).toBeNull();
  });

  it("redondea el objetivo a un decimal", () => {
    expect(saveWeightGoal("u1", 75.06)).toBe(75.1);
    expect(loadWeightGoal("u1")).toBe(75.1);
  });

  it("tolera un JSON corrupto o con basura", () => {
    localStorage.setItem(STORAGE_KEY, "{esto no es json");
    expect(loadWeightGoal("u1")).toBeNull();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ u1: "75", u2: 20, u3: null, u4: 80 }),
    );
    expect(loadWeightGoal("u1")).toBeNull();
    expect(loadWeightGoal("u2")).toBeNull();
    expect(loadWeightGoal("u3")).toBeNull();
    expect(loadWeightGoal("u4")).toBe(80);
  });

  it("borra solo el objetivo del usuario indicado", () => {
    saveWeightGoal("u1", 75);
    saveWeightGoal("u2", 82);
    clearWeightGoal("u1");
    expect(loadWeightGoal("u1")).toBeNull();
    expect(loadWeightGoal("u2")).toBe(82);
  });

  it("usa __anon__ cuando no hay usuario", () => {
    saveWeightGoal(null, 70);
    expect(loadWeightGoal()).toBe(70);
    expect(loadWeightGoal(null)).toBe(70);
    expect(loadWeightGoal("__anon__")).toBe(70);

    clearWeightGoal();
    expect(loadWeightGoal()).toBeNull();
  });

  it("no rompe en SSR sin window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => loadWeightGoal("u1")).not.toThrow();
    expect(loadWeightGoal("u1")).toBeNull();
    expect(saveWeightGoal("u1", 75)).toBeNull();
    expect(() => clearWeightGoal("u1")).not.toThrow();
  });

  it("valida el rango del objetivo", () => {
    expect(isValidWeightGoal(30)).toBe(true);
    expect(isValidWeightGoal(250)).toBe(true);
    expect(isValidWeightGoal(29.9)).toBe(false);
    expect(isValidWeightGoal(250.1)).toBe(false);
    expect(isValidWeightGoal(Number.NaN)).toBe(false);
  });
});
