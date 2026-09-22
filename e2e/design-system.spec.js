const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — vigilancia del sistema visual en todas las pantallas.
// No comprueba "que se vea bonito", sino las reglas objetivas del sistema:
// sin bordes en superficies, sin etiquetas en mayúsculas, tipografía del
// sistema y tamaños legibles. Si alguien reintroduce el estilo antiguo
// (bordes + mono mayúscula + 10px), este test lo caza.

const RUTAS = ['/', '/stats', '/history', '/weight', '/routine/1', '/warmup', '/audio', '/workout/complete'];

/** Recorre el DOM y devuelve las infracciones de las reglas del sistema. */
async function auditar(page) {
  return page.evaluate(() => {
    const problemas = { mayusculas: [], mono: [], diminutos: [], conBorde: [] };

    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };

    for (const el of document.querySelectorAll('*')) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      const texto = (el.textContent || '').trim();
      const tieneTextoPropio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);

      if (!tieneTextoPropio) continue;

      // 1. Nada de etiquetas en mayúsculas
      if (cs.textTransform === 'uppercase' && texto.length > 2 && texto.length < 60) {
        problemas.mayusculas.push(texto.slice(0, 40));
      }

      // 2. Solo cifras y códigos pueden ir en monoespaciada
      if (/mono/i.test(cs.fontFamily) && /[a-zA-Z]{4,}/.test(texto) && cs.fontSize >= '13px') {
        problemas.mono.push(texto.slice(0, 40));
      }

      // 3. Suelo tipográfico: nada por debajo de 12px
      const size = parseFloat(cs.fontSize);
      if (size > 0 && size < 12) {
        problemas.diminutos.push(`${texto.slice(0, 24)} (${cs.fontSize})`);
      }
    }

    // 4. Superficies grandes con borde visible
    for (const el of document.querySelectorAll('div, section, article')) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const anchoBorde = parseFloat(cs.borderTopWidth) || 0;
      if (anchoBorde > 0 && cs.borderTopStyle !== 'none' && r.width > 240 && r.height > 90) {
        problemas.conBorde.push(`${el.className.toString().slice(0, 50)} (${cs.borderTopWidth})`);
      }
    }

    return problemas;
  });
}

test.describe('Sistema de diseño', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  for (const ruta of RUTAS) {
    test(`${ruta} respeta las reglas del sistema`, async ({ page }) => {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);

      const p = await auditar(page);

      expect(p.mayusculas, `textos en mayúsculas en ${ruta}: ${p.mayusculas.slice(0, 5).join(' | ')}`).toEqual([]);
      expect(p.diminutos, `textos por debajo de 12px en ${ruta}: ${p.diminutos.slice(0, 5).join(' | ')}`).toEqual([]);
      expect(p.conBorde, `superficies con borde en ${ruta}: ${p.conBorde.slice(0, 5).join(' | ')}`).toEqual([]);
    });
  }
});
