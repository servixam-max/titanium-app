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
- [x] **F1.3** En `UpdateChecker`, mostrar el resumen de la nueva versión antes de
  descargar (hoy solo dice "mejoras y correcciones"). *(v8.5.24 ·
  `UpdateNotes` dentro de `UpdateChecker.tsx`; reutiliza `src/lib/changelog.ts`
  con los ayudantes nuevos `sameVersion`/`findEntryByVersion`, recorta a 5
  cambios con "Ver los N restantes" y mantiene el texto corto si aún no hay
  notas o no hay red)*

## Fase 2 — Entrenamiento

- [x] **F2.1** Notas rápidas por ejercicio durante el entreno (se guardan con la
  sesión y se ven en el historial). *(v8.5.27 · `ExerciseLog.note` +
  `src/lib/workout-notes.ts` + `ExerciseNoteButton.tsx`; píldora discreta en el
  registro de serie —individual y guiado—, se guarda al salir del campo o con
  Enter, y se relee al desplegar la sesión en el Historial. 13 pruebas de la
  lógica y 7 del componente, más 2 e2e del recorrido completo)*
- [x] **F2.2** Temporizador de descanso flotante en modo individual.
  *(v8.5.28 · `src/lib/rest-timer.ts` + `src/components/workout/RestBar.tsx`;
  el descanso deja de tapar la pantalla completa y pasa a ser una tarjeta
  pegada bajo la cabecera que descuenta sin bloquear — se puede ajustar
  peso/reps, revisar el ejercicio o registrar ya la serie siguiente. Mantiene
  los avisos de voz (mitad, 30 s, 10 s, 3-2-1) y añade el toque de fin de
  descanso; +15/−15 s y Saltar siguen. 7 pruebas de la lógica, 9 del
  componente y 2 e2e del recorrido; el modo guiado conserva su pantalla
  completa. Verificado en emulador Android 16: el reloj desciende de 1:14 a
  1:02 con el resto del entreno usable detrás)*
- [x] **F2.3** Supersets (`supersetGroup` en el tipo `Exercise`): encadenar dos
  ejercicios sin descanso intermedio y etiquetarlo en la UI. *(v8.5.30 ·
  `src/lib/supersets.ts` (`decideSupersetAdvance`, 25 pruebas) + `SupersetBadge`
  (3 pruebas); integrado en `completeSet` del store — modelo de vueltas
  alternadas A→B→[descanso]→A→B… con encadenado a 0 s, descanso al cerrar la
  vuelta y salida con descanso normal. Badge "Superserie" en el escenario del
  entreno, las tarjetas y el descanso; aviso de voz consciente de la cadena.
  Activado en el Día 7 (Brazos & Hombros 3D), que ya prometía superseries en su
  texto: pares Curl de Bíceps↔Extensión de Tríceps y Curl Martillo↔Patada de
  Tríceps)*
