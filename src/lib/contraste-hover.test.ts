import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Contraste del verde de hover (F6.4).
 *
 * Las tarjetas pintan el nombre del ejercicio/rutina en verde al pasar el dedo
 * por encima (`group-hover:text-primary`). En claro, ese acento es emerald-600
 * (#059669) y sobre la tarjeta se quedaba en 3,60:1 — por debajo del 4,5:1 que
 * pide WCAG para texto normal, así que el nombre se desvanecía justo cuando el
 * usuario lo estaba tocando.
 *
 * El arreglo no inventa un color: en claro usa el mismo verde que ya emplea el
 * texto primario del tema (#036B4B), y en oscuro mantiene el acento de siempre.
 * Estas pruebas vigilan que el token exista, que cumpla el mínimo sobre las
 * tarjetas reales y que ninguna tarjeta vuelva al acento crudo.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function leer(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** Fondo real de las tarjetas: blanco, gris de hover (slate-50) e inset (slate-100). */
const FONDOS_CLAROS: Array<[string, [number, number, number]]> = [
  ["tarjeta blanca", [255, 255, 255]],
  ["tarjeta en hover (slate-50)", [248, 250, 252]],
  ["inset (slate-100)", [241, 245, 249]],
];
/** Tarjeta oscura en hover (#181d2e), la superficie más clara del tema oscuro. */
const FONDO_OSCURO: [number, number, number] = [24, 29, 46];

/** Extrae `--nombre: r g b;` del bloque de globals.css indicado. */
function tokenRgb(css: string, bloque: string, nombre: string): [number, number, number] {
  const inicio = css.indexOf(`${bloque} {`);
  expect(inicio, `no se encontró el bloque ${bloque} en globals.css`).toBeGreaterThanOrEqual(0);
  const cuerpo = css.slice(inicio, css.indexOf("}", inicio));
  const m = cuerpo.match(new RegExp(`--${nombre}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`));
  expect(m, `no se encontró --${nombre} en ${bloque}`).not.toBeNull();
  return [Number(m![1]), Number(m![2]), Number(m![3])];
}

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

/** Ficheros de src que pueden pintar texto en verde al hacer hover. */
function ficherosFuente(dir = path.join(ROOT, "src")): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return ficherosFuente(ruta);
    return /\.(tsx?|css)$/.test(entrada.name) ? [ruta] : [];
  });
}

describe("Verde de hover sobre tarjeta (F6.4)", () => {
  const css = leer("src/app/globals.css");

  it("declara el token en los dos temas", () => {
    expect(tokenRgb(css, ":root", "primary-strong-rgb")).toEqual([16, 185, 129]);
    expect(tokenRgb(css, "html.light", "primary-strong-rgb")).toEqual([3, 107, 75]);
  });

  it("llega a 4,5:1 sobre todas las tarjetas claras", () => {
    const verde = tokenRgb(css, "html.light", "primary-strong-rgb");
    for (const [nombre, fondo] of FONDOS_CLAROS) {
      const ratio = contraste(verde, fondo);
      expect(ratio, `el nombre en hover se queda en ${ratio.toFixed(2)}:1 sobre ${nombre}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("en oscuro mantiene el acento y sigue legible", () => {
    const verde = tokenRgb(css, ":root", "primary-strong-rgb");
    // No se oscurece el tema oscuro: es el mismo acento de siempre.
    expect(verde).toEqual(tokenRgb(css, ":root", "primary-rgb"));
    expect(contraste(verde, FONDO_OSCURO)).toBeGreaterThanOrEqual(4.5);
  });

  it("las tarjetas usan el token y no el acento crudo", () => {
    const tarjetas = [
      "src/components/ui/ExerciseCard.tsx",
      "src/components/ui/ExerciseGridCard.tsx",
      "src/components/ui/RoutineCard.tsx",
    ];
    for (const tarjeta of tarjetas) {
      expect(leer(tarjeta), `${tarjeta} debería pintar el hover con text-primary-strong`).toContain(
        "group-hover:text-primary-strong",
      );
    }

    // Ninguna otra pantalla debe volver al acento crudo (3,6:1 en claro).
    // Las propias pruebas quedan fuera: citan el nombre de la clase a propósito.
    const culpables = ficherosFuente()
      .filter((ruta) => !/\.test\./.test(ruta))
      .filter((ruta) => /group-hover(?:\/[\w-]+)?:text-primary(?![-\w/])/.test(fs.readFileSync(ruta, "utf8")))
      .map((ruta) => path.relative(ROOT, ruta));
    expect(culpables, "usa group-hover:text-primary-strong en lugar del acento crudo").toEqual([]);
  });

  it("el token está declarado en Tailwind para que la clase compile", () => {
    const tailwind = leer("tailwind.config.ts");
    expect(tailwind).toContain('strong: "rgb(var(--primary-strong-rgb) / <alpha-value>)"');
  });
});
