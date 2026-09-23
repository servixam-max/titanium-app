const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — auditoría de contraste en los dos temas.
//
// Calcula la relación de contraste WCAG de cada texto visible contra su fondo
// real (componiendo la cadena de fondos translúcidos) y falla si no llega al
// mínimo. Es la comprobación que convierte "se lee mal" en algo medible.

const RUTAS = [
  ['/', null],
  ['/stats', null],
  ['/history', null],
  ['/weight', null],
  ['/routine/1', null],
  ['/warmup', null],
  ['/audio', null],
  ['/workout/complete', null],
  ['/workout/guided', 'guided'],
  ['/workout/individual', 'individual'],
];

/** Comprueba el contraste de todo el texto visible y devuelve las infracciones. */
async function auditarContraste(page) {
  return page.evaluate(() => {
    const parseColor = (value) => {
      const m = String(value).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };

    const over = (fg, bg) => {
      const a = fg.a ?? 1;
      return {
        r: fg.r * a + bg.r * (1 - a),
        g: fg.g * a + bg.g * (1 - a),
        b: fg.b * a + bg.b * (1 - a),
        a: 1,
      };
    };

    const luminance = ({ r, g, b }) => {
      const chan = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
    };

    const contrast = (fg, bg) => {
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (hi + 0.05) / (lo + 0.05);
    };

    /** Fondo efectivo: compone la cadena de fondos hacia arriba. */
    const fondoEfectivo = (el) => {
      const cadena = [];
      let node = el;
      while (node && node.nodeType === 1) {
        const cs = getComputedStyle(node);
        cadena.push({
          color: cs.backgroundColor,
          tieneImagen: cs.backgroundImage && cs.backgroundImage !== 'none',
        });
        node = node.parentElement;
      }
      let resultado = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = cadena.length - 1; i >= 0; i -= 1) {
        const c = parseColor(cadena[i].color);
        if (c && c.a > 0) resultado = over(c, resultado);
      }
      return { fondo: resultado, imagenDeFondo: cadena.some((c) => c.tieneImagen) };
    };

    const infracciones = [];
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none' &&
        parseFloat(cs.opacity) > 0.35
      );
    };

    for (const el of document.querySelectorAll('*')) {
      const texto = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim();
      if (!texto) continue;
      if (!visible(el)) continue;
      if (el.closest('[aria-hidden="true"]')) continue;

      const cs = getComputedStyle(el);
      const color = parseColor(cs.color);
      if (!color) continue;

      const { fondo, imagenDeFondo } = fondoEfectivo(el);
      // Con degradados de fondo no se puede calcular con exactitud
      if (imagenDeFondo) continue;

      const colorFinal = over(color, fondo);
      const ratio = contrast(colorFinal, fondo);

      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const esGrande = size >= 24 || (size >= 18.66 && weight >= 700);
      const minimo = esGrande ? 3 : 4.5;

      if (ratio < minimo) {
        infracciones.push(
          `"${texto.slice(0, 26)}" ratio ${ratio.toFixed(2)} (mín ${minimo}) · ${cs.color} sobre rgb(${Math.round(fondo.r)},${Math.round(fondo.g)},${Math.round(fondo.b)})`,
        );
      }
    }

    return infracciones;
  });
}

for (const tema of ['dark', 'light']) {
  test.describe(`Contraste · tema ${tema}`, () => {
    for (const [ruta, modo] of RUTAS) {
      test(`${ruta}`, async ({ page }) => {
        await seedSession(page, { theme: tema });
        if (modo) await seedWorkout(page, { mode: modo });

        await page.goto(ruta);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);

        await expect(page.locator('html')).toHaveClass(new RegExp(tema));

        const infracciones = await auditarContraste(page);
        expect(
          infracciones,
          `contraste insuficiente en ${ruta} (${tema}):\n  ${infracciones.slice(0, 12).join('\n  ')}`,
        ).toEqual([]);
      });
    }
  });
}
