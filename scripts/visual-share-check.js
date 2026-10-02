const { chromium, devices } = require('@playwright/test');
const { seedSession } = require('../e2e/helpers/session');
const { seedWorkout } = require('../e2e/helpers/workout-session');

// Comprobación visual real (F2.5): el botón de compartir el resumen en la
// pantalla de fin de entreno. Pixel 7 a 375 y 412 px, claro y oscuro:
// zona táctil, contraste y que el toque funcione de verdad.

(async () => {
  const browser = await chromium.launch();

  for (const ancho of [375, 412]) {
    for (const tema of ['dark', 'light']) {
      const context = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await context.newPage();
      await page.addInitScript(() => {
        try {
          Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        } catch { /* redefinir no hace falta: el test lo comprueba igual */ }
      });
      await seedSession(page, { theme: tema });
      await seedWorkout(page, { mode: 'individual' });

      await page.goto('http://127.0.0.1:3310/workout/individual');
      await page.waitForLoadState('networkidle');
      await page.setViewportSize({ width: ancho, height: 900 });

      // Completar el entreno entero saltando descansos
      for (let i = 0; i < 12; i += 1) {
        const completar = page.getByRole('button', { name: /Completar serie|Finalizar/i }).first();
        if (!(await completar.isVisible().catch(() => false))) break;
        await completar.click({ force: true });
        await page.waitForTimeout(200);
        const saltar = page.locator('button:has-text("Saltar")').first();
        if (await saltar.isVisible().catch(() => false)) {
          await saltar.click({ force: true });
          await page.waitForTimeout(200);
        }
        if (page.url().includes('/workout/complete')) break;
      }
      await page.waitForURL(/\/workout\/complete/, { timeout: 10000 });
      await page.waitForTimeout(900);

      const boton = page.getByRole('button', { name: /Compartir resumen/i });
      await boton.waitFor({ timeout: 8000 });
      const caja = await boton.boundingBox();
      console.log(`[${ancho}px ${tema}] botón: x=${Math.round(caja.x)} y=${Math.round(caja.y)} w=${Math.round(caja.width)} h=${Math.round(caja.height)} · en viewport: ${caja.x >= 0 && caja.x + caja.width <= ancho}`);
      console.log(`[${ancho}px ${tema}] zona táctil ≥48px: ${caja.height >= 48 ? 'SÍ' : 'NO'}`);

      // Nada tapa el botón: el toque llega a él
      const encima = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const b = el && el.closest('button');
        return b ? (b.textContent || '').trim() : null;
      }, { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 });
      console.log(`[${ancho}px ${tema}] elementFromPoint: ${JSON.stringify(encima)}`);

      // Contraste del texto del botón contra su fondo real
      const datos = await page.evaluate(() => {
        const parse = (v) => { const m = String(v).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x.trim())); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const over = (f, b) => ({ r: f.r * (f.a ?? 1) + b.r * (1 - (f.a ?? 1)), g: f.g * (f.a ?? 1) + b.g * (1 - (f.a ?? 1)), b: f.b * (f.a ?? 1) + b.b * (1 - (f.a ?? 1)), a: 1 });
        const lum = ({ r, g, b }) => { const ch = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b); };
        const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Compartir resumen'));
        const cs = getComputedStyle(el);
        const chain = []; let n = el;
        while (n && n.nodeType === 1) { chain.push(parse(getComputedStyle(n).backgroundColor)); n = n.parentElement; }
        let bg = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = chain.length - 1; i >= 0; i -= 1) if (chain[i] && chain[i].a > 0) bg = over(chain[i], bg);
        const fg = over(parse(cs.color), bg);
        const [hi, lo] = lum(fg) > lum(bg) ? [lum(fg), lum(bg)] : [lum(bg), lum(fg)];
        return { ratio: ((hi + 0.05) / (lo + 0.05)).toFixed(2), color: cs.color, fondo: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, peso: cs.fontWeight, tam: cs.fontSize };
      });
      console.log(`[${ancho}px ${tema}] contraste: ${datos.ratio}:1 (${datos.color} sobre ${datos.fondo}, ${datos.tam}/${datos.peso})`);

      await page.screenshot({ path: `/tmp/share-${ancho}-${tema}.png` });

      // Y al pulsarlo, el aviso real
      await boton.click();
      await page.waitForTimeout(700);
      const aviso = await page.locator('text=/Resumen copiado|Compartido/').first().textContent().catch(() => null);
      console.log(`[${ancho}px ${tema}] aviso tras pulsar: ${JSON.stringify(aviso)}`);
      await page.screenshot({ path: `/tmp/share-${ancho}-${tema}-tras-pulsar.png` });

      await context.close();
    }
  }
  await browser.close();
})();
