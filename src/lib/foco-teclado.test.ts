import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Anillo de foco del teclado (F7.1).
 *
 * La auditoría de estados encontró dos fallos que nadie medía: los campos de
 * peso/reps apagan el contorno con `focus:outline-none` (2 px transparentes),
 * así que al tabular no se veía dónde estaba el foco; y en claro el anillo
 * emerald-600 (#059669) se quedaba en 2,96:1 sobre las superficies hundidas
 * (#DFE4EA), por debajo del 3:1 que WCAG pide para un indicador de foco.
 *
 * Estas pruebas vigilan que el token exista en los dos temas, que cumpla el
 * mínimo sobre las superficies reales y que los campos no puedan volver a
 * quedarse sin anillo.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function leer(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function tokenHex(css: string, bloque: string, nombre: string): string {
  const inicio = css.indexOf(`${bloque} {`);
  expect(inicio, `no se encontró el bloque ${bloque} en globals.css`).toBeGreaterThanOrEqual(0);
  const cuerpo = css.slice(inicio, css.indexOf("}", inicio));
  const m = cuerpo.match(new RegExp(`--${nombre}:\\s*(#[0-9A-Fa-f]{6})\\s*;`));
  expect(m, `no se encontró --${nombre} en ${bloque}`).not.toBeNull();
  return m![1];
}

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const canal = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminancia = ([r, g, b]: [number, number, number]) =>
  0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);

function contraste(a: [number, number, number], b: [number, number, number]): number {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  const [alto, bajo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (alto + 0.05) / (bajo + 0.05);
}

/** Superficies donde se dibuja el anillo: página, tarjeta, inset y hundida. */
const FONDOS: Array<[string, [number, number, number]]> = [
  ["página clara", [232, 237, 242]],
  ["tarjeta blanca", [255, 255, 255]],
  ["inset", [245, 246, 248]],
  ["superficie hundida", [223, 228, 234]],
];

describe("Anillo de foco del teclado (F7.1)", () => {
  const css = leer("src/app/globals.css");

  it("declara el token en los dos temas", () => {
    expect(tokenHex(css, "html.light", "focus-ring")).toBe("#036B4B");
    // En oscuro hereda el acento (--focus-ring: var(--primary-500)).
    expect(css).toMatch(/--focus-ring:\s*var\(--primary-500\)\s*;/);
    expect(tokenHex(css, ":root", "primary-500")).toBe("#10B981");
  });

  it("el anillo claro llega a 3:1 sobre todas las superficies", () => {
    const anillo = rgb(tokenHex(css, "html.light", "focus-ring"));
    for (const [nombre, fondo] of FONDOS) {
      const ratio = contraste(anillo, fondo);
      expect(ratio, `el foco se queda en ${ratio.toFixed(2)}:1 sobre ${nombre}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("el anillo oscuro llega a 3:1 sobre el fondo y las tarjetas", () => {
    const anillo = rgb(tokenHex(css, ":root", "primary-500"));
    for (const [nombre, fondo] of [
      ["fondo oscuro", [10, 11, 16]],
      ["tarjeta en hover", [24, 29, 46]],
    ] as Array<[string, [number, number, number]]>) {
      const ratio = contraste(anillo, fondo);
      expect(ratio, `el foco se queda en ${ratio.toFixed(2)}:1 sobre ${nombre}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("la regla de foco usa el token, no el acento crudo", () => {
    expect(css).toContain("outline: 2px solid var(--focus-ring)");
    expect(css).not.toContain("outline: 2px solid var(--primary-500)");
  });

  it("los campos no pueden quedarse sin anillo al tabular", () => {
    // `focus:outline-none` (2 px transparentes) gana por especificidad: el
    // color necesita !important para repintarse solo con teclado.
    expect(css).toMatch(/input:focus-visible,\s*textarea:focus-visible,\s*select:focus-visible\s*{[^}]*outline-color:\s*var\(--focus-ring\)\s*!important/);
  });
});
