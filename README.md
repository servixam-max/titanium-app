# FORTIXAM (Titanium) ⚡

Aplicación moderna y minimalista de entrenamiento guiado y seguimiento de fuerza, diseñada con estética Cyber-Titanium y funcionamiento offline-first para Android.

---

## 🚀 Características Principales

- **13 Rutinas Especializadas**:
  - Días 1 al 5: Full Body, Piernas & Core, Torso, HIIT Tabata y Fuerza Máxima.
  - Días 6 al 8: Empuje (Push), Tracción (Pull), Full Body Express.
  - Días 9 y 10: Super HIIT Tabata y Movilidad Articular.
  - Día 11: Entrenamiento Libre con catálogo completo de ejercicios.
  - Día 12: Piernas & Cadena Posterior de Acero (Sentadilla sumo, Hip thrust, Peso muerto a una pierna).
  - Día 13: Brazos & Hombros de Titanio (Press Arnold, Skull crushers, Farmer's walk).
- **HUD Iluminado de Alta Visibilidad**:
  - 3 bloques destacados para Repeticiones/Tiempo, Serie actual y Descanso.
  - Cero distracciones de entrada manual durante el ejercicio.
- **Descansos Optimizados a 75s** en rutinas de fuerza e hipertrofia.
- **Actualizaciones Globales Over-The-Air (OTA)**:
  - Distribución pública y automática a través de **GitHub Releases**.
  - No requiere VPN ni Tailscale para recibir actualizaciones.

---

## 🛠️ Guía para Desarrolladores e Inteligencias Artificiales

Si eres un desarrollador o un modelo de IA trabajando en este proyecto, consulta el manual completo de mantenimiento:

👉 **[AI_MAINTENANCE_GUIDE.md](./AI_MAINTENANCE_GUIDE.md)**

Para publicar una nueva versión tras realizar cambios:
```bash
# 1. Incrementar versión en src/lib/ota-sync.ts, android/app/build.gradle y ota_server/version.json
# 2. Compilar web y sincronizar
npm run build && npx cap sync android

# 3. Compilar APK Android
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug && cd ..

# 4. Copiar APK
cp android/app/build/outputs/apk/debug/app-debug.apk FORTIXAM-<version>.apk
cp android/app/build/outputs/apk/debug/app-debug.apk ota_server/FORTIXAM-<version>.apk

# 5. Publicar en GitHub Releases
./scripts/publish-release.sh

# 6. Subir a Git
git add . && git commit -m "feat: actualización v<version>" && git push origin main
```

---

## 📥 Descarga de la Última Versión

Puedes descargar directamente el último archivo APK desde la sección de **[Releases de GitHub](https://github.com/servixam-max/titanium-app/releases/latest)**.
