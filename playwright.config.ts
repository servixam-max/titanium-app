import { defineConfig, devices } from "@playwright/test";

/**
 * FORTIXAM v8 — e2e contra el export estático (dist-apk),
 * exactamente lo que sirve el WebView del APK.
 *
 * Requisito: dist-apk generado → `BUILD_MODE=apk npx next build && node scripts/generate-sw.js dist-apk`
 * Ejecutar:  `npm run test:e2e`
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3310",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "allow",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "node scripts/serve-static.mjs dist-apk 3310",
    url: "http://127.0.0.1:3310",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});