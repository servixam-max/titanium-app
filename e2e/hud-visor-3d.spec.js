const { test, expect } = require('@playwright/test');
const { seedSession } = require('./helpers/session');

// FORTIXAM — HUD del visor 3D (F6.2).
//
// La píldora de músculos del visor 3D debe caber en UNA línea en móvil
// estrecho, tanto vacía («Sin músculos aún») como encendida («N/16 músculos»).
// Antes decía «SIN MÚSCULOS TRABAJADOS AÚN» y «12/16 MÚSCULOS TRABAJADOS», y
// ambas formas partían en dos líneas dentro de su píldora (medido a 375 y
// 412 px); además, al no caber la derecha, el flex encogía también la píldora
// izquierda y «360° APAGADO» se partía de rebote. Esta prueba mide el número
// real de líneas del texto (rectángulos de línea del navegador) y que nada
// desborde su caja, a los anchos de móvil habituales. Si alguien vuelve a
// alargar el texto, falla aquí.

const ANCHOS = [360, 375, 412];

/** Número de líneas que ocupa el texto de un elemento (rectángulos de línea). */
function lineasDeTexto(locator) {
  return locator.evaluate((el) => {
    const rango = document.createRange();
    rango.selectNodeContents(el);
    const tops = new Set(
      [...rango.getClientRects()]
        .filter((r) => r.width > 1 && r.height > 1)
        .map((r) => Math.round(r.top)),
    );
    return tops.size;
  });
}

/** Comprueba a varios anchos que la píldora del HUD está en una sola línea. */
async function esperarPildoraEnUnaLinea(page, pildora, etiqueta) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 812 });
    await page.waitForTimeout(250);

    expect(
      await lineasDeTexto(pildora),
      `«${etiqueta}» ocupa más de una línea a ${ancho} px`,
    ).toBe(1);

    const caja = await pildora.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { alto: Math.round(r.height), scrollW: el.scrollWidth, clientW: el.clientWidth };
    });
    // Una línea mide 20 px de alto (16 de línea + 2+2 de padding); dos líneas
    // miden 36. Se admite hasta 24 por si el sistema cambia el interlineado.
    expect(caja.alto, `la píldora mide ${caja.alto} px de alto a ${ancho} px`).toBeLessThanOrEqual(24);
    expect(
      caja.scrollW,
      `el texto desborda su píldora a ${ancho} px (${caja.scrollW} > ${caja.clientW})`,
    ).toBeLessThanOrEqual(caja.clientW + 1);
  }
}

// Copia de seguridad con un entreno de HOY (pecho en el catálogo: con un
// juego de 20 kg × 10 reps el contador del HUD se enciende), lista para
// restaurar por el mismo camino que existe en la app: Ajustes → Restaurar.
function localNowMinus(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

const BACKUP = {
  app: 'FORTIXAM',
  version: '8.5.34',
  exportedAt: '2026-10-01T08:00:00.000Z',
  user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
  sessions: [
    {
      id: 'hud-hoy',
      clientId: 'e2e',
      ownerUserId: 'e2e-user-id',
      createdAt: localNowMinus(90),
      modifiedAt: localNowMinus(30),
      version: 1,
      routineId: 1,
      routineName: 'Día 1: Empuje',
      mode: 'individual',
      startTime: localNowMinus(90),
      endTime: localNowMinus(30),
      completed: true,
      exercises: [
        {
          id: 'hud-hoy-log',
          clientId: 'e2e',
          ownerUserId: 'e2e-user-id',
          createdAt: localNowMinus(90),
          modifiedAt: localNowMinus(30),
          version: 1,
          exerciseId: 'e2e-bench',
          exerciseName: 'Press de Banca Plano',
          order: 0,
          sets: [
            {
              id: 'hud-hoy-set',
              clientId: 'e2e',
              ownerUserId: 'e2e-user-id',
              createdAt: localNowMinus(90),
              modifiedAt: localNowMinus(30),
              version: 1,
              setNumber: 1,
              weight: 20,
              reps: 10,
              completed: true,
              timestamp: localNowMinus(60),
            },
          ],
        },
      ],
    },
  ],
  weights: [],
  lastExerciseWeights: {},
};

test.describe('HUD del visor 3D (F6.2)', () => {
  test('sin datos, «Sin músculos aún» cabe en una línea', async ({ page }) => {
    await seedSession(page);
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const pildora = page.locator('span', { hasText: 'Sin músculos aún' }).first();
    await expect(pildora).toBeVisible({ timeout: 10_000 });

    await esperarPildoraEnUnaLinea(page, pildora, 'Sin músculos aún');
  });

  test('con datos, el contador «N/16 músculos» también cabe en una línea', async ({ page }) => {
    await seedSession(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Restaurar una copia con un entreno de hoy (camino real: Ajustes)
    const boton = page.locator('button[aria-label*="Ajustes"]').first();
    await boton.waitFor({ timeout: 10_000 });
    await boton.click();
    await expect(page.getByText('Copias de Seguridad Locales')).toBeVisible({ timeout: 8_000 });

    await page.locator('input[type="file"]').setInputFiles({
      name: 'fortixam-backup-hud.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(BACKUP)),
    });
    await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({ timeout: 10_000 });

    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const pildora = page.locator('span', { hasText: /\d+\/16 músculos/ }).first();
    await expect(pildora).toBeVisible({ timeout: 10_000 });
    await expect(pildora).not.toHaveText(/TRABAJADOS/);

    await esperarPildoraEnUnaLinea(page, pildora, 'N/16 músculos');
  });
});
