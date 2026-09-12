#!/usr/bin/env node
/**
 * FORTIXAM release script — single source of truth: package.json
 *
 * Usage:
 *   node scripts/release.mjs [patch|minor|major| prerelease <alpha|beta> ]
 *
 * Without arguments it propagates the current package.json version to all
 * files without bumping it.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FILES = {
  package: path.join(ROOT, "package.json"),
  version: path.join(ROOT, "version.json"),
  ota: path.join(ROOT, "ota_server", "version.json"),
  otaSync: path.join(ROOT, "src", "lib", "ota-sync.ts"),
  gradle: path.join(ROOT, "android", "app", "build.gradle"),
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

function parseSemver(version) {
  const clean = String(version).replace(/^[vV]/, "");
  const [core, pre = ""] = clean.split("-");
  const [major, minor, patch] = core.split(".").map((p) => parseInt(p, 10) || 0);
  const preMatch = pre.match(/^([a-z]+)\.(\d+)$/i);
  const preId = preMatch ? preMatch[1] : pre || "";
  const preNum = preMatch ? parseInt(preMatch[2], 10) : 0;
  return { major, minor, patch, pre: pre || "", preId, preNum, raw: clean };
}

function bumpVersion(current, bumpType, channel) {
  const v = parseSemver(current);
  switch (bumpType) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    case "prerelease": {
      const pre = channel || v.preId || "alpha";
      const nextPreNum = v.preId === pre ? v.preNum + 1 : 1;
      return `${v.major}.${v.minor}.${v.patch}-${pre}.${nextPreNum}`;
    }
    default:
      return current;
  }
}

function deriveVersionCode(version, previousCode) {
  // Keep monotonic: if previous exists and higher than computed, use previous + 1
  const v = parseSemver(version);
  const computed = v.major * 1_000_000 + v.minor * 1_000 + v.patch;
  if (previousCode && computed <= previousCode) {
    return previousCode + 1;
  }
  return computed;
}

function updateOtaSync(content, version, versionCode, buildType) {
  return content
    .replace(
      /export const APP_VERSION: AppVersion = \{[\s\S]*?\};/,
      `export const APP_VERSION: AppVersion = {
  version: "${version}",
  versionCode: ${versionCode},
  buildType: "${buildType}",
};`,
    )
    .replace(
      /version: "[^"]+",\s*\n\s*versionCode: \d+,/,
      `version: "${version}",\n  versionCode: ${versionCode},`,
    );
}

function updateGradle(content, version, versionCode) {
  return content
    .replace(/versionCode \d+/, `versionCode ${versionCode}`)
    .replace(/versionName "[^"]+"/, `versionName "${version}"`);
}

function main() {
  const bumpType = process.argv[2] || "none";
  const channel = process.argv[3] || undefined;

  const pkg = readJson(FILES.package);
  const currentVersion = pkg.version;
  const newVersion = bumpType === "none" ? currentVersion : bumpVersion(currentVersion, bumpType, channel);

  const oldVersionJson = fs.existsSync(FILES.version) ? readJson(FILES.version) : {};
  const versionCode = deriveVersionCode(newVersion, oldVersionJson.versionCode);
  const buildType = oldVersionJson.buildType || "release";
  const apkName = `FORTIXAM-${newVersion}.apk`;
  const repo = "servixam-max/titanium-app";

  // 1. package.json
  pkg.version = newVersion;
  writeJson(FILES.package, pkg);

  // 2. version.json
  writeJson(FILES.version, {
    version: newVersion,
    versionCode,
    buildType,
    apkName,
  });

  // 3. ota_server/version.json
  writeJson(FILES.ota, {
    version: newVersion,
    versionCode,
    buildType,
    apkName,
    url: `https://github.com/${repo}/releases/download/v${newVersion}/${apkName}`,
  });

  // 4. src/lib/ota-sync.ts
  const otaSyncContent = fs.readFileSync(FILES.otaSync, "utf-8");
  fs.writeFileSync(FILES.otaSync, updateOtaSync(otaSyncContent, newVersion, versionCode, buildType));

  // 5. android/app/build.gradle
  const gradleContent = fs.readFileSync(FILES.gradle, "utf-8");
  fs.writeFileSync(FILES.gradle, updateGradle(gradleContent, newVersion, versionCode));

  console.log(`\n🚀 FORTIXAM release prepared: ${currentVersion} → ${newVersion}`);
  console.log(`   versionCode: ${versionCode}`);
  console.log(`   buildType:   ${buildType}`);
  console.log(`   apkName:     ${apkName}`);
  console.log("\nUpdated files:");
  Object.values(FILES).forEach((f) => console.log("  -", path.relative(ROOT, f)));
  console.log("\nNext steps:");
  console.log(`  1. Review changes: git diff`);
  console.log(`  2. Build APK:     npm run build:apk`);
  console.log(`  3. Publish:       npm run release:publish`);
}

main();
