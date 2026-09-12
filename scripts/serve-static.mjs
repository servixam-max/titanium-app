#!/usr/bin/env node
// FORTIXAM v8 — minimal static server for e2e tests and local preview.
// Serves the static export (dist-apk) exactly as the APK WebView sees it.

import { createServer } from "http";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const distArg = process.argv[2] || "dist-apk";
const DIST = path.isAbsolute(distArg) ? distArg : path.join(root, distArg);
const PORT = Number(process.argv[3]) || 3310;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);

    // Exact file
    let filePath = path.join(DIST, pathname);
    if (
      !(await fs.stat(filePath).then((s) => s.isFile()).catch(() => false)) &&
      !(await fs.stat(path.join(DIST, pathname, "index.html")).then((s) => s.isFile()).catch(() => false))
    ) {
      // Clean URLs: /history → history.html (v8 export emits flat .html files)
      const flat = path.join(DIST, `${pathname.replace(/\/$/, "")}.html`);
      if (await fs.stat(flat).then((s) => s.isFile()).catch(() => false)) {
        filePath = flat;
      } else if (await fs.stat(path.join(DIST, pathname, "index.html")).then((s) => s.isFile()).catch(() => false)) {
        filePath = path.join(DIST, pathname, "index.html");
      } else {
        const notFound = path.join(DIST, "404.html");
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end(await fs.readFile(notFound).catch(() => "Not found"));
        return;
      }
    }

    // Directory → index.html
    if ((await fs.stat(filePath).then((s) => s.isDirectory()).catch(() => false))) {
      filePath = path.join(filePath, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const body = await fs.readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Static server: http://127.0.0.1:${PORT} ← ${path.relative(root, DIST)}`);
});