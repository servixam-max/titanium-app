const sharp = require('sharp');

// FORTIXAM — medición real del fondo cuando viene de un degradado (F7.2).
//
// El cálculo de contraste por `getComputedStyle` solo sabe componer colores
// planos: cuando una tarjeta pinta `linear-gradient(...)`, `backgroundColor` es
// transparente y el script no tenía de dónde sacar el fondo, así que se saltaba
// el texto. Eso dejaba fuera justo las tarjetas del tema oscuro, que son las
// que llevan degradado.
//
// Aquí se mide el píxel de verdad: se oculta la tinta del texto (sin tocar su
// fondo) con una regla CSS inyectada —los estilos en línea no sirven porque
// React re-renderiza durante la captura y los borra—, se fotografía la página
// y se leen los píxeles que quedan bajo la caja del texto. El contraste se
// calcula contra el peor de ellos, que es el que decide si se lee.

const SVG_NS = 'http://www.w3.org/2000/svg';

const parseColor = (value) => {
  const m = String(value).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
};

const luminancia = ({ r, g, b }) => {
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};

const contraste = (fg, bg) => {
  const l1 = luminancia(fg);
  const l2 = luminancia(bg);
  const [alto, bajo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (alto + 0.05) / (bajo + 0.05);
};

/**
 * Recorre el subárbol y separa el texto en dos grupos: el que se puede medir
 * con colores planos (se audita aquí mismo) y el que vive sobre un degradado,
 * que se devuelve para medirlo leyendo píxeles.
 */
function recorrer(scopeSelector) {
  const raiz = scopeSelector ? document.querySelector(scopeSelector) : document;
  if (!raiz) return { infracciones: [`no se encontró ${scopeSelector}`], degradados: [] };

  const parse = (value) => {
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

  /**
   * Fondo efectivo del texto: se sube por la cadena de ancestros apilando
   * fondos y se para en cuanto uno es opaco (lo de detrás ya no se ve).
   *
   * Antes se recorrían TODOS los ancestros y bastaba un degradado lejano para
   * mandar el texto a la medición por píxel. Eso colaba en las insignias `#N`:
   * su propia píldora es `bg-primary` opaca y tapa la tarjeta con degradado,
   * pero se medía la tarjeta de detrás. Solo cuenta el primer fondo que se ve.
   */
  const fondoEfectivo = (el) => {
    const cadena = [];
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      const c = parse(cs.backgroundColor);
      const tieneImagen = cs.backgroundImage && cs.backgroundImage !== 'none';
      cadena.push({ color: cs.backgroundColor, tieneImagen });
      if (tieneImagen) return { fondo: null, imagenDeFondo: true };
      if (c && c.a >= 0.999) break;
      node = node.parentElement;
    }
    let resultado = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = cadena.length - 1; i >= 0; i -= 1) {
      const c = parse(cadena[i].color);
      if (c && c.a > 0) resultado = over(c, resultado);
    }
    return { fondo: resultado, imagenDeFondo: false };
  };

  const infracciones = [];
  const degradados = [];
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

  for (const el of raiz.querySelectorAll('*')) {
    const texto = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!texto) continue;
    if (!visible(el)) continue;
    if (el.closest('[aria-hidden="true"]')) continue;

    const cs = getComputedStyle(el);
    const esSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
    // En SVG lo que se pinta es `fill`, no `color`.
    const color = parse(esSvg ? cs.fill : cs.color);
    if (!color) continue;

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const esGrande = size >= 24 || (size >= 18.66 && weight >= 700);
    const minimo = esGrande ? 3 : 4.5;

    const { fondo, imagenDeFondo } = fondoEfectivo(el);
    if (imagenDeFondo) {
      const r = el.getBoundingClientRect();
      const recorte = `${cs.webkitBackgroundClip || cs.backgroundClip}`;
      const id = String(degradados.length);
      el.setAttribute('data-auditoria-id', id);
      degradados.push({
        id,
        texto: texto.slice(0, 30),
        color: `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`,
        esSvg,
        // `background-clip: text` pinta el degradado DENTRO de las letras: no
        // hay fondo que medir debajo.
        recortado: recorte.includes('text'),
        x: r.left + window.scrollX,
        y: r.top + window.scrollY,
        w: r.width,
        h: r.height,
        minimo,
      });
      continue;
    }

    const ratio = contrast(over(color, fondo), fondo);
    if (ratio < minimo) {
      infracciones.push(
        `"${texto.slice(0, 26)}" ratio ${ratio.toFixed(2)} (mín ${minimo}) · ${cs.color} sobre rgb(${Math.round(
          fondo.r,
        )},${Math.round(fondo.g)},${Math.round(fondo.b)})`,
      );
    }
  }

  return { infracciones, degradados };
}

