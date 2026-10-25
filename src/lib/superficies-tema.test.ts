import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Superficies de tema (F7.3b).
 *
 * El tema claro se resolvía con una capa de reescrituras por nombre de clase:
 * `html.light .bg-[#131626] { background-color: #FFFFFF !important }`. Esa
 * lista se quedaba corta cada vez que aparecía una clase nueva —de ahí salieron
 * el `group-hover:text-primary` de F6.4 y las familias de texto de F7.3a— y su
 * `!important` anulaba los estados `hover:` del tema claro: un botón hundido se
 * quedaba igual al pulsarlo.
 *
 * Ahora cada superficie tiene su valor en los dos temas y las clases dicen qué
 * superficie es (`bg-card`, `bg-panel`, `bg-inset`, `border-hairline`), no de
 * qué color. Estas pruebas vigilan:
 *
 *   1. que los tokens existan en los dos temas;
 *   2. que el escenario 3D NO tenga versión clara (es una superficie de imagen);
 *   3. que ninguna clase antigua vuelva a las pantallas;
 *   4. que la capa `html.light` no vuelva a reescribir esas clases;
 *   5. que lo hundido se distinga de la tarjeta (el hover que se perdió).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function bloque(css: string, selector: string): string {
  const inicio = css.indexOf(`${selector} {`);
  expect(inicio, `no se encontró el bloque ${selector} en globals.css`).toBeGreaterThanOrEqual(0);
  return css.slice(inicio, css.indexOf("}", inicio));
}

/** Lee un token de color: hex (#RRGGBB), rgba(...) o rgb(... r g b). */
function tokenRgba(css: string, selector: string, nombre: string): [number, number, number, number] {
  const cuerpo = bloque(css, selector);
  const m = cuerpo.match(new RegExp(`--${nombre}:\\s*([^;]+);`));
  expect(m, `no se encontró --${nombre} en ${selector}`).not.toBeNull();
  const valor = m![1].trim();
  const hex = valor.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = hex[1];
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), 1];
  }
  const nums = valor.match(/[\d.]+/g);
  expect(nums, `--${nombre} no es un color reconocible: ${valor}`).not.toBeNull();
  return [
    Number(nums![0]),
    Number(nums![1]),
    Number(nums![2]),
    nums!.length > 3 ? Number(nums![3]) : 1,
  ];
}

function token(css: string, selector: string, nombre: string): [number, number, number] {
  const [r, g, b] = tokenRgba(css, selector, nombre);
  return [r, g, b];
}

/** Compone un color con alfa sobre otro opaco (las superficies hundidas). */
function componer(
  color: [number, number, number, number],
  fondo: [number, number, number],
): [number, number, number] {
  const a = color[3];
  return [0, 1, 2].map((i) => Math.round(color[i] * a + fondo[i] * (1 - a))) as [
    number,
    number,
    number,
  ];
}

/** Paso visible entre dos colores: la mayor diferencia por canal. */
const paso = (a: [number, number, number], b: [number, number, number]) =>
  Math.max(...[0, 1, 2].map((i) => Math.abs(a[i] - b[i])));

const canal = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminancia = ([r, g, b]: [number, number, number]) =>
  0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);


function fuentes(dir = path.join(ROOT, "src")): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return fuentes(ruta);
    return /\.tsx?$/.test(entrada.name) ? [ruta] : [];
  });
}

/** Clases que la capa reescribía y que ya no pueden aparecer sin variante. */
const MIGRADAS = [
  "bg-[#131626]",
  "bg-[#0d101a]",
  "bg-[#181d2e]",
  "bg-[#0A0B10]",
  "bg-white/5",
  "bg-white/10",
  "bg-white/20",
  "border-white/5",
  "border-white/10",
  "border-white/15",
  "border-white/20",
  "from-[#141828]",
  "via-[#111422]",
  "to-[#0D101A]",
  "from-[#131626]",
  "via-[#1a2238]",
  "to-[#131626]",
];

describe("Superficies de tema en los dos temas (F7.3b)", () => {
  const css = leer("src/app/globals.css");
  const claro = bloque(css, "html.light");

  it("declara las superficies en oscuro y en claro", () => {
    expect(token(css, ":root", "surface-card")).toEqual([19, 22, 38]);
    expect(token(css, ":root", "surface-panel")).toEqual([13, 16, 26]);
    expect(token(css, ":root", "surface-inset")).toEqual([24, 29, 46]);
    expect(token(css, "html.light", "surface-card")).toEqual([255, 255, 255]);
    expect(token(css, "html.light", "surface-panel")).toEqual([255, 255, 255]);
    expect(token(css, "html.light", "surface-inset")).toEqual([241, 245, 249]);
  });

  it("la tarjeta clara es blanca y la oscura no (nadie invierte el tema)", () => {
    const oscura = luminancia(token(css, ":root", "surface-card"));
    const clara = luminancia(token(css, "html.light", "surface-card"));
    expect(clara, "la tarjeta del tema claro tiene que ser clara").toBeGreaterThan(0.8);
    expect(oscura, "la tarjeta del tema oscuro tiene que ser oscura").toBeLessThan(0.08);
  });

  it("lo hundido se distingue de la tarjeta: el hover que la capa anulaba", () => {
    // Antes, `bg-[#181d2e]` quedaba fijado en #F1F5F9 con !important y el
    // `hover:bg-white/10` era blanco translúcido sobre blanco: el botón no
    // cambiaba al pulsarlo. Estos dos pasos tienen que verse (≥ 6 niveles por
    // canal, que es un cambio perceptible en una superficie plana).
    for (const [nombre, selector] of [
      ["oscuro", ":root"],
      ["claro", "html.light"],
    ] as Array<[string, string]>) {
      const tarjeta = token(css, selector, "surface-card");
      const hundido = componer(tokenRgba(css, selector, "surface-inset"), tarjeta);
      const hover = componer(tokenRgba(css, selector, "surface-inset-strong"), tarjeta);
      expect(
        paso(hundido, tarjeta),
        `en ${nombre}, lo hundido no se separa de la tarjeta (${hundido} vs ${tarjeta})`,
      ).toBeGreaterThanOrEqual(6);
      expect(
        paso(hover, hundido),
        `en ${nombre}, el hover no se separa del reposo (${hover} vs ${hundido})`,
      ).toBeGreaterThanOrEqual(6);
    }
  });

  it("el escenario 3D no tiene versión clara a propósito", () => {
    // El modelo se ilumina para fondo oscuro; si alguien le añade un valor
    // claro, el escenario deja de ser un escenario y el texto de su HUD se
    // queda sin fondo sobre el que leerse.
    expect(claro).not.toMatch(/--stage-/);
    expect(token(css, ":root", "stage-hi")).toEqual([10, 11, 16]);
  });

  it("el esqueleto de carga es claro en el tema claro", () => {
    // El esqueleto real usa #131626/#1a2238/#131626 y la lista del tema claro
    // tenía #131726/#1a2236/#161c28: un dígito de diferencia, así que en claro
    // parpadeaba un bloque oscuro sobre la tarjeta blanca.
    expect(luminancia(token(css, "html.light", "skeleton-hi"))).toBeGreaterThan(0.5);
    expect(luminancia(token(css, ":root", "skeleton-hi"))).toBeLessThan(0.1);
  });

  it("Tailwind expone los tokens para que las clases compilen", () => {
    const tailwind = leer("tailwind.config.ts");
    for (const linea of [
      'card: "var(--surface-card)"',
      'panel: "var(--surface-panel)"',
      'DEFAULT: "var(--surface-inset)"',
      'DEFAULT: "var(--hairline)"',
      '"card-hi": "var(--card-hi)"',
      '"skeleton-hi": "var(--skeleton-hi)"',
      '"stage-hi": "var(--stage-hi)"',
    ]) {
      expect(tailwind, `falta ${linea} en tailwind.config.ts`).toContain(linea);
    }
  });

  it("ninguna pantalla vuelve a las clases que la capa reescribía", () => {
    const culpables: string[] = [];
    for (const ruta of fuentes()) {
      if (/\.test\./.test(ruta)) continue;
      const contenido = fs.readFileSync(ruta, "utf8");
      for (const clase of MIGRADAS) {
        const re = new RegExp(`(?<![\\w:/.-])${clase.replace(/[[\]/\\^$.|?*+()]/g, "\\$&")}(?![\\w/-])`, "g");
        for (const m of contenido.matchAll(re)) {
          const inicio = m.index ?? 0;
          let j = inicio;
          while (j > 0 && !/[\s"'`]/.test(contenido[j - 1])) j -= 1;
          const prefijo = contenido.slice(j, inicio);
          if (prefijo.includes("dark")) continue; // lleva su valor claro al lado
          culpables.push(`${path.relative(ROOT, ruta)}:${contenido.slice(0, inicio).split("\n").length} → ${prefijo}${clase}`);
        }
      }
    }
    expect(culpables, "usa bg-card / bg-panel / bg-inset-* / border-hairline* / from-card-hi…").toEqual([]);
  });

  it("la capa del tema claro ya no reescribe superficies ni bordes", () => {
    const reescritas = [
      "html.light .bg-\\[\\#131626\\]",
      "html.light .bg-\\[\\#0d101a\\]",
      "html.light .bg-\\[\\#181d2e\\]",
      "html.light .bg-white\\/5",
      "html.light .bg-white\\/10",
      "html.light .border-white\\/10",
      "html.light .border-white\\/5",
      "html.light .from-\\[\\#141828\\]",
      "html.light .from-\\[\\#131626\\]",
      "html.light .to-\\[\\#131626\\]",
    ];
    for (const selector of reescritas) {
      expect(css, `la capa vuelve a reescribir ${selector}`).not.toContain(selector);
    }
  });
});
