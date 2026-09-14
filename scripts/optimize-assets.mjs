#!/usr/bin/env node
// FORTIXAM v8 — optimize static assets (images + fonts)

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "public", "images", "exercises");
const publicDir = path.join(root, "public");

const SUPPORTED = new Set([".webp", ".jpg", ".jpeg", ".png"]);
const MAX_SIZE_KB = 120;

let sharp;

async function walk(dir, extFilter) {
  const entries = [];
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      entries.push(...(await walk(full, extFilter)));
    } else if (extFilter(path.extname(f.name).toLowerCase())) {
      entries.push(full);
    }
  }
  return entries;
}

async function getSizeKb(file) {
  const stat = await fs.stat(file);
  return stat.size / 1024;
}

async function encodeTo(file, opts, pass = 1) {
  const dir = path.dirname(file);
  const ext = path.extname(file).toLowerCase();
  const isJpg = ext === ".jpg" || ext === ".jpeg";
  const tmpExt = isJpg ? `.tmp${pass}.jpg` : `.tmp${pass}.webp`;
  const tmp = path.join(dir, `${path.basename(file, ext)}${tmpExt}`);

  const pipeline = sharp(file).resize({
    width: opts.width,
    height: opts.width,
    fit: "inside",
    withoutEnlargement: true,
  });
  if (isJpg) {
    pipeline.jpeg({ quality: opts.quality, mozjpeg: true });
  } else {
    pipeline.webp({ quality: opts.quality, effort: 6 });
  }
  await pipeline.toFile(tmp);
  return tmp;
}

async function main() {
  const compress = process.argv.includes("--compress");
  console.log(`🔍 Scanning assets${compress ? " and compressing" : ""}...`);

  if (compress) {
    try {
      sharp = (await import("sharp")).default;
    } catch {
      console.error("❌ sharp no está instalado. Instálalo con: npm install --save-dev sharp");
      process.exit(1);
    }
  }

  let oversized = 0;
  let totalImages = 0;
  let savedKb = 0;
  const imageFiles = await walk(imagesDir, (ext) => SUPPORTED.has(ext)).catch(() => []);

  for (const file of imageFiles) {
    totalImages++;
    const kb = await getSizeKb(file);
    if (kb > MAX_SIZE_KB) {
      oversized++;
      if (compress) {
        const originalSize = await fs.stat(file).then((s) => s.size);

        // Primera pasada: alta calidad (1440px, q85/q82)
        let tmp = await encodeTo(file, { width: 1440, quality: file.match(/\.jpe?g$/) ? 82 : 85 }, 1);
        let newSize = await fs.stat(tmp).then((s) => s.size);

        // Segunda pasada si sigue por encima del presupuesto
        if (newSize / 1024 > MAX_SIZE_KB) {
          const tmp2 = await encodeTo(file, { width: 1080, quality: 76 }, 2);
          const size2 = await fs.stat(tmp2).then((s) => s.size);
          if (size2 < newSize) {
            await fs.rm(tmp).catch(() => {});
            tmp = tmp2;
            newSize = size2;
          } else {
            await fs.rm(tmp2).catch(() => {});
          }
        }

        const dir = path.dirname(file);
        const ext = path.extname(file).toLowerCase();
        const isJpg = ext === ".jpg" || ext === ".jpeg";
        await fs.rename(tmp, path.join(dir, `${path.basename(file, ext)}${isJpg ? ".jpg" : ".webp"}`));
        savedKb += (originalSize - newSize) / 1024;
        const stillOver = newSize / 1024 > MAX_SIZE_KB ? " (⚠️ límite no alcanzado)" : "";
        console.log(`✅ Compressed ${path.relative(root, file)} (${kb.toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB)${stillOver}`);
      } else {
        console.log(`⚠️  Oversized: ${path.relative(root, file)} (${kb.toFixed(1)} KB)`);
      }
    }
  }

  // Check for unreferenced legacy formats
  const allPublicImages = await walk(publicDir, (ext) => SUPPORTED.has(ext));
  const webpCount = allPublicImages.filter((f) => f.endsWith(".webp")).length;
  const jpgCount = allPublicImages.filter((f) => f.endsWith(".jpg") || f.endsWith(".jpeg")).length;

  console.log(`\n📦 Asset report:`);
  console.log(`   Total exercise images: ${totalImages}`);
  console.log(`   Oversized (>${MAX_SIZE_KB} KB): ${oversized}`);
  console.log(`   WebP: ${webpCount} · JPG/JPEG: ${jpgCount}`);
  if (compress) {
    console.log(`   Approx saved: ${savedKb.toFixed(1)} KB`);
  } else if (oversized > 0) {
    console.log(`\n💡 Run with --compress to re-encode oversized images (requires sharp).`);
  }
}

main().catch((err) => {
  console.error("Asset optimization error:", err);
  process.exit(1);
});
