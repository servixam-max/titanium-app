#!/usr/bin/env node
// FORTIXAM v8 — prepare the standalone deployment bundle.
// After `next build` (output: 'standalone', distDir '.next-standalone'),
// the server bundle lives in .next-standalone/standalone but needs
// the static chunks and the public folder copied next to it.

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, ".next-standalone");
const standalone = path.join(distDir, "standalone");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function cp(src, dest) {
  await fs.cp(src, dest, { recursive: true });
}

async function main() {
  if (!(await exists(standalone))) {
    console.error("❌ .next-standalone/standalone no existe. Ejecuta primero: npm run build");
    process.exit(1);
  }

  // 1. Copy static chunks → standalone/.next-standalone/static
  const staticSrc = path.join(distDir, "static");
  const staticDest = path.join(standalone, ".next-standalone", "static");
  if (await exists(staticSrc)) {
    await cp(staticSrc, staticDest);
    console.log("✅ static chunks →", path.relative(root, staticDest));
  }

  // 2. Copy public → standalone/public
  const publicSrc = path.join(root, "public");
  const publicDest = path.join(standalone, "public");
  if (await exists(publicSrc)) {
    await cp(publicSrc, publicDest);
    console.log("✅ public →", path.relative(root, publicDest));
  }

  console.log("\n📦 Bundle de despliegue listo: .next-standalone/standalone");
  console.log("   Arranca con: PORT=3000 HOSTNAME=0.0.0.0 node .next-standalone/standalone/server.js");
}

main().catch((err) => {
  console.error("prepare-standalone error:", err);
  process.exit(1);
});