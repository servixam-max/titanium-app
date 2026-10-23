/**
 * Tinta legible para la inicial del avatar (F7.3a).
 *
 * El avatar se pinta con el color que eligió el usuario y la inicial encima.
 * Estaba fijada: `text-white` en Ajustes y `text-black` en la barra superior.
 * Con la paleta real de la app ninguna de las dos acierta siempre — el verde
 * menta `#00D68F` deja el blanco en **1,9:1** y el violeta `#7C3AED` deja el
 * negro en **3,1:1** —, así que la inicial desaparecía según el color elegido.
 *
 * Aquí se decide por luminancia: gana la tinta que más contraste da. Sin
 * dependencias y sin mirar el tema: el fondo lo pone el color del avatar, no
 * la superficie de la app.
 */

/** Tinta oscura de la app (casi negro, no puro: mismo tono que el texto). */
export const TINTA_OSCURA = "#0B1220";
/** Tinta clara sobre fondos oscuros. */
export const TINTA_CLARA = "#FFFFFF";

/** Umbral de luminancia donde ambas tintas empatan (≈ #767676). */
const LUMINANCIA_EMPATE = 0.179;

/** Acepta `#abc`, `#aabbcc` y `#aabbccdd` (el alfa se ignora). */
function aRgb(color: string): [number, number, number] | null {
  const limpio = color.trim().replace(/^#/, "");
  const hex = limpio.length === 3 ? limpio.split("").map((c) => c + c).join("") : limpio;
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) return null;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

const canal = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** Luminancia relativa WCAG de un color de fondo. */
export function luminanciaDelFondo(color: string): number {
  const rgb = aRgb(color);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/**
 * Devuelve `#0B1220` o `#FFFFFF`: la tinta que más se lee sobre ese fondo.
 * Un color inválido o vacío cae a la tinta clara, que es la que usaba la app.
 */
export function inkParaFondo(color?: string | null): string {
  if (!color) return TINTA_CLARA;
  const lum = luminanciaDelFondo(color);
  return lum > LUMINANCIA_EMPATE ? TINTA_OSCURA : TINTA_CLARA;
}
