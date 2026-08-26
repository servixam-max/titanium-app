#!/usr/bin/env node
/**
 * Generate a production-ready service worker for the static Next.js export.
 * Run after `next build` and before `npx cap sync`.
 */
const fs = require("fs");
const path = require("path");

const DIST_DIR = path.join(__dirname, "..", "dist");
const SW_PATH = path.join(DIST_DIR, "sw.js");

function walk(dir, base = "") {
  const entries = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === "sw.js") continue; // don't cache itself
    const fullPath = path.join(dir, file);
    const relativePath = path.posix.join(base, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      entries.push(...walk(fullPath, relativePath));
    } else {
      entries.push("/" + relativePath.replace(/\\/g, "/"));
    }
  }
  return entries;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error("dist/ not found. Run `npm run build` first.");
    process.exit(1);
  }

  const assets = walk(DIST_DIR);

  // Separate assets by strategy
  const htmlRoutes = assets.filter((p) => p.endsWith(".html") && !p.includes("/_next/"));
  const staticAssets = assets.filter(
    (p) =>
      p.includes("/_next/") ||
      p.startsWith("/icons/") ||
      p.startsWith("/fonts/") ||
      p === "/manifest.json" ||
      p === "/sw.js"
  );
  const mediaAssets = assets.filter(
    (p) =>
      p.startsWith("/images/") ||
      p.startsWith("/audio/") ||
      p.startsWith("/screenshots/")
  );
  const shellRoutes = ["/", "/history", "/weight", "/stats", "/warmup", "/workout"];
  const shellFiles = shellRoutes.map((r) => (r === "/" ? "/index.html" : `${r}.html`));
  const precacheList = Array.from(new Set([...shellFiles, ...htmlRoutes, ...staticAssets]));

  const sw = `const CACHE_NAME = 'fortixam-v2';
const PRECACHE_ASSETS = ${JSON.stringify(precacheList, null, 2)};

// Install: precache shell and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/manifest.json'
  );
}

function isMediaAsset(url) {
  return (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/audio/') ||
    url.pathname.startsWith('/screenshots/')
  );
}

function isHtmlRoute(url) {
  return url.pathname.endsWith('.html') || url.pathname === '/';
}

function isApiRequest(url) {
  return url.pathname.includes('/api/');
}

// Fetch handler with different strategies per asset type
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API: always network
  if (isApiRequest(url)) return;

  // Static assets: cache-first, update in background
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Images/audio: stale-while-revalidate
  if (isMediaAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML/navigation: network-first with offline fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback to index for navigation requests
          if (event.request.mode === 'navigate' || isHtmlRoute(url)) {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
`;

  fs.writeFileSync(SW_PATH, sw);
  console.log(`Generated service worker at ${SW_PATH}`);
  console.log(`Precached ${precacheList.length} assets (${htmlRoutes.length} HTML, ${staticAssets.length} static, ${mediaAssets.length} media tracked)`);
}

main();