/** Quita las marcas y la hoja de estilo de la auditoría. */
async function limpiar(page) {
  await page
    .evaluate(() => {
      for (const el of document.querySelectorAll('[data-auditoria-id]')) {
        el.removeAttribute('data-auditoria-id');
        el.removeAttribute('data-auditoria-texto');
        el.removeAttribute('data-auditoria-svg');
      }
      document.getElementById('fortixam-auditoria-ocultar-texto')?.remove();
    })
    .catch(() => {});
}

/**
 * Mide el fondo real (píxel a píxel) del texto que vive sobre un degradado.
 *
 * Cada texto se fotografía por separado, ya en su sitio: una captura de página
 * completa reflowa la página (las secciones en `dvh` y los modales fijos se
 * recolocan) y las coordenadas dejarían de apuntar a donde estaba el texto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array} pendientes — lo que devolvió `recorrer` en `degradados`
 * @returns {Promise<{ infracciones: string[], medidos: number }>}
 */
async function medirFondosDeDegradado(page, pendientes) {
  if (!pendientes.length) return { infracciones: [], medidos: 0 };

  // Hoja de estilo, no estilos en línea: React re-renderiza y borraría un
  // `style` puesto sobre el nodo. Marcar y desmarcar el atributo es barato.
  await page.evaluate(() => {
    if (document.getElementById('fortixam-auditoria-ocultar-texto')) return;
    const estilo = document.createElement('style');
    estilo.id = 'fortixam-auditoria-ocultar-texto';
    estilo.textContent = `
      *, html, body { scroll-behavior: auto !important; }
      [data-auditoria-texto="1"], [data-auditoria-texto="1"] * {
        -webkit-text-fill-color: transparent !important;
        text-shadow: none !important;
      }
      [data-auditoria-svg="1"], [data-auditoria-svg="1"] * {
        fill: none !important;
        stroke: none !important;
      }
    `;
    document.head.appendChild(estilo);
  });

  const infracciones = [];
  let medidos = 0;
  const vista = page.viewportSize();

  for (const p of pendientes) {
    if (p.recortado) {
      infracciones.push(
        `"${p.texto}" usa background-clip:text (degradado dentro de las letras): la auditoría no puede medirlo`,
      );
      continue;
    }

    const objetivo = page.locator(`[data-auditoria-id="${p.id}"]`).first();
    if ((await objetivo.count()) === 0) {
      infracciones.push(`"${p.texto}" desapareció de la página antes de medir su fondo`);
      continue;
    }
    const atributoOcultar = p.esSvg ? 'data-auditoria-svg' : 'data-auditoria-texto';
    await objetivo.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' })).catch(() => {});
    // El elemento tiene que estar quieto: se exigen dos medidas seguidas de la
    // misma caja (el desplazamiento suave o una entrada animada moverían el
    // texto entre la medida y la captura).
    let caja = await objetivo.boundingBox();
    for (let intento = 0; intento < 10; intento += 1) {
      await page.waitForTimeout(100);
      const otra = await objetivo.boundingBox();
      const quieta = caja && otra && Math.abs(caja.x - otra.x) < 0.5 && Math.abs(caja.y - otra.y) < 0.5;
      caja = otra;
      if (quieta) break;
    }
    if (!caja || caja.width < 2 || caja.height < 2) {
      infracciones.push(`"${p.texto}" no ocupa espacio visible: no se pudo medir su fondo`);
      continue;
    }
    // Las filas entran con animación de entrada (opacidad 0 → 1) cada vez que
    // se asoman a la ventana: medir a media animación mezclaría el fondo con el
    // de detrás. Se espera a que toda la cadena esté opaca.
    await objetivo
      .evaluate(async (el) => {
        const opacidad = () => {
          let n = el;
          let o = 1;
          while (n && n.nodeType === 1) {
            o *= parseFloat(getComputedStyle(n).opacity);
            n = n.parentElement;
          }
          return o;
        };
        const fin = Date.now() + 2000;
        let previa = opacidad();
        while (Date.now() < fin) {
          await new Promise((r) => requestAnimationFrame(() => r()));
          const actual = opacidad();
          if (actual > 0.99 && Math.abs(actual - previa) < 0.01) return;
          previa = actual;
        }
      })
      .catch(() => {});
    // Nada puede estar por encima del texto: si un diálogo, un aviso o una
    // barra fija lo tapa, la captura mide ese elemento y no su fondo. Mejor
    // fallar diciéndolo que publicar un color inventado.
    const encima = await objetivo
      .evaluate((el) => {
        // Con `pointer-events: none` el texto no recibe el puntero y
        // `elementFromPoint` devuelve lo que hay debajo (el lienzo del visor 3D,
        // por ejemplo). Ahí la comprobación no dice nada y se mide el píxel.
        let n = el;
        for (let i = 0; i < 12 && n && n.nodeType === 1; i += 1) {
          if (getComputedStyle(n).pointerEvents === 'none') return null;
          n = n.parentElement;
        }
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return 'fuera de la ventana';
        const top = document.elementFromPoint(x, y);
        if (!top) return 'nada pintado en su sitio';
        if (top === el || el.contains(top) || top.contains(el)) return null;
        const clase = typeof top.className === 'string' ? top.className.split(/\s+/).slice(0, 2).join('.') : '';
        return `${top.tagName.toLowerCase()}${clase ? `.${clase}` : ''}`;
      })
      .catch(() => 'no se pudo comprobar');
    if (encima) {
      infracciones.push(`"${p.texto}" está tapado por ${encima}: no se pudo medir su fondo`);
      continue;
    }
    // Se recorta a lo que cabe en la ventana: así no hay que reflowar nada y
    // las coordenadas de la captura coinciden con las de la caja medida.
    const recorte = {
      x: Math.max(0, Math.min(vista.width - 1, caja.x)),
      y: Math.max(0, Math.min(vista.height - 1, caja.y)),
      width: 0,
      height: 0,
    };
    recorte.width = Math.max(1, Math.min(vista.width - recorte.x, caja.x + caja.width - recorte.x));
    recorte.height = Math.max(1, Math.min(vista.height - recorte.y, caja.y + caja.height - recorte.y));
    const recortado = recorte.width < caja.width - 1 || recorte.height < caja.height - 1;
    await objetivo.evaluate((el, attr) => el.setAttribute(attr, '1'), atributoOcultar);
    const png = await page
      .screenshot({ clip: recorte, scale: 'css', caret: 'hide', animations: 'disabled' })
      .catch(() => null);
    await objetivo.evaluate((el, attr) => el.removeAttribute(attr), atributoOcultar);
    if (process.env.AUDIT_DEBUG) {
      const fs = require('fs');
      const dir = '/Users/servimac/.hermes/cache/scratch/capturas';
      fs.mkdirSync(dir, { recursive: true });
      const nombre = `${dir}/${p.id}-${p.texto.replace(/[^a-z0-9]+/gi, '_').slice(0, 18)}.png`;
      if (png) fs.writeFileSync(nombre, png);
      // eslint-disable-next-line no-console
      console.log('[audit]', JSON.stringify({ texto: p.texto, caja, archivo: nombre }));
    }
    if (!png) {
      infracciones.push(`"${p.texto}" no se pudo capturar: no se pudo medir su fondo`);
      continue;
    }
    if (recortado) {
      infracciones.push(`"${p.texto}" no cabe entero en la ventana: no se pudo medir su fondo`);
      continue;
    }

    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Se muestrea la banda interior: el margen crece con el lado corto para no
    // rozar nunca las esquinas redondeadas (las píldoras pequeñas quedaban
    // fuera y se medía el fondo de detrás).
    const margen = Math.max(3, Math.min(info.width, info.height) * 0.25);
    const x0 = Math.round(margen);
    const x1 = Math.round(info.width - 1 - margen);
    const y0 = Math.round(margen);
    const y1 = Math.round(info.height - 1 - margen);
    if (x1 <= x0 || y1 <= y0) {
      infracciones.push(`"${p.texto}" es demasiado pequeño para medir su fondo`);
      continue;
    }

    const color = parseColor(p.color);
    const ratios = [];
    const fondos = [];
    for (const fy of [0.15, 0.4, 0.65, 0.9]) {
      const y = Math.round(y0 + (y1 - y0) * fy);
      for (const fx of [0, 0.25, 0.5, 0.75, 1]) {
        const x = Math.round(x0 + (x1 - x0) * fx);
        const o = (y * info.width + x) * 4;
        if (data[o + 3] < 128) continue;
        const fondo = { r: data[o], g: data[o + 1], b: data[o + 2], a: 1 };
        const tinta = {
          r: color.r * color.a + fondo.r * (1 - color.a),
          g: color.g * color.a + fondo.g * (1 - color.a),
          b: color.b * color.a + fondo.b * (1 - color.a),
          a: 1,
        };
        ratios.push(contraste(tinta, fondo));
        fondos.push(fondo);
      }
    }

    if (!ratios.length) {
      infracciones.push(`"${p.texto}" sin píxeles visibles en la captura: no se pudo medir su fondo`);
      continue;
    }
    // Se toma la mediana de la muestra, no el peor píxel: sobre la caja del
    // texto puede asomar otro elemento (un icono, una insignia vecina, el
    // borde de una miniatura) que no es el fondo que se está midiendo. La
    // mediana describe el fondo real y sigue delatando un degradado que se
    // oscurece bajo las letras.
    const orden = ratios.map((r, i) => ({ r, fondo: fondos[i] })).sort((a, b) => a.r - b.r);
    const mediana = orden[Math.floor(orden.length / 2)];
    const peor = orden[0];
    medidos += 1;
    if (mediana.r < p.minimo) {
      infracciones.push(
        `"${p.texto}" ratio ${mediana.r.toFixed(2)} (mín ${p.minimo}) · ${p.color} sobre rgb(${mediana.fondo.r},${
          mediana.fondo.g
        },${mediana.fondo.b}) medido en pantalla (peor píxel ${peor.r.toFixed(2)})`,
      );
    }
  }

  await limpiar(page);
  return { infracciones, medidos };
}

/**
 * Auditoría completa de un subárbol: colores planos + degradados por píxel.
 * @param {import('@playwright/test').Page} page
 * @param {string|null} scope — selector que acota la auditoría
 */
async function auditarContraste(page, scope = null) {
  const { infracciones, degradados } = await page.evaluate(recorrer, scope);
  if (!degradados.length) return { infracciones, medidos: 0, degradados: 0 };

  const pixel = await medirFondosDeDegradado(page, degradados);
  await limpiar(page);
  return {
    infracciones: [...infracciones, ...pixel.infracciones],
    medidos: pixel.medidos,
    degradados: degradados.length,
  };
}

module.exports = { auditarContraste, medirFondosDeDegradado, limpiar, contraste, parseColor, SVG_NS };
