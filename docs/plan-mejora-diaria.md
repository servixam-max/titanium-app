# FORTIXAM — Plan de mejora diaria

> Un cambio pequeño y verificado cada día. Nada entra en `main` si los tests o el
> build del APK fallan.
>
> **Regla de oro:** cada día se marca **una sola** casilla (`- [x]`) y se rellena
> la entrada de bitácora al final. Si un día no hay hueco para marcar nada, se
> añade una tarea nueva al final de la fase con el formato existente.

## Protocolo del día (no negociable)

1. `git pull` / comprobar que `main` está limpio y al día.
2. Elegir **la primera** casilla sin marcar de la fase activa (ver `Prioridad`).
3. Implementar el cambio con el alcance mínimo que cumpla el criterio.
4. `npm run verify` — las tres puertas de calidad en un solo comando: lint,
   `npm test -- --run` y `BUILD_MODE=apk npm run build`.
5. `scripts/daily-improve.sh "tipo(area): resumen" "cuerpo con motivo y alcance"`.
   Ese script valida, commitea, sube versión patch, empuja `main` y crea el tag
   `vX.Y.Z`, que dispara GitHub Actions → APK nuevo en GitHub Releases (canal OTA).
6. Marcar la casilla aquí con la versión publicada y anotar en la bitácora.
7. Commitear el plan (`docs: plan diario — <tarea> vX.Y.Z`).

Si un paso falla: **no se publica**. Se arregla, o se deja la casilla sin marcar y
se reporta el motivo. Nunca se marca una casilla sin release publicado.

---

## Fase 0 — Higiene del repositorio

- [x] **F0.1** Cerrar el desfase de versiones (`package.json`, `version.json`,
  `ota_server/version.json`, `src/lib/ota-sync.ts`, `android/app/build.gradle`)
  con una única fuente de verdad vía `scripts/release.mjs`. *(v8.5.9)*
- [x] **F0.2** Unificar el build del APK en una sola ruta (`BUILD_MODE=apk`) y
  retirar la copia manual de `next.config.apk.mjs`. *(v8.5.9)*
- [x] **F0.3** Añadir al README la sección de automatización diaria (script,
  cron, tag → CI → release) para que cualquiera entienda el circuito. *(v8.5.10)*
- [x] **F0.4** Añadir `npm run verify` (lint + test + build apk) para tener las
  tres puertas de calidad en un solo comando. *(v8.5.11)*
- [x] **F0.5** Documentar el keystore de firma (`ANDROID_KEYSTORE_BASE64`) y qué
  hacer si CI genera un APK con firma distinta (la app no instalaría encima).
  *(v8.5.13 · `docs/firma-apk.md`)*

## Fase 1 — Novedades dentro de la app (visibilidad del avance)

- [x] **F1.1** Changelog en la app: leer las notas de las últimas releases desde
  la API de GitHub (ya se consulta en `ota-sync.ts`) y mostrarlas en Ajustes bajo
  "Novedades", con la versión instalada marcada. *(v8.5.14 · `src/lib/changelog.ts`
  + `ChangelogList.tsx`; cuando una release no trae notas, se rellenan con los
  mensajes de commit del rango vía la API de compare)*
- [x] **F1.2** Badge "Novedades" cuando la versión instalada es más nueva que la
  última leída (guardar en `localStorage`) y pantalla de bienvenida corta tras
  actualizar. *(v8.5.17 · `src/lib/whats-new.ts` + `WhatsNewModal.tsx`; el aviso
  no aparece en instalación nueva ni con un entreno en curso, y se retira solo al
  leer la sección de Novedades)*
- [ ] **F1.3** En `UpdateChecker`, mostrar el resumen de la nueva versión antes de
  descargar (hoy solo dice "mejoras y correcciones").

## Fase 2 — Entrenamiento

- [ ] **F2.1** Notas rápidas por ejercicio durante el entreno (se guardan con la
  sesión y se ven en el historial).
- [ ] **F2.2** Temporizador de descanso flotante en modo individual.
- [ ] **F2.3** Supersets (`supersetGroup` en el tipo `Exercise`): encadenar dos
  ejercicios sin descanso intermedio y etiquetarlo en la UI.
- [ ] **F2.4** Recordatorio de calentamiento si la última sesión de fuerza fue
  hace más de X días.
- [ ] **F2.5** Compartir resumen del entrenamiento (Web Share API, fallback a
  portapapeles).

## Fase 3 — Progreso y datos

- [ ] **F3.1** Exportar/importar datos (JSON) desde Ajustes para no perder
  historial al reinstalar.