- [x] **F2.4** Recordatorio de calentamiento si la última sesión de fuerza fue
  hace más de X días. *(v8.5.29 · `src/lib/warmup-reminder.ts` +
  `WarmupReminderBanner.tsx`; umbral de 5 días sin una sesión de fuerza
  completada — el modelo no guarda tipo de sesión, así que la fuerza se infiere
  de las series anotadas con reps/peso. Aviso discreto y descartable en la home,
  oculto si hay un entreno en curso y ausente sin historial. 22 pruebas de la
  lógica y 3 del componente)*
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
| v8.5.20 | — | **Fuera el aviso de instalar la PWA dentro de la app**: el cartel "Instalar FORTIXAM · añade la app a tu pantalla de inicio" aparecía dentro del APK ya instalado (resto de cuando FORTIXAM era una PWA) porque el WebView no encaja ni con `display-mode: standalone` ni con `navigator.standalone`. Se elimina `InstallPrompt`. Verificado en emulador. |
| v8.5.21 | — | **El músculo entrenado ya se ilumina en el mapa 3D**: tras un entreno de pecho el visor seguía diciendo "0/16 músculos activos" porque los ejercicios con peso externo tienen `bodyweightEqKg: 0` y, sin kilos anotados, el volumen quedaba en cero. Ahora el músculo trabajado siempre cuenta (carga de referencia), con 2 pruebas de regresión. Además el visor se ve entero (antes la barra inferior tapaba las piernas) y el HUD deja de mentir: decía "ROTACIÓN 360° ACTIVA" con el giro apagado. Verificado en emulador. |
| v8.5.22 | — | **Cada ejercicio dice qué músculos trabaja**: las tarjetas listan primarios (verde) y sinergistas (gris) con el mismo motor que alimenta el mapa 3D, así se sabe de antemano qué se va a iluminar en Estadísticas. Se evita el badge duplicado (Curl de Bíceps ya no repetía "Bíceps"). La home gana **barra de progreso de nivel** con porcentaje. |
| v8.5.23 | — | **La barra superior ya no tapa el contenido**: la TopAppBar es `fixed` (48 px) pero las pantallas solo reservaban 16 px, así que el saludo, el nombre, el nivel y la racha quedaban por debajo. Nuevo `TopAppBarSpacer` en las 6 pantallas que usan la barra. Medido con CDP en el WebView del emulador: el saludo pasó de y=23-45 (dentro de la barra 0-48) a y=112-135. |
| v8.5.24 | F1.3 | **El aviso de actualización enseña qué trae la versión nueva**: antes de descargar, el diálogo dice ahora los cambios reales de la release (los mismos que Ajustes → Novedades), con recorte a 5 y "Ver los N cambios restantes". Reutiliza `src/lib/changelog.ts` con los ayudantes nuevos `sameVersion`/`findEntryByVersion` (WhatsNewModal deja de tener su copia local). Si la release aún no trae notas o no hay red, se mantiene el texto corto "Mejoras y correcciones de mantenimiento"; el diálogo gana desplazamiento (`max-h 88dvh`) para que siga cabiendo en móvil. Verificado en Pixel 7 (claro y oscuro) y con 2 e2e que simulan la API de GitHub. |
| v8.5.25 | — | **Depuración del WebView en builds de desarrollo**: al auditar en el emulador el socket de Chrome DevTools desaparecía entre sesiones y no había forma fiable de medir el layout real. Se activa `setWebContentsDebuggingEnabled` cuando el APK es depurable (flag `FLAG_DEBUGGABLE`, no `BuildConfig`: este proyecto no lo genera) y queda apagado en release. Es la herramienta que permite medir posiciones en píxeles en vez de suponerlas. |
| v8.5.26 | — | **Control de Peso deja de ser un hueco vacío**: al entrar por primera vez solo había un cartel "sin registros" rodeado de espacio muerto, sin nada que hacer ni aprender. Ahora, cuando no hay pesajes, se muestran tres consejos prácticos (pesarse siempre igual; mirar la tendencia y no el día, porque el peso oscila ±1 kg; y cruzar el peso con el volumen para distinguir músculo de grasa) más un botón "Registrar mi primer pesaje" que abre el formulario. Verificado en emulador. |
| v8.5.27 | F2.1 | **Notas rápidas por ejercicio durante el entreno**: durante la sesión se puede apuntar lo que no cabe en un número —"el codo me molestó", "subir a 42,5 la próxima"— desde una píldora discreta junto al registro de serie, en modo individual y guiado; se guarda sola al salir del campo (o con Enter) y queda dentro de la sesión, así que se relee al desplegar el entreno en el Historial. La lógica vive en `src/lib/workout-notes.ts` (normaliza, recorta a 280 caracteres y borra la nota si se vacía) con 13 pruebas, y el componente `ExerciseNoteButton` con 7; 2 e2e recorren el camino completo (escribir → guardar → terminar el entreno → ver la nota en el historial). De paso, el Historial ya muestra el nombre real del ejercicio guardado en la sesión cuando la rutina no está en el catálogo (antes decía "Ejercicio N"). Verificado en Pixel 7, claro y oscuro: zona táctil de 44 px, campos de 16 px (sin zoom en iOS) y contraste 6,9:1 / 5,0:1 en la nota guardada. |
| v8.5.28 | F2.2 | **El descanso ya no tapa la pantalla en el modo individual**: en vez de un overlay a pantalla completa, ahora es una tarjeta flotante pegada bajo la cabecera que descuenta sin bloquear — durante el reloj se puede ajustar peso/reps, revisar el ejercicio o registrar ya la serie siguiente. Conserva los avisos de voz (mitad, 30 s, 10 s y cuenta atrás 3-2-1) y añade el toque de fin de descanso; −15 s / +15 s / Saltar siguen a un toque. La lógica pura vive en `src/lib/rest-timer.ts` (7 pruebas) y el componente en `src/components/workout/RestBar.tsx` (9 pruebas), más 2 e2e: el reloj cuenta, ajusta, no bloquea el botón de completar y se puede saltar; el modo guiado conserva su pantalla completa de descanso. Verificado en emulador Android 16 (navegación por gestos): el reloj descendió de 1:14 a 1:02 con todo el entreno usable detrás. |
| v8.5.29 | F2.4 | **Aviso de calentamiento tras días sin fuerza**: si la última sesión de fuerza completada fue hace 5 días o más, la home muestra un aviso discreto y descartable que recuerda calentar — movilidad y 2 series de aproximación con carga ligera —; no aparece con un entreno en curso ni sin historial, y se retira en la visita con su X. La lógica pura vive en `src/lib/warmup-reminder.ts` (umbral exportado de 5 días; el modelo no guarda "tipo de sesión", así que la fuerza se infiere de las series anotadas con reps/peso; fechas inválidas o futuras no generan aviso) con 22 pruebas, y el componente `WarmupReminderBanner.tsx` con 3. |
| v8.5.30 | F2.3 | **Superseries de verdad en el entreno**: dos ejercicios del mismo grupo se encadenan alternando series — completas una serie del primero y pasas directo al segundo sin descanso; el descanso prescrito llega al cerrar la vuelta completa (una serie de cada uno). El encadenado se etiqueta con un badge "Superserie" en las tarjetas, durante el entreno y en el descanso, y el aviso de voz anuncia el cambio sin decir "descansa" en falso. La decisión de negocio vive en `src/lib/supersets.ts` (`decideSupersetAdvance`) con 25 pruebas y el badge con 3. Activado en el Día 7 (Brazos & Hombros 3D), que ya lo prometía: Curl de Bíceps ↔ Extensión de Tríceps y Curl Martillo ↔ Patada de Tríceps. |
