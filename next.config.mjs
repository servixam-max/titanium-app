/** @type {import('next').NextConfig} */
const isApkBuild = process.env.BUILD_MODE === "apk";

const nextConfig = {
  // Web/PWA uses Next.js server (API Routes, SSR when needed)
  // APK build uses static export for Capacitor
  output: isApkBuild ? "export" : "standalone",
  distDir: isApkBuild ? "dist-apk" : ".next-standalone",
  images: {
    unoptimized: isApkBuild,
  },
  // Static export can't ship server-side Route Handlers (all of them are
  // `route.ts`). In APK mode we drop `.ts` from routing extensions so the
  // API routes are excluded from the export build while pages (`page.tsx`
  // and friends) are kept. The APK runs offline-first and talks to the
  // hosted web API when available.
  ...(isApkBuild
    ? { pageExtensions: ["tsx", "jsx", "js"] }
    : {
        async headers() {
          return [
            {
              source: "/api/:path*",
              headers: [
                { key: "Access-Control-Allow-Origin", value: "*" },
                { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
                { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-refresh-token" },
              ],
            },
          ];
        },
      }),
  // Allow the standalone server to serve the PWA at a subpath if needed
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
};

export default nextConfig;