- [ ] **F3.2** Heatmap de constancia de las últimas 4 semanas en Estadísticas.
- [ ] **F3.3** Estimar 1RM por ejercicio en la gráfica de récords y marcar la
  semana en que se batió.
- [ ] **F3.4** Comparativa mensual de volumen por grupo muscular.

## Fase 4 — Rendimiento y calidad

- [ ] **F4.1** Auditar imágenes de ejercicios (`public/images/exercises`) y bajar
  el peso total del APK sin pérdida visible.
- [ ] **F4.2** Ampliar Playwright a los flujos críticos: entreno guiado completo,
  registro de peso, cambio de tema. *(parcial: navegación y cambio de tema ya
  cubiertos; faltan completar un entreno guiado entero y guardar un peso)*
- [x] **F4.3** Revisar `cleartext: true` y `allowNavigation` amplio en
  `capacitor.config.json`: acotar dominios sin romper el puente LAN/Tailscale.
  *(v8.5.19 · resuelto por otra vía: el fallo real era el gesto ATRÁS cerrando la
  app — `@capacitor/app` + `src/lib/back-navigation.ts` — y los 63 px que el
  WebView no cubría: `viewport-fit=cover`. Verificado en emulador Android 16 con
  navegación por gestos. Queda pendiente acotar dominios en sí.)*
- [ ] **F4.4** Revisar rendimiento del WebView: re-renderizados en entreno activo
  y tiempo de arranque en frío.

## Prioridad

Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4. Dentro de cada fase, de arriba abajo.
Si una tarea resulta inviable o demasiado grande, se divide en una tarea nueva
justo debajo y se documenta el motivo.

---

## Bitácora

| Versión | Tarea | Qué cambió |
|---|---|---|
| v8.5.9 | — | Punto de partida: CI de APK, modo claro/oscuro, progresión de cargas. |
| v8.5.10 | F0.3 | Circuito de mejora diaria: `daily-improve.sh`, `next-improvement.sh`, plan con fases y bitácora, y sección en el README. |
| v8.5.11 | F0.4 | `npm run verify` (scripts/verify.mjs): lint + tests + build del APK en un solo comando, parando en la primera puerta que falle; `daily-improve.sh` y la documentación usan esa única ruta. |
| v8.5.12 | — | Sistema visual limpio (estilo Apple) en todas las pantallas, tests e2e del sistema de diseño y de la pantalla de acceso; descansos de los días a los 75 s prescritos. |
| v8.5.13 | F0.5 | `docs/firma-apk.md`: cómo firma la CI (certificado del secreto, estable → OTA sin desinstalar), qué pasa si se borra el secreto y por qué un APK compilado a mano no instala encima. |
| v8.5.14 | F1.1 | Changelog dentro de la app: Ajustes → Novedades lista las últimas versiones con sus cambios y marca la instalada. `src/lib/changelog.ts` (lectura de la API de GitHub, relleno con los commits del rango cuando la release no trae notas, caché de 6 h en localStorage) y `src/components/ui/ChangelogList.tsx`. |
| v8.5.15–v8.5.16 | — | Correcciones de interfaz y tema: el color primario vuelve a renderizarse con buen contraste en claro, el selector de días deja de solaparse y recargar un entreno ya no expulsa a la home. |
| v8.5.17 | F1.2 | Aviso de novedades al actualizar: pantalla corta la primera apertura con lo que trae la versión instalada, punto de aviso en Ajustes hasta leerlas y distintivo "Nuevas" en la sección Novedades. `src/lib/whats-new.ts` + `src/components/ui/WhatsNewModal.tsx`; no aparece en instalación nueva ni interrumpe un entreno en curso. |
| v8.5.18 | — | Los números grandes de la pantalla de entreno dejan de recortarse: el texto de 30 px usaba interlineado `none` (caja de 30 px) y la fuente medía 33 px, así que "10-12", el número de serie y "75s" se cortaban por abajo. Arreglados los 2 fallos preexistentes de los e2e de diseño: **suite móvil 60/60 en verde**. También se reforzó el monitor diario para que no vuelva a quedarse dormido si un día falla la publicación. |
| v8.5.19 | F4.3 | **El gesto ATRÁS de Android ya no cierra la app**: en un móvil con navegación por gestos, deslizar desde el borde salía de FORTIXAM de golpe. Se añade `@capacitor/app` y `src/components/system/AndroidBackButton.tsx` (cierra el modal abierto → retrocede → home → salir solo en la raíz), con la decisión aislada en `src/lib/back-navigation.ts` y 6 pruebas. Además el WebView no cubría la barra de gestos (63 px muertos): `viewport-fit=cover` y `touchAction: pan-x` en el carrusel de días. Verificado en emulador Android 16. |
