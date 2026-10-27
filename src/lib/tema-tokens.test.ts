import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Tokens de tema (F7.3c).
 *
 * La capa `html.light … !important` llegó a tener 107 selectores: uno por cada
 * color oscuro que había que “traducir” a claro. Se quedaba corta con cada
 * pantalla nueva y su `!important` anulaba los `hover:`. F7.3b quitó las
 * superficies; F7.3c quita el resto (texto neutro, estados, velos de foto,
 * campos, cristal, botón primario y elevación) y deja un solo mecanismo: cada
 * familia tiene su token en los dos temas y la clase dice qué es.
 *
 * Estas pruebas vigilan:
 *
 *   1. que los tokens existan en `:root` y en `html.light`;
 *   2. que la tinta y los estados cumplan 4,5:1 sobre tarjeta, fondo y píldora;
 *   3. que el velo de foto (superficie de imagen) NO cambie con el tema;
 *   4. que no vuelva a existir ninguna regla `html.light` por clase;
 *   5. que Tailwind resuelva los nombres antiguos contra tokens, no contra hex;
 *   6. que ninguna pantalla vuelva a pintar píldoras con `bg-amber-500/10`.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function bloque(css: string, selector: string): string {
  const inicio = css.indexOf(`${selector} {`);
  expect(inicio, `no se encontró el bloque ${selector} en globals.css`).toBeGreaterThanOrEqual(0);
  return css.slice(inicio, css.indexOf("}", inicio));
}

type Color = [number, number, number, number];

/** Lee un token de color: hex, rgb(r g b) o rgb(r g b / a). */
function token(css: string, selector: string, nombre: string): Color {
  const cuerpo = bloque(css, selector);
  const m = cuerpo.match(new RegExp(`--${nombre}:\\s*([^;]+);`));
  expect(m, `no se encontró --${nombre} en ${selector}`).not.toBeNull();
  const valor = m![1].trim();
  const hex = valor.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = hex[1];
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), 1];
  }
  const rgb = valor.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)$/);
  expect(rgb, `--${nombre} no es un color reconocible: ${valor}`).not.toBeNull();
  return [Number(rgb![1]), Number(rgb![2]), Number(rgb![3]), rgb![4] ? Number(rgb![4]) : 1];
}

/** Convierte un token "r g b" (los que Tailwind usa con <alpha-value>). */
function tokenRgb(css: string, selector: string, nombre: string): [number, number, number] {
  const cuerpo = bloque(css, selector);
  const m = cuerpo.match(new RegExp(`--${nombre}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`));
  expect(m, `no se encontró --${nombre}: r g b en ${selector}`).not.toBeNull();
  return [Number(m![1]), Number(m![2]), Number(m![3])];
}

const canal = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminancia = (c: [number, number, number]) =>
  0.2126 * canal(c[0]) + 0.7152 * canal(c[1]) + 0.0722 * canal(c[2]);

function contraste(a: [number, number, number], b: [number, number, number]): number {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  const [alto, bajo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (alto + 0.05) / (bajo + 0.05);
}

/** Compone un color con alfa sobre un fondo opaco. */
function sobre(c: Color, fondo: [number, number, number]): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(c[i] * c[3] + fondo[i] * (1 - c[3]))) as [
    number,
    number,
    number,
  ];
}

function fuentes(dir = path.join(ROOT, "src")): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return fuentes(ruta);
    return /\.tsx?$/.test(entrada.name) ? [ruta] : [];
  });
}

const TARJETA_CLARA: [number, number, number] = [255, 255, 255];
const FONDO_CLARO: [number, number, number] = [232, 237, 242];
const TARJETA_OSCURA: [number, number, number] = [19, 22, 38];

const ESTADOS = [
  ["warning", "warning-text-rgb", "soft-warning"],
  ["success", "success-text-rgb", "soft-success"],
  ["info", "info-text-rgb", "soft-info"],
  ["danger", "danger-text-rgb", "soft-danger"],
  ["violet", "violet-text-rgb", "soft-violet"],
  ["flame", "flame-text-rgb", "soft-flame"],
] as const;

