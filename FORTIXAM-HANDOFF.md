# FORTIXAM — Manual de Handoff

> **Última versión buena:** `main` apunta al commit `1acd694` de la rama `feat/fortixam-2.0`.  
> **Cualquier IA futura debe partir de `main` actual.** No usar ramas antiguas ni el estado anterior a `1acd694`.

---

## 1. Identidad del proyecto

- **Nombre comercial:** FORTIXAM  
- **Stack:** Next.js 16.3.3 + Capacitor 6 (Android) + Zustand + Dexie + Tailwind CSS + Framer Motion  
- **Repo:** `https://github.com/servixam-max/titanium-app.git`  
- **Rama de referencia:** `main`  
- **Commit base válido:** `1acd694`  
- **Rama de desarrollo histórica:** `feat/fortixam-2.0` (ya mergeada/rebaseada a `main`)

---

## 2. Estructura del repositorio

```
titanium-app/
├── android/                    # Proyecto Android de Capacitor
│   ├── app/
│   │   ├── build.gradle        # Minificación + shrinkResources activos
│   │   └── src/main/res/...    # Iconos, splash y strings FORTIXAM
│   └── gradle/
│       └── wrapper/            # Gradle 8.9
├── capacitor.config.json       # appName: "FORTIXAM", plugins core
├── docker-compose.yml          # Servidor Express de desarrollo (opcional)
├── eslint.config.mjs          # ESLint 9 flat config
├── next.config.apk.mjs         # Export estático a dist/ para APK
├── next.config.mjs             # Copia activa de next.config.apk.mjs
├── package.json                # Scripts de build y dependencias
├── public/
│   ├── images/exercises/       # 48 carpetas con screen.webp
│   ├── manifest.json           # PWA mínima
│   └── sounds/                 # MP3 de voz/feedback
├── scripts/
│   ├── generate-sw.js          # Genera service worker post-build
│   ├── optimize-images.js      # Conversión a WebP y limpieza
│   └── generate_exercise_svgs.py  # LEGADO: no usar; las imágenes ya son WebP
├── server/                     # Backend Express (sync opcional)
├── src/
│   ├── app/                    # Rutas Next.js / páginas Capacitor
│   │   ├── page.tsx            # Dashboard
│   │   ├── routine/[day]/      # Detalle de rutina
│   │   ├── workout/            # Entrenamientos guiado e individual
│   │   ├── history/            # Historial offline
│   │   ├── stats/              # Estadísticas offline
│   │   ├── weight/             # Registro de peso corporal
│   │   ├── audio/              # Configuración de audio/voz
│   │   └── _api_disabled/      # API routes legacy (desactivadas)
│   ├── components/ui/          # TopAppBar, BottomNav, RoutineCard...
│   ├── hooks/                  # useVoice, useHaptics...
│   ├── lib/
│   │   ├── data.ts             # Rutinas, ejercicios y planes semanales
│   │   ├── types.ts            # Tipos TypeScript
│   │   ├── store.ts            # Zustand + persistencia
│   │   ├── db.ts               # Dexie (IndexedDB)
│   │   ├── api-config.ts       # Backend deshabilitado
│   │   ├── audio.ts            # Utilidades de audio
│   │   ├── speech.ts           # TTS nativo / MP3
│   │   └── logger.ts           # Logger mínimo
│   └── ...
├── .env.example                # Variables de entorno de ejemplo
├── key.properties.template     # Plantilla para firma de release
└── README.md                   # README original
```

---

## 3. Rama correcta y estado del repo

```bash
# Verificar siempre que estamos en main y en el commit bueno
cd /Users/servimac/apps/Titanium/titanium-app
git checkout main
git log --oneline -1
# Debe mostrar: 1acd694 security: bump Next.js 16, ESLint 9 flat config, Capacitor CLI 8
```

Si `main` se rompe de nuevo (por ejemplo, por otro agente):

```bash
git checkout main
git reset --hard 1acd694
git push --force-with-lease origin main   # requiere auth configurada
```

---

## 4. Cómo actualizar la app

### 4.1. Instalación de dependencias

```bash
cd /Users/servimac/apps/Titanium/titanium-app
npm ci
```

### 4.2. Desarrollo web (vista previa)

```bash
npm run dev
```

Abre `http://localhost:3000`. Para simular móvil usa DevTools responsive.

### 4.3. Build del APK Android (debug/release)

**Java requerido:** OpenJDK 21 (la rama `feat/fortixam-2.0` genera `capacitor.build.gradle` con `JavaVersion.VERSION_21`).
Ruta en este Mac:

```bash
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.12.1/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
```

> Nota: OpenJDK 21 es `keg-only` en Homebrew. Si cambia la versión, usar `brew --prefix openjdk@21` para obtener la ruta activa.

```bash
cd /Users/servimac/apps/Titanium/titanium-app
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.12.1/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# Build debug reproducible (sin firma)
npm run build:apk

# Build debug limpio
npm run build:apk:clean

# Build release firmado (necesita key.properties + keystore)
npm run build:apk:signed
```

APK resultante:
- **Debug:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release:** `android/app/build/outputs/apk/release/app-release.apk`

### 4.4. Firma de release

Copia `key.properties.template` a `android/key.properties` y rellena:

```properties
storePassword=TU_PASSWORD
keyPassword=TU_PASSWORD
keyAlias=fortixam
storeFile=../fortixam.keystore.jks
```

Si no existe el keystore, generarlo:

```bash
keytool -genkey -v -keystore fortixam.keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fortixam
```

### 4.5. Instalación en dispositivo

```bash
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Configuraciones importantes

### 5.2. Modo offline-first

- `src/lib/api-config.ts` tiene el backend **desactivado por defecto** (`API_BASE_URL` vacío). La app no intenta sync remoto salvo que configures `NEXT_PUBLIC_API_BASE_URL`.
- `src/lib/db.ts` usa Dexie con tablas `sessions` y `weightEntries`.
- `src/lib/store.ts` sincroniza Zustand con IndexedDB.
- El servidor en `server/` y `docker-compose.yml` son **opcionales** para sync futura.
- Si configuras un backend, `finishWorkout` y `saveProgress` usan un timeout de 5s; si falla, los datos siguen guardados localmente.

### 5.2. Imágenes de ejercicios

- Todas las imágenes están en `public/images/exercises/<exercise>/screen.webp`.
- Hay **48 carpetas** y 48 referencias en `src/lib/data.ts`.
- **No regenerar imágenes con SVG/IA a menos que se verifique visualmente** que coinciden con el ejercicio.
- Si se añade un ejercicio nuevo, colocar su `screen.webp` en la carpeta correspondiente y actualizar `data.ts`.

### 5.3. Rutinas

- FORTIXAM 2.0 usa planes semanales y rutinas de 10 días (Sprint A/B/C).
- La fuente de verdad es `src/lib/data.ts`.
- Cada rutina tiene ejercicios principales y alternativas (`alternativeExercises`).

### 5.4. Nombre de la app en Android

- `capacitor.config.json`: `"appName": "FORTIXAM"`
- `android/app/src/main/res/values/strings.xml`: `<string name="app_name">FORTIXAM</string>`

---

## 6. Limpieza realizada en este handoff

- `main` reseteado al commit bueno `1acd694`.
- APKs antiguos y versiones intermedias eliminados.
- Solo se mantiene `FORTIXAM-2.0.apk` (última build de esta rama).
- Stash pendiente descartado (era solo `clsx` + `tailwind-merge` + WIP audio).
- Archivos de config obsoletos eliminados: `next.config.server.mjs`, `next.config.web.mjs`.
- `.DS_Store` y `next.config.server_temp.mjs` eliminados.

---

## 7. Checklist para cualquier actualización futura

- [ ] Partir de `main` y confirmar que `git log --oneline -1` muestra `1acd694`.
- [ ] No modificar `next.config.mjs` manualmente; usar `next.config.apk.mjs` y el script `build:apk`.
- [ ] No borrar carpetas de `public/images/exercises/` sin verificar `src/lib/data.ts`.
- [ ] Mantener el backend deshabilitado en `api-config.ts` salvo que se active sync voluntariamente.
- [ ] Probar build local antes de empaquetar APK.
- [ ] Verificar en dispositivo real (o emulador) que los flujos de entrenamiento tienen botón atrás y no se pierde progreso.
- [ ] Si se regeneran assets (iconos, splash, sonidos), actualizar también el proyecto Android con `npx cap sync android`.

---

## 8. Contacto / Contexto

- Proyecto local macOS: `/Users/servimac/apps/Titanium/titanium-app`
- Java: `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
- Homebrew puede mover la ruta de OpenJDK; si el build falla, ejecutar:
  ```bash
  brew --prefix openjdk@17
  ```
  y actualizar `JAVA_HOME`.

---

*Documento generado durante el handoff de FORTIXAM 2.0. No eliminar.*
