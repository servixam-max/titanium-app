# FORTIXAM - Manual de Mantenimiento y Actualizaciones para IAs y Desarrolladores

Este documento describe la arquitectura de **FORTIXAM**, cómo funciona el sistema de actualizaciones globales vía OTA (Over-The-Air) y el paso a paso exacto que cualquier Inteligencia Artificial o desarrollador debe seguir para realizar y publicar una nueva versión.

---

## 1. Stack Tecnológico y Arquitectura

- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS.
- **Exportación Estática**: `output: "export"` en `next.config.mjs` hacia la carpeta `dist/`.
- **Envoltorio Móvil**: Capacitor 6 (`android/`).
- **Estado y Persistencia**: Zustand + IndexedDB (`src/lib/store.ts`). La app es 100% offline-first.
- **Distribución OTA**: Totalmente pública y global a través de la **API de GitHub Releases**.

---

## 2. Cómo Funciona el Sistema Global OTA

El archivo encargado de la sincronización y actualizaciones es [`src/lib/ota-sync.ts`](src/lib/ota-sync.ts).

Cuando el usuario abre la app o pulsa "Buscar actualización":
1. **Canal Principal (Mundial)**: Consulta en tiempo real la API de GitHub Releases:
   `https://api.github.com/repos/servixam-max/titanium-app/releases/latest`
   - Si la etiqueta (`tag_name`, ej. `v5.3`) es diferente a `APP_VERSION`, se notifica la actualización.
   - El APK se descarga directamente del CDN de GitHub (`browser_download_url`) mediante HTTPS de alta velocidad.
2. **Canal Secundario (Fallback GitHub Raw)**:
   `https://raw.githubusercontent.com/servixam-max/titanium-app/main/ota_server/version.json`
3. **Canal de Respaldo Local (Desarrollo sin Internet)**:
   Si no hay conexión a Internet, busca en IPs locales (Tailscale o Wi-Fi) en el puerto `8082`.

---

## 3. Protocolo Paso a Paso para Publicar una Nueva Versión

Cualquier IA o desarrollador que reciba la instrucción de hacer cambios y actualizar la app DEBE seguir esta secuencia exacta:

### Paso 1: Realizar los cambios de código solicitados
Modificar los archivos en `src/` según las instrucciones del usuario.

### Paso 2: Incrementar la versión en los 3 archivos clave
Imaginemos que la versión pasa de `5.2` a `5.3`:

1. **`src/lib/ota-sync.ts`**:
   ```typescript
   export const APP_VERSION = "5.3";
   ```

2. **`android/app/build.gradle`**:
   Incrementar `versionCode` y `versionName`:
   ```groovy
   versionCode 530
   versionName "5.3.0"
   ```

3. **`ota_server/version.json`**:
   Actualizar la versión, nombre del APK y URL del release:
   ```json
   {
     "version": "5.3",
     "apkName": "FORTIXAM-5.3.apk",
     "url": "https://github.com/servixam-max/titanium-app/releases/download/v5.3/FORTIXAM-5.3.apk"
   }
   ```

### Paso 3: Compilar la aplicación web y sincronizar con Android
Ejecutar en la raíz del proyecto:
```bash
npm run build
npx cap sync android
```
*(Asegúrate de que `npm run build` termine con código 0 y genere todas las rutas estáticas en `dist/`).*

### Paso 4: Compilar el APK de Android con Gradle
En macOS, Java 21 está ubicado en OpenJDK Homebrew. Ejecutar:
```bash
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug && cd ..
```

### Paso 5: Copiar el APK compilado
```bash
cp android/app/build/outputs/apk/debug/app-debug.apk FORTIXAM-5.3.apk
cp android/app/build/outputs/apk/debug/app-debug.apk ota_server/FORTIXAM-5.3.apk
```

### Paso 6: Publicar el Release en GitHub
Ejecutar el script automatizado (usa el CLI oficial `gh` ya autenticado en el sistema):
```bash
./scripts/publish-release.sh
```
*Este script detecta la versión en `version.json`, crea el tag/release en GitHub si no existe, o actualiza el binario con `--clobber`.*

### Paso 7: Guardar y subir a Git
```bash
git add .
git commit -m "feat: <descripción de los cambios> (v5.3)"
git push origin main
```

---

## 4. Comprobaciones y Verificación de Éxito

Para comprobar que el nuevo release está activo y accesible para cualquier usuario en el mundo:
```bash
curl -s https://api.github.com/repos/servixam-max/titanium-app/releases/latest | grep -E "(tag_name|browser_download_url)"
```
Debe devolver el tag de la nueva versión (ej. `v5.3`) y el enlace de descarga del APK en GitHub.

---

## 5. Reglas Críticas para IAs

1. **`tsconfig.json`**: El array `exclude` SIEMPRE debe contener `"node_modules"`, `"nextcloud"` y `"android"`.
2. **Sin VPN necesaria**: No pedir al usuario que active Tailscale para las actualizaciones; el sistema ya es global vía GitHub Releases.
3. **Descansos de entrenamiento**: En rutinas de fuerza, mantener los descansos estandarizados en 75 segundos (`restSeconds: 75`).
4. **Git Workflows**: No añadir archivos bajo `.github/workflows/` a menos que el token de Git tenga permiso explícito de `workflow`; el método estándar y 100% fiable para publicar releases es `./scripts/publish-release.sh`.
