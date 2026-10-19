const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');
const { seedWorkout } = require('./helpers/workout-session');

// FORTIXAM — auditoría de los estados interactivos que el e2e de contraste no
// mira: hover de botones/chips, pulsado y foco de teclado (F7.1).
//
// El contraste en reposo ya lo vigila `contrast.spec.js`. Aquí se mide el color
// REAL que ve el dedo o el teclado: tras pasar el cursor, tras pulsar y al
// tabular. Un estado no puede empeorar la legibilidad del reposo.

/** Contraste WCAG de todo el texto visible dentro de un subárbol. */
function auditarSubarbol(raiz) {
  const parseColor = (value) => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
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
  const fondoEfectivo = (el) => {
    const cadena = [];
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      cadena.push({ color: cs.backgroundColor, imagen: cs.backgroundImage && cs.backgroundImage !== 'none' });
      node = node.parentElement;
    }
    let resultado = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = cadena.length - 1; i >= 0; i -= 1) {
      const c = parseColor(cadena[i].color);
      if (c && c.a > 0) resultado = over(c, resultado);
    }
    return { fondo: resultado, imagenDeFondo: cadena.some((c) => c.imagen) };
  };
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

  const infracciones = [];
  for (const el of raiz.querySelectorAll('*')) {
    const texto = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!texto || !visible(el) || el.closest('[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    const color = parseColor(cs.color);
    if (!color) continue;
    const { fondo, imagenDeFondo } = fondoEfectivo(el);
    if (imagenDeFondo) continue;
    const ratio = contrast(over(color, fondo), fondo);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const minimo = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
    if (ratio < minimo) {
      infracciones.push(
        `"${texto.slice(0, 26)}" ${ratio.toFixed(2)}:1 (mín ${minimo}) · ${cs.color} sobre rgb(${Math.round(
          fondo.r,
        )},${Math.round(fondo.g)},${Math.round(fondo.b)})`,
      );
    }
  }
  return infracciones;
}

/** Indicador de foco: anillo visible y con contraste suficiente (3:1). */
function medirFoco() {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const parse = (v) => {
    const m = String(v).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (f, b) => ({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  });
  const lum = ({ r, g, b }) => {
    const c = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  };
  const ratio = (f, b) => {
    const l1 = lum(f);
    const l2 = lum(b);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  };

  // El anillo se pinta por fuera del borde: lo rodea el fondo del padre.
  const cadena = [];
  let node = el.parentElement;
  while (node && node.nodeType === 1) {
    cadena.push(getComputedStyle(node).backgroundColor);
    node = node.parentElement;
  }
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = cadena.length - 1; i >= 0; i -= 1) {
    const c = parse(cadena[i]);
    if (c && c.a > 0) bg = over(c, bg);
  }

  const cs = getComputedStyle(el);
  const color = parse(cs.outlineColor);
  const ancho = parseFloat(cs.outlineWidth) || 0;
  const tieneAnillo = cs.outlineStyle !== 'none' && ancho >= 2 && color && color.a > 0.5;
  return {
    tag: el.tagName,
    texto: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 26),
    anillo: `${cs.outlineStyle} ${ancho}px ${cs.outlineColor}`,
    tieneAnillo,
    visible: el.matches(':focus-visible'),
    ratio: tieneAnillo ? ratio(over(color, bg), bg) : 0,
    fondo: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
  };
}

/** Pasa el cursor por cada control visible y audita solo lo que cambia. */
async function auditarHover(page, selector, limite) {
  const total = await page.locator(selector).count();
  const hallazgos = [];
  for (let i = 0; i < Math.min(total, limite); i += 1) {
    const el = page.locator(selector).nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    await page.mouse.move(3, 3);
    try {
      await el.hover({ timeout: 2000 });
    } catch {
      continue;
    }
    await page.waitForTimeout(220); // transition-colors
    const infracciones = await el.evaluate(auditarSubarbol);
    if (infracciones.length) {
      const texto = (await el.innerText().catch(() => '')).trim().slice(0, 26);
      hallazgos.push(`hover "${texto}" → ${infracciones.join(' | ')}`);
    }
  }
  return hallazgos;
}

for (const tema of ['light', 'dark']) {
  test.describe(`Estados interactivos · ${tema}`, () => {
    test('el hover de botones y chips no baja del mínimo', async ({ page }) => {
      await seedSession(page, { theme: tema });
      await page.goto('/stats');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const infracciones = await auditarHover(page, 'main button, main [role="button"]', 18);
      expect(infracciones, `hover ilegible en /stats (${tema}):\n  ${infracciones.join('\n  ')}`).toEqual([]);
    });

    test('el nombre de un ejercicio de la rutina se lee al pasar por encima', async ({ page, isMobile }) => {
      // El hover es un estado de ratón: en táctil no existe (se toca, no se
      // pasa por encima), así que este caso solo aplica al proyecto de escritorio.
      test.skip(isMobile, 'el hover no existe en el proyecto táctil');
      await seedSession(page, { theme: tema });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);

      await page.getByRole('button', { name: /Ver todas las rutinas/i }).click();
      const desplegar = page.getByRole('button', { name: /Ver ejercicios \(\d+\)/ }).first();
      await expect(desplegar).toBeVisible({ timeout: 10000 });
      await desplegar.click();

      const fila = page.locator('[class*="group/item"]').first();
      await expect(fila).toBeVisible({ timeout: 10000 });
      const nombre = fila.locator('span').first();
      const reposo = await nombre.evaluate((el) => getComputedStyle(el).color);
      await fila.hover();
      await page.waitForTimeout(250);

      const color = await nombre.evaluate((el) => getComputedStyle(el).color);
      expect(color, 'el nombre no cambió de color en hover: el estado no se aplicó').not.toBe(reposo);
      const infracciones = await fila.evaluate(auditarSubarbol);
      expect(
        infracciones,
        `hover ilegible en la lista de la rutina (${tema}), color ${color}:\n  ${infracciones.join('\n  ')}`,
      ).toEqual([]);
    });

    test('pulsar un botón no vuelve ilegible su texto', async ({ page }) => {
      await seedSession(page, { theme: tema });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const boton = page.getByRole('button', { name: 'Empezar' }).first();
      await expect(boton).toBeVisible({ timeout: 10000 });
      const caja = await boton.boundingBox();
      await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(220);
      const infracciones = await boton.evaluate(auditarSubarbol);
      // Se suelta fuera del botón para no disparar el clic.
      await page.mouse.move(3, 3);
      await page.mouse.up();
      expect(infracciones, `pulsado ilegible (${tema}):\n  ${infracciones.join('\n  ')}`).toEqual([]);
    });

    test('el foco de teclado siempre se ve', async ({ page }) => {
      await seedSession(page, { theme: tema });
      await seedWorkout(page, { mode: 'individual' });
      await page.goto('/workout/individual');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);

      const problemas = [];
      for (let t = 0; t < 30; t += 1) {
        await page.keyboard.press('Tab');
        const foco = await page.evaluate(medirFoco);
        if (!foco || !foco.visible) continue;
        if (foco.tieneAnillo && foco.ratio >= 3) continue;
        problemas.push(`${foco.tag} "${foco.texto}": ${foco.anillo} sobre ${foco.fondo} · ${foco.ratio}:1`);
      }
      expect(problemas, `foco invisible o con poco contraste (${tema}):\n  ${problemas.join('\n  ')}`).toEqual([]);
    });
  });
}
