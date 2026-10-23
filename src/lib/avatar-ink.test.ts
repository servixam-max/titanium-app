import { describe, it, expect } from "vitest";
import { inkParaFondo, luminanciaDelFondo, TINTA_CLARA, TINTA_OSCURA } from "./avatar-ink";

/**
 * La inicial del avatar tiene que leerse sobre CUALQUIER color elegido
 * (F7.3a). Antes estaba fijada a blanco en Ajustes y a negro en la barra
 * superior; con el menta `#00D68F` el blanco quedaba en 1,9:1 y la letra
 * desaparecía.
 */

/** Paleta real de la app (`src/lib/auth.ts`). */
const PALETA = ["#10B981", "#00E1FF", "#7C3AED", "#FF6B00", "#FF007A"];
/** El color por defecto que usa el propio avatar cuando la cuenta no trae uno. */
const POR_DEFECTO = "#10B981";

const canal = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function hexARgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function contraste(a: string, b: string): number {
  const la = 0.2126 * canal(hexARgb(a)[0]) + 0.7152 * canal(hexARgb(a)[1]) + 0.0722 * canal(hexARgb(a)[2]);
  const lb = 0.2126 * canal(hexARgb(b)[0]) + 0.7152 * canal(hexARgb(b)[1]) + 0.0722 * canal(hexARgb(b)[2]);
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

describe("tinta del avatar (F7.3a)", () => {
  it("la inicial llega a 4,5:1 con toda la paleta de la app", () => {
    for (const color of [...PALETA, POR_DEFECTO, "#00D68F"]) {
      const tinta = inkParaFondo(color);
      const ratio = contraste(tinta, color);
      expect(ratio, `la inicial queda en ${ratio.toFixed(2)}:1 sobre ${color} con tinta ${tinta}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el menta de por defecto deja de pintar la letra en blanco (1,9:1)", () => {
    expect(inkParaFondo("#00D68F")).toBe(TINTA_OSCURA);
    expect(inkParaFondo(POR_DEFECTO)).toBe(TINTA_OSCURA);
  });

  it("los colores oscuros de la paleta sí piden tinta clara", () => {
    expect(inkParaFondo("#7C3AED")).toBe(TINTA_CLARA);
  });

  it("acepta hex corto y con alfa, e ignora lo que no entiende", () => {
    expect(inkParaFondo("#fff")).toBe(TINTA_OSCURA);
    expect(inkParaFondo("#000")).toBe(TINTA_CLARA);
    expect(inkParaFondo("#00D68FFF")).toBe(TINTA_OSCURA);
    expect(inkParaFondo("")).toBe(TINTA_CLARA);
    expect(inkParaFondo(null)).toBe(TINTA_CLARA);
    expect(inkParaFondo("verde")).toBe(TINTA_CLARA);
  });

  it("la luminancia distingue claro de oscuro", () => {
    expect(luminanciaDelFondo("#FFFFFF")).toBeCloseTo(1, 5);
    expect(luminanciaDelFondo("#000000")).toBeCloseTo(0, 5);
    expect(luminanciaDelFondo("#00D68F")).toBeGreaterThan(0.4);
    expect(luminanciaDelFondo("#7C3AED")).toBeLessThan(0.2);
  });
});
