# FORTIXAM (Titanium) ⚡

App de fitness PWA + Android con entrenamientos guiados e individuales, seguimiento de fuerza y peso. Diseño Cyber-Titanium, offline-first, y desde la **v8**: cuentas reales, sincronización multi-dispositivo y coach inteligente.

---

## 🚀 Características

- **13 rutinas especializadas** (fuerza, HIIT Tabata, full body, movilidad, libre) + catálogo completo de ejercicios con búsqueda por músculo y equipamiento.
- **Progresión de cargas**: al abrir cada ejercicio la app muestra tu última marca ("45 kg × 10, hace 3 días") y propone la de hoy con el motivo — sube peso al llegar al tope del rango, mantiene si el esfuerzo fue máximo, baja si te quedaste corto. Con precarga automática.
- **Plan que progresa**: semanas de acumulación con subidas de carga y semana de descarga cada 4 (6 en principiantes), visible como tira de semanas con su porcentaje.
- **Esfuerzo percibido (RPE)**: selector rápido al completar la serie que ajusta el descanso de verdad.
- **Cuentas y sync**: registro/login con JWT (bcrypt) contra PostgreSQL; cola de sincronización offline-first con merge por versión. El detalle del entrenamiento (series, pesos, RPE) viaja con la sesión. El APK funciona sin conexión y sincroniza cuando hay red.
- **Coach**: onboarding de 5 pasos (objetivo, nivel, días/semana, equipo, limitaciones) y generación automática de un plan personalizado.
- **Constructor de entrenamientos** (pestaña Creador): compón tu rutina desde el catálogo, define series por repeticiones o segundos HIIT, y arráncala en modo guiado o individual.
- **Cuerpo anatómico 3D interactivo** (WebGL/Three.js): mapa muscular con heatmap de volumen por grupos, escáner holográfico y fallback 2D sin WebGL.
- **Motor biomecánico**: volumen efectivo por músculo (primarios + sinergistas), equivalente de carga para peso corporal y stats por timeframe.
- **Gamificación y récords**: logros con progreso y récords personales por ejercicio (1RM, peso, reps) con una única definición de 1RM en toda la app.
- **Análisis del entrenamiento**: resumen post-entreno por reglas deterministas (volumen vs. media reciente, músculos trabajados, descanso sugerido). No usa ningún modelo de lenguaje.
- **Temporizador adaptativo**: el descanso se ajusta por tipo de ejercicio, duración y RPE; supersets detectados y señalados en la UI.
- **Modo claro y oscuro** con cambio sin parpadeo (zero-FOUC); todas las pantallas respetan el tema.
- **OTA**: distribución del APK vía GitHub Releases.
- **Testing**: Vitest (125 unit) + Playwright (16 e2e contra el export estático, incluidos contraste de modo claro y flujos de entreno).

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

## 🔄 Migración de base de datos (obligatoria en instalaciones existentes)

La corrección de sincronización cambió el esquema. Si ya tenías Postgres en marcha, aplica la migración **antes** de desplegar el código nuevo:

```bash
psql -h localhost -U titanium -d titanium -f server/migrations/001_sync_v2.sql
```

Es idempotente (se puede ejecutar varias veces) y hace dos cosas:

1. **`workout_sessions.exercises` (JSONB)** — el detalle del entrenamiento (ejercicios → series) viaja dentro de la sesión. Antes el endpoint de sync no lo devolvía, y el cliente guardaba sesiones vacías encima de las locales: eso es lo que borraba las series del historial. La migración además **rellena** el detalle de las sesiones ya guardadas desde `exercise_logs`/`set_logs`.
2. **`user_documents`** — tabla genérica para rutinas, ejercicios, planes planificados, logros y perfil, que antes se encolaban para sincronizar y el servidor descartaba en silencio.

Si la migración no se aplica, el endpoint `/api/sync` responde 500 (no encuentra la columna) y el cliente muestra error de sincronización. **No hay pérdida de datos**: el merge aplica solo lo que viene del servidor, así que el historial local queda intacto mientras se resuelve.

