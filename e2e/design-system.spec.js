const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — vigilancia del sistema visual en todas las pantallas.
// No comprueba "que se vea bonito", sino las reglas objetivas del sistema:
// sin bordes en superficies, sin etiquetas en mayúsculas, tipografía del
// sistema y tamaños legibles. Si alguien reintroduce el estilo antiguo
// (bordes + mono mayúscula + 10px), este test lo caza.
//
// El detalle de rutina ya no es una página propia: es el modal que se abre
// desde la home (v8.5.47 retiró /routine/[day]). Por eso este spec lo audita
// en una prueba aparte, con el modal abierto y el análisis acotado a él.

const RUTAS = ['/', '/stats', '/history', '/weight', '/warmup', '/audio', '/workout/complete'];

/**
 * Recorre el DOM (o solo un subárbol, si se pasa un selector) y devuelve las
 * infracciones de las reglas del sistema.
 */
async function auditar(page, scope = null) {
  return page.evaluate((scopeSelector) => {
    const raiz = scopeSelector ? document.querySelector(scopeSelector) : document;
    const problemas = { mayusculas: [], mono: [], diminutos: [], conBorde: [], desbordan: [], falta: [] };
    if (!raiz) {
      problemas.falta.push(`no se encontró ${scopeSelector}`);
      return problemas;
    }

    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };

    // 0. Texto que no cabe en su caja. Es el fallo que apareció en el selector
    // de días: tres líneas dentro de 64 px fijos acabaron solapándose. Se
    // excluye el recorte intencionado (truncate / line-clamp).
    for (const el of raiz.querySelectorAll('*')) {
      if (el.children.length > 0) continue;
      const texto = (el.textContent || '').trim();
      if (texto.length < 1) continue;
      if (!visible(el)) continue;

      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis') continue;
      if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') continue;
      if (cs.overflow === 'hidden' && cs.whiteSpace === 'nowrap') continue;

      const desbordaAncho = el.scrollWidth > el.clientWidth + 2;
      const desbordaAlto = el.scrollHeight > el.clientHeight + 2;
      if (desbordaAncho || desbordaAlto) {
        problemas.desbordan.push(
          `${texto.slice(0, 24)} (${desbordaAncho ? 'ancho' : ''}${desbordaAlto ? ' alto' : ''} ${el.scrollWidth}x${el.scrollHeight} en ${el.clientWidth}x${el.clientHeight})`,
        );
      }
    }

    for (const el of raiz.querySelectorAll('*')) {
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
    for (const el of raiz.querySelectorAll('div, section, article')) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const anchoBorde = parseFloat(cs.borderTopWidth) || 0;
      if (anchoBorde > 0 && cs.borderTopStyle !== 'none' && r.width > 240 && r.height > 90) {
        problemas.conBorde.push(`${el.className.toString().slice(0, 50)} (${cs.borderTopWidth})`);
      }
    }

    return problemas;
  }, scope);
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
      expect(p.desbordan, `textos que no caben en su caja (${ruta}): ${p.desbordan.slice(0, 5).join(' | ')}`).toEqual([]);
    });
  }
});

test.describe('Sistema de diseño · detalle de rutina (modal)', () => {
  // El detalle de rutina se abre como modal desde la home. Se audita ese
  // estado real (con sus tarjetas de ejercicio y su selector de modo), no la
  // página retirada.
  test('el modal abierto desde la home respeta las reglas del sistema', async ({ page }) => {
    await seedSession(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const empezar = page.getByRole('button', { name: 'Empezar' });
    await expect(empezar).toBeVisible({ timeout: 10000 });
    await empezar.click({ force: true });

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    // El clic deja el cursor sobre la lista de ejercicios y un hover
    // accidental cambiaría colores (nombre en verde, tarjeta en gris). Se
    // audita el estado en reposo: fuera del modal.
    await page.mouse.move(5, 5);
    // La hoja entra con muelle: esperar a que se asiente antes de medir
    await page.waitForTimeout(700);

    const p = await auditar(page, '[role="dialog"]');

    expect(p.falta, `el modal de detalle no está en el DOM`).toEqual([]);
    expect(p.mayusculas, `textos en mayúsculas en el detalle: ${p.mayusculas.slice(0, 5).join(' | ')}`).toEqual([]);
    expect(p.diminutos, `textos por debajo de 12px en el detalle: ${p.diminutos.slice(0, 5).join(' | ')}`).toEqual([]);
    expect(p.conBorde, `superficies con borde en el detalle: ${p.conBorde.slice(0, 5).join(' | ')}`).toEqual([]);
    expect(p.desbordan, `textos que no caben en su caja (detalle): ${p.desbordan.slice(0, 5).join(' | ')}`).toEqual([]);
  });
});

test.describe('Sistema de diseño · pantallas de entreno', () => {
  // Estas páginas solo renderizan con una sesión en curso, así que se siembra
  // una rutina activa. Es la pantalla que más se usa durante el entrenamiento.
  for (const [nombre, ruta, mode] of [
    ['guiado', '/workout/guided', 'guided'],
    ['individual', '/workout/individual', 'individual'],
  ]) {
    test(`${nombre} respeta las reglas del sistema`, async ({ page }) => {
      await seedSession(page);
      await seedWorkout(page, { mode });
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(700);

      // Si redirigió a la home, el sembrado no ha funcionado: mejor saberlo
      expect(page.url(), `${ruta} debería renderizar la sesión en curso`).toContain(ruta);

      const p = await auditar(page);

      expect(p.mayusculas, `mayúsculas en ${nombre}: ${p.mayusculas.slice(0, 5).join(' | ')}`).toEqual([]);
      expect(p.diminutos, `textos <12px en ${nombre}: ${p.diminutos.slice(0, 5).join(' | ')}`).toEqual([]);
      expect(p.conBorde, `superficies con borde en ${nombre}: ${p.conBorde.slice(0, 5).join(' | ')}`).toEqual([]);
      expect(p.desbordan, `textos que no caben en ${nombre}: ${p.desbordan.slice(0, 5).join(' | ')}`).toEqual([]);
    });
  }
});
