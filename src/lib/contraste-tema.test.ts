import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Colores de TEXTO que la capa `html.light … !important` no cubría (F7.3a).
 *
 * La capa de reescrituras del tema claro se escribió clase a clase: `.text-white`,
 * `.text-slate-400`, `.text-emerald-400`… y por eso siempre faltaba alguna.
 * Medido con la auditoría de contraste en el panel de Ajustes —una pantalla que
 * nadie miraba— salieron cuatro textos por debajo de 4,5:1 en claro y tres en
 * oscuro, todos de familias que la capa no tocaba:
 *
 *   · verde de estado (`text-emerald-600`): 3,1-3,8:1 sobre tarjeta clara
 *   · rojo de aviso (`text-red-500`): 3,3-3,8:1 sobre tarjeta y sobre su píldora
 *   · ámbar de aviso (`text-amber-500/600`): 2,6-3,2:1
 *   · `dark:text-zinc-500`: 3,76:1 en oscuro, porque el `dark:` gana en
 *     especificidad a la regla global que eleva el zinc-500 al terciario
 *
 * Estas pruebas vigilan que el token nuevo exista, que cumpla el mínimo en los
 * dos temas y que ninguna pantalla vuelva a las clases que fallaban.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const leer = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

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

function contraste(a: [number, number, number], b: [number, number, number]): number {
  const la = 0.2126 * canal(a[0]) + 0.7152 * canal(a[1]) + 0.0722 * canal(a[2]);
  const lb = 0.2126 * canal(b[0]) + 0.7152 * canal(b[1]) + 0.0722 * canal(b[2]);
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

/** Mezcla un color con alfa sobre un fondo opaco (píldoras `bg-red-500/10`). */
function mezclar(
  color: [number, number, number],
  alfa: number,
  fondo: [number, number, number],
): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(color[i] * alfa + fondo[i] * (1 - alfa))) as [
    number,
    number,
    number,
  ];
}

const BLANCO: [number, number, number] = [255, 255, 255];
const SLATE_50: [number, number, number] = [248, 250, 252];
const SLATE_100: [number, number, number] = [241, 245, 249];
const FONDO_CLARO: [number, number, number] = [232, 237, 242];
const TARJETA_OSCURA: [number, number, number] = [19, 22, 38];
const ROJO_500: [number, number, number] = [239, 68, 68];
const AMBAR_500: [number, number, number] = [245, 158, 11];

function ficherosFuente(dir = path.join(ROOT, "src")): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return ficherosFuente(ruta);
    return /\.(tsx?|css)$/.test(entrada.name) ? [ruta] : [];
  });
}

describe("Texto de aviso y de estado en los dos temas (F7.3a)", () => {
  const css = leer("src/app/globals.css");

  it("declara el rojo de aviso como texto en los dos temas", () => {
    expect(tokenRgb(css, ":root", "danger-text-rgb")).toEqual([248, 113, 113]);
    expect(tokenRgb(css, "html.light", "danger-text-rgb")).toEqual([185, 28, 28]);
  });

  it("el rojo de aviso llega a 4,5:1 en claro, también sobre su propia píldora", () => {
    const rojo = tokenRgb(css, "html.light", "danger-text-rgb");
    const fondos: Array<[string, [number, number, number]]> = [
      ["tarjeta blanca", BLANCO],
      ["inset (slate-50)", SLATE_50],
      ["fondo de la app", FONDO_CLARO],
      ["píldora bg-red-500/10", mezclar(ROJO_500, 0.1, BLANCO)],
    ];
    for (const [nombre, fondo] of fondos) {
      const ratio = contraste(rojo, fondo);
      expect(ratio, `el aviso rojo se queda en ${ratio.toFixed(2)}:1 sobre ${nombre}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el rojo de aviso también se lee en oscuro", () => {
    const rojo = tokenRgb(css, ":root", "danger-text-rgb");
    const ratio = contraste(rojo, TARJETA_OSCURA);
    expect(ratio, `el aviso rojo se queda en ${ratio.toFixed(2)}:1 sobre la tarjeta oscura`).toBeGreaterThanOrEqual(4.5);
  });

  it("el ámbar de aviso pasa por el tono que sí llega en claro", () => {
    // amber-700 #B45309: el que usan ahora los avisos.
    const ambar: [number, number, number] = [180, 83, 9];
    for (const [nombre, fondo] of [
      ["tarjeta blanca", BLANCO],
      ["píldora bg-amber-500/10", mezclar(AMBAR_500, 0.1, BLANCO)],
      ["banner bg-amber-400/10", mezclar([251, 191, 36], 0.1, BLANCO)],
    ] as Array<[string, [number, number, number]]>) {
      const ratio = contraste(ambar, fondo);
      expect(ratio, `el ámbar se queda en ${ratio.toFixed(2)}:1 sobre ${nombre}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el token está declarado en Tailwind para que la clase compile", () => {
    // F7.3c: `danger` pasó a tener DEFAULT (texto) y soft (píldora).
    const tailwind = leer("tailwind.config.ts");
    expect(tailwind).toContain('DEFAULT: "rgb(var(--danger-text-rgb) / <alpha-value>)"');
    expect(tailwind).toContain('soft: "var(--soft-danger)"');
  });

  it("ninguna pantalla vuelve a las clases que no llegaban", () => {
    const prohibidas: Array<[string, RegExp]> = [
      ["text-red-500 dark:text-red-400", /text-red-500 dark:text-red-400/],
      ["hover:text-red-500 dark:hover:text-red-400", /hover:text-red-500 dark:hover:text-red-400/],
      ["text-rose-500 dark:text-rose-400", /text-rose-500 dark:text-rose-400/],
      ["text-rose-600 dark:text-rose-300", /text-rose-600 dark:text-rose-300/],
      ["text-amber-500 dark:text-amber-", /text-amber-[56]00 dark:text-amber-/],
      ["dark:text-zinc-500", /dark:text-zinc-500(?![-\w/])/],
    ];
    const culpables: string[] = [];
    for (const ruta of ficherosFuente()) {
      if (/\.test\./.test(ruta)) continue;
      const contenido = fs.readFileSync(ruta, "utf8");
      for (const [nombre, re] of prohibidas) {
        if (re.test(contenido)) culpables.push(`${path.relative(ROOT, ruta)} → ${nombre}`);
      }
    }
    expect(culpables, "usa text-danger / text-primary-strong / text-amber-700 / dark:text-zinc-400").toEqual([]);
  });

  it("el panel de Ajustes sigue midiéndose en la auditoría de contraste", () => {
    const spec = leer("e2e/contrast.spec.js");
    expect(spec).toContain("['/', null, 'ajustes']");
    expect(spec).toContain('aria-labelledby="settings-title"');
  });
});