Para comprobar que quedó bien:

```bash
psql "$DATABASE_URL" -c "\d workout_sessions" | grep exercises
psql "$DATABASE_URL" -c "\d user_documents"
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
npm run verify        # las tres puertas de calidad en un comando:
                      # lint + tests + build APK (se para en la primera que falle)
npm test              # Vitest: sync-merge y sync-mapping, progresión, coach,
                      # biomecánica, gamificación, récords, voz, theme, auth server
npm run test:e2e      # Playwright contra dist-apk (requiere el export: npm run build:apk)
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript
```

Los e2e siembran un usuario en localStorage (`fortixam_server_user`) para saltar AuthModal y cubren: el humo de la PWA, el flujo real de entreno (rutina → modal de calentamiento → guiado/individual), el constructor personalizado y el contraste del modo claro con estilos calculados.

Nota: el merge de la sincronización tiene tests de regresión específicos (un payload del servidor sin detalle **no** debe borrar las series locales), y el filtrado por `user_id` de las consultas está cubierto en `sync-mapping`.

## 📦 Publicar una versión

```bash
npm run release       # unifica versión en package.json, version.json, ota_server, build.gradle
npm run build:apk     # APK
cd android && ./gradlew assembleRelease
cp android/app/build/outputs/apk/release/app-release.apk FORTIXAM-<version>.apk
./scripts/publish-release.sh   # GitHub Releases (OTA)
```

### Publicación automática (vía tag + GitHub Actions)

`./scripts/publish-release.sh` compila y publica en local, así que necesita el
Android SDK y el keystore a mano. El camino recomendado hoy es dejar que CI lo
haga: si empujas un tag `vX.Y.Z`, [GitHub Actions](./.github/workflows/build-apk.yml)
compila el APK, lo firma con `ANDROID_KEYSTORE_BASE64` y lo sube a la release de
ese tag — que es exactamente el canal que consulta el OTA de la app.

## 🔁 Mejora diaria automática

El proyecto tiene un circuito para publicar **una mejora pequeña y verificada
cada día** sin intervención manual: un cron de Hermes revisa qué tarea toca, la
implementa, pasa las puertas de calidad y publica una versión nueva.

```bash
scripts/next-improvement.sh           # imprime la siguiente tarea pendiente del plan

scripts/daily-improve.sh "feat(ui): resumen corto" "Motivo y alcance del cambio"
```

`daily-improve.sh` es el único punto de publicación y hace, en este orden:

1. valida que la rama es `main` y que el árbol está limpio (aborta si no);
2. `npm run verify` — las tres puertas de calidad (lint + `npm test -- --run` +
   `BUILD_MODE=apk npm run build`) en un solo comando: si alguna está en rojo,
   no se publica;
3. commitea el cambio del día;
4. sube la versión patch con `node scripts/release.mjs patch` (unifica
   `package.json`, `version.json`, `ota_server/version.json`, `src/lib/ota-sync.ts`
   y `android/app/build.gradle`) y lo commitea;
5. empuja `main`;
6. crea y empuja el tag `vX.Y.Z` → GitHub Actions compila y publica el APK.

El trabajo del día se define en [`docs/plan-mejora-diaria.md`](./docs/plan-mejora-diaria.md):
fases ordenadas por prioridad, una casilla por día, y una bitácora con la versión
en que se publicó cada una. Un día que no se marca casilla es un día que no se
publicó.

Para comprobar que la release quedó bien (el nombre del asset debe coincidir con
`apkName` de `version.json`):

```bash
gh release view vX.Y.Z --json tagName,assets
```

## 🤖 Guía para desarrolladores e IA

👉 **[AI_MAINTENANCE_GUIDE.md](./AI_MAINTENANCE_GUIDE.md)**

## 📥 Descarga del APK

Última versión en **[Releases de GitHub](https://github.com/servixam-max/titanium-app/releases/latest)**.