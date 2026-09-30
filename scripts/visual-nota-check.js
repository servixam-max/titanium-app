const { chromium, devices } = require('@playwright/test');
const { seedSession } = require('../e2e/helpers/session');
const { seedWorkout } = require('../e2e/helpers/workout-session');

// Comprobación visual real (F2.1): la nota del ejercicio en el entreno, con el
// teclado cerrado y abierta, en claro y oscuro, a 375 px de ancho.
(async () => {
  const browser = await chromium.launch();
  for (const tema of ['dark', 'light']) {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    await seedSession(page, { theme: tema });
    await seedWorkout(page, { mode: 'individual' });
    await page.goto('http://127.0.0.1:3310/workout/individual');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(900);

    const pill = page.locator('button[aria-label="Añadir nota del ejercicio"]');
    await pill.waitFor({ timeout: 8000 });
    const box = await pill.boundingBox();
    const ancho = page.viewportSize().width;
    console.log(`[${tema}] píldora: x=${Math.round(box.x)} y=${Math.round(box.y)} w=${Math.round(box.width)} h=${Math.round(box.height)} (viewport ${ancho}px)`);
    console.log(`[${tema}] zona táctil ≥44px de alto: ${box.height >= 44 ? 'SÍ' : 'NO (' + box.height + 'px)'}`);

    await page.screenshot({ path: `/tmp/nota-${tema}-cerrada.png` });

    // Abrir el campo y escribir
    await pill.click();
    await page.waitForTimeout(350);
    const input = page.locator('input[aria-label="Nota del ejercicio"]');
    await input.waitFor({ timeout: 5000 });
    const ibox = await input.boundingBox();
    const fontSize = await input.evaluate((el) => getComputedStyle(el).fontSize);
    console.log(`[${tema}] campo abierto: h=${Math.round(ibox.height)}px fontSize=${fontSize}`);
    await page.screenshot({ path: `/tmp/nota-${tema}-abierta.png` });

    await input.fill('Subir a 42,5 kg, el codo me molestó en la última');
    await input.press('Enter');
    await page.waitForTimeout(600);

    const guardada = page.locator('button[aria-label="Editar nota del ejercicio"]');
    await guardada.waitFor({ timeout: 5000 });
    const texto = await guardada.textContent();
    console.log(`[${tema}] tras guardar: "${texto.trim()}"`);
    const gbox = await guardada.boundingBox();
    console.log(`[${tema}] píldora guardada: w=${Math.round(gbox.width)} h=${Math.round(gbox.height)} dentro del viewport: ${gbox.x >= 0 && gbox.x + gbox.width <= ancho}`);
    await page.screenshot({ path: `/tmp/nota-${tema}-guardada.png` });

    // Contraste real del texto de la nota contra su fondo
    const ratio = await page.evaluate(() => {
      const parse = (v) => { const m = String(v).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x.trim())); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const over = (f, b) => ({ r: f.r * (f.a ?? 1) + b.r * (1 - (f.a ?? 1)), g: f.g * (f.a ?? 1) + b.g * (1 - (f.a ?? 1)), b: f.b * (f.a ?? 1) + b.b * (1 - (f.a ?? 1)), a: 1 });
      const lum = ({ r, g, b }) => { const ch = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b); };
      const el = document.querySelector('button[aria-label="Editar nota del ejercicio"]');
      const cs = getComputedStyle(el);
      const chain = []; let n = el;
      while (n && n.nodeType === 1) { chain.push(parse(getComputedStyle(n).backgroundColor)); n = n.parentElement; }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = chain.length - 1; i >= 0; i -= 1) if (chain[i] && chain[i].a > 0) bg = over(chain[i], bg);
      const fg = over(parse(cs.color), bg);
      const [hi, lo] = lum(fg) > lum(bg) ? [lum(fg), lum(bg)] : [lum(bg), lum(fg)];
      return { ratio: ((hi + 0.05) / (lo + 0.05)).toFixed(2), color: cs.color, fondo: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` };
    });
    console.log(`[${tema}] contraste de la nota: ${ratio.ratio}:1 (${ratio.color} sobre ${ratio.fondo})`);

    await context.close();
  }
  await browser.close();
})();
