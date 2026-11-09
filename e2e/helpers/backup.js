// Helpers compartidos: restaurar una copia de seguridad por el camino real
// (Ajustes → input de archivo), que es el mismo que usa una persona.
//
// La app no acepta copias sin usuario: se usa después de `seedSession`.

const { expect } = require('@playwright/test');

async function openSettings(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const boton = page.locator('button[aria-label*="Ajustes"]').first();
  await boton.waitFor({ timeout: 10_000 });
  await boton.click();
  await expect(page.getByText('Copias de Seguridad Locales')).toBeVisible({
    timeout: 8_000,
  });
}

async function restoreBackup(page, backup) {
  await openSettings(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'fortixam-backup-e2e.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText(/¡Datos restaurados!/)).toBeVisible({
    timeout: 10_000,
  });
}

module.exports = { openSettings, restoreBackup };