describe("Tokens de tema: tinta, estados y velos (F7.3c)", () => {
  const css = leer("src/app/globals.css");
  const claro = bloque(css, "html.light");

  it("declara la tinta neutra en los dos temas", () => {
    expect(tokenRgb(css, ":root", "ink-1-rgb")).toEqual([255, 255, 255]);
    expect(tokenRgb(css, "html.light", "ink-1-rgb")).toEqual([15, 23, 42]);
    for (const nivel of ["ink-2-rgb", "ink-3-rgb"]) {
      expect(tokenRgb(css, ":root", nivel)).not.toEqual(tokenRgb(css, "html.light", nivel));
    }
    // El nivel tenue sigue leyéndose sobre el fondo de la app, no solo sobre
    // la tarjeta: es el que más se usa en metadatos.
    expect(contraste(tokenRgb(css, "html.light", "ink-3-rgb"), FONDO_CLARO)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(tokenRgb(css, ":root", "ink-3-rgb"), TARJETA_OSCURA)).toBeGreaterThanOrEqual(4.5);
  });

  it("cada estado tiene un tono por tema y su píldora", () => {
    for (const [nombre, texto, suave] of ESTADOS) {
      expect(tokenRgb(css, ":root", texto), `falta ${texto} en oscuro`).not.toEqual(
        tokenRgb(css, "html.light", texto),
      );
      expect(token(css, ":root", suave)[3], `${suave} debe ser un tinte en oscuro`).toBeLessThan(1);
      expect(token(css, "html.light", suave)[3], `${suave} debe ser opaco en claro`).toBe(1);
      expect(nombre).toBeTruthy();
    }
  });

  it("los seis estados se leen sobre tarjeta, fondo y su propia píldora", () => {
    for (const [nombre, texto, suave] of ESTADOS) {
      const claroTexto = tokenRgb(css, "html.light", texto);
      const oscuroTexto = tokenRgb(css, ":root", texto);
      const claroSuave = sobre(token(css, "html.light", suave), TARJETA_CLARA);
      const oscuroSuave = sobre(token(css, ":root", suave), TARJETA_OSCURA);

      for (const [donde, fondo] of [
        ["tarjeta clara", TARJETA_CLARA],
        ["fondo claro", FONDO_CLARO],
        ["píldora clara", claroSuave],
      ] as Array<[string, [number, number, number]]>) {
        const ratio = contraste(claroTexto, fondo);
        expect(ratio, `${nombre} en claro se queda en ${ratio.toFixed(2)}:1 sobre ${donde}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const [donde, fondo] of [
        ["tarjeta oscura", TARJETA_OSCURA],
        ["píldora oscura", oscuroSuave],
      ] as Array<[string, [number, number, number]]>) {
        const ratio = contraste(oscuroTexto, fondo);
        expect(ratio, `${nombre} en oscuro se queda en ${ratio.toFixed(2)}:1 sobre ${donde}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("el velo de foto y el escenario 3D no cambian con el tema", () => {
    // Son superficies de imagen: si el velo se volviera claro en el tema claro,
    // la foto dejaría de oscurecerse y el texto de encima perdería su fondo.
    expect(claro).not.toMatch(/--scrim-rgb/);
    expect(claro).not.toMatch(/--stage-/);
    expect(tokenRgb(css, ":root", "scrim-rgb")).toEqual([0, 0, 0]);
    expect(bloque(css, ".fx-media")).toMatch(/--ink-1-rgb:\s*255 255 255/);
  });

  it("no queda ninguna regla `html.light` por nombre de clase", () => {
    const capa = [
      /html\.light\s+\./,
      /html\.light\s+input/,
      /html\.light\s+::placeholder/,
      /html\.light\s+body/,
    ];
    for (const re of capa) {
      expect(css, `la capa por clase ha vuelto: ${re}`).not.toMatch(re);
    }
    // El único bloque con `html.light` es el de los tokens.
    expect((css.match(/html\.light\s*\{/g) || []).length).toBe(1);
  });

  it("no quedan `!important` de color que puedan anular un hover", () => {
    // Solo la tinta sobre el acento (verde brillante en los dos temas) necesita
    // ganar a las utilidades de texto: `bg-primary` y `btn-primary`. El resto de
    // `!important` del archivo son de accesibilidad (foco, movimiento reducido,
    // 16 px en iOS), no de color.
    const forzados = css.match(/(?:^|\s)(color|background(?:-color)?|border-color|box-shadow)\s*:[^;]*!important/g) || [];
    expect(forzados.length, `quedan ${forzados.length} colores forzados: ${forzados.join(" | ")}`).toBeLessThanOrEqual(2);
  });

  it("Tailwind resuelve los nombres antiguos contra tokens, no contra hex", () => {
    const tailwind = leer("tailwind.config.ts");
    for (const linea of [
      'ink: "rgb(var(--ink-1-rgb) / <alpha-value>)"',
      '"ink-soft": "rgb(var(--ink-2-rgb) / <alpha-value>)"',
      '"ink-faint": "rgb(var(--ink-3-rgb) / <alpha-value>)"',
      'white: "rgb(var(--ink-1-rgb) / <alpha-value>)"',
      'DEFAULT: "rgb(var(--primary-strong-rgb) / <alpha-value>)"',
      "soft: \"var(--soft-warning)\"",
      'scrim: "rgb(var(--scrim-rgb) / <alpha-value>)"',
      'md: "var(--shadow-md)"',
    ]) {
      expect(tailwind, `falta ${linea} en tailwind.config.ts`).toContain(linea);
    }
    // Los grises heredados no pueden volver a un valor fijo.
    for (const gris of ['zinc', 'slate', 'gray']) {
      const trozo = tailwind.slice(tailwind.indexOf(`${gris}: {`), tailwind.indexOf("},", tailwind.indexOf(`${gris}: {`)));
      expect(trozo, `${gris} debe usar tokens de tinta`).toMatch(/--ink-[123]-rgb/);
    }
  });

  it("ninguna pantalla vuelve a pintar píldoras de estado con colores crudos", () => {
    const crudo = new RegExp(
      "(?<![\\w:-])bg-(?:amber|emerald|cyan|sky|blue|rose|red|violet|purple|orange)-(?:400|500)/(?:10|15|20|25)(?![\\d/])",
    );
    const velo = /(?<![\w:-])bg-black\//;
    const culpables: string[] = [];
    for (const ruta of fuentes()) {
      if (/\.test\./.test(ruta)) continue;
      const contenido = fs.readFileSync(ruta, "utf8");
      if (crudo.test(contenido)) culpables.push(`${path.relative(ROOT, ruta)} → píldora cruda`);
      if (velo.test(contenido)) culpables.push(`${path.relative(ROOT, ruta)} → velo crudo`);
    }
    expect(culpables, "usa bg-<estado>-soft y bg-scrim/*").toEqual([]);
  });
});
