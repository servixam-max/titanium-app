# FORTIXAM (Titanium) ⚡

App de fitness PWA + Android con entrenamientos guiados e individuales, seguimiento de fuerza y peso. Diseño Cyber-Titanium, offline-first, y desde la **v8**: cuentas reales, sincronización multi-dispositivo y coach inteligente.

---

## 🚀 Características v8

- **13 rutinas especializadas** (fuerza, HIIT Tabata, full body, movilidad, libre) + catálogo completo de ejercicios con búsqueda por músculo y equipamiento.
- **Cuentas y sync**: registro/login con JWT (bcrypt) contra PostgreSQL; cola de sincronización offline-first con resolución de conflictos last-write-wins. El APK funciona sin conexión y sincroniza cuando hay red.
- **Coach inteligente**: onboarding de 5 pasos (objetivo, nivel, días/semana, equipo, limitaciones) y generación automática de un plan personalizado.
- **Temporizador adaptativo**: el descanso se ajusta por tipo de ejercicio y duración de la serie; supersets detectados y señalados en la UI.
- **HUD de alta visibilidad** con estética Titanium Energy (`#05090C` / `#00D68F`), modos claro y alto contraste.
- **OTA**: distribución del APK vía GitHub Releases.
- **Testing**: Vitest (unit) + Playwright (e2e contra el export estático).

## 🏗️ Arquitectura

| Pieza | Tecnología |
|---|---|
| Web/PWA | Next.js 16 (App Router, Turbopack), React 19, `output: 'standalone'` |
| APK Android | Next.js `output: 'export'` estático + Capacitor 8 |
| Datos cliente | Dexie (IndexedDB) con entidades sincizables (`version`, `deleted`, `modifiedAt`) |
| Servidor | API Routes de Next.js + PostgreSQL (esquema en `server/schema.sql`) |
| Estado | Zustand persistido |
| Estilos | Tailwind CSS con tokens Titanium Energy |

Un único `next build` cambia de modo con `BUILD_MODE`: sin la variable produce el bundle standalone del servidor web; con `BUILD_MODE=apk` produce el export estático para el WebView (las API routes quedan excluidas — el APK opera offline-first).

## ⚙️ Puesta en marcha

```bash
npm install
cp .env.example .env        # ajusta secretos y credenciales
npm run dev                # http://localhost:3000
```

Necesitas PostgreSQL con el esquema aplicado:

```bash
psql -h localhost -U titanium -d titanium -f server/schema.sql
```

O todo con Docker (Postgres + web, esquema auto-aplicado):

```bash
cp .env.example .env       # define JWT_SECRET y JWT_REFRESH_SECRET
npm run build:web
docker compose up -d       # http://localhost:3000
```

## 🔨 Builds de producción

```bash
npm run build:web     # bundle standalone → .next-standalone/standalone
                      # arranca: PORT=3000 HOSTNAME=0.0.0.0 node .next-standalone/standalone/server.js

npm run build:apk     # export estático + service worker + cap sync + gradle assembleRelease
                      # (gradle requiere Android SDK; el resto es portable)

node scripts/optimize-assets.mjs            # informe de imágenes
node scripts/optimize-assets.mjs --compress  # re-encode de imágenes >120KB a WebP
```

## 🧪 Tests

```bash
npm test              # Vitest (unit: coach, auth server, workout)
npm run test:e2e      # Playwright contra dist-apk (requiere export: npm run build:apk)
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript
```

Los e2e siembran un usuario en localStorage (`fortixam_server_user`) para saltar AuthModal y cubren el flujo real: rutina → modal de calentamiento → modo guiado/individual.

## 📦 Publicar una versión

```bash
npm run release       # unifica versión en package.json, version.json, ota_server, build.gradle
npm run build:apk     # APK
cd android && ./gradlew assembleRelease
cp android/app/build/outputs/apk/release/app-release.apk FORTIXAM-<version>.apk
./scripts/publish-release.sh   # GitHub Releases (OTA)
```

## 🤖 Guía para desarrolladores e IA

👉 **[AI_MAINTENANCE_GUIDE.md](./AI_MAINTENANCE_GUIDE.md)**

## 📥 Descarga del APK

Última versión en **[Releases de GitHub](https://github.com/servixam-max/titanium-app/releases/latest)**.