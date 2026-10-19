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
- [x] **F2.5** Compartir resumen del entrenamiento (Web Share API, fallback a
  portapapeles). *(v8.5.33 · `src/lib/share-summary.ts` +
  `ShareWorkoutButton.tsx`; botón "Compartir resumen" en la pantalla de fin de
  entreno: usa la hoja nativa cuando existe y, en el WebView del APK donde no
  está implementada, copia el resumen al portapapeles con aviso honesto
  ("Resumen copiado"); cancelar la hoja no se anuncia como error. El texto
  incluye duración, series, reps y volumen, con cifras deterministas —punto de
  miles, sin depender del ICU del dispositivo—. 18 pruebas de la lógica y 6
  del componente, más 3 e2e del recorrido completo; verificado en Pixel 7 a
  375 y 412 px, claro y oscuro, con contraste 6,9:1 y 7,4:1)*

## Fase 3 — Progreso y datos

- [x] **F3.1** Exportar/importar datos (JSON) desde Ajustes para no perder
  historial al reinstalar. *(v8.5.34 · la exportación usaba `Blob`+descarga, que
  el WebView del APK no sabe hacer: decía «copia guardada» y no se guardaba nada
  —`ActivityNotFoundException` sobre `blob:` en logcat, Download vacía—. Ahora
  escribe el .json con el plugin Filesystem y lo entrega al sistema con la hoja
  de compartir (Guardar en Archivos, Drive, WhatsApp…); en navegador sigue la
  descarga clásica. La restauración recupera también la última marca por
  ejercicio sin pisar la más reciente del dispositivo, y los avisos dejan de
  mentir: cancelar la hoja no es error y un archivo ajeno se rechaza con aviso
  claro. Verificado en emulador con el APK real: archivo `fortixam-backup-xam-
  2026-10-04.json` (5.240 B, JSON válido) escrito y hoja del sistema abierta;
  cancelarla muestra el aviso honesto. De paso, `minSdkVersion` 22→24: Capacitor
  8 y el plugin Filesystem exigen API 24 y el build de CI fallaba en el
  manifest merger)*
- [x] **F3.2** Heatmap de constancia de las últimas 4 semanas en Estadísticas.
  *(v8.5.35 · cuadrícula lunes-domingo de las últimas 4 semanas: cada día se
  pinta con intensidad relativa a la jornada más fuerte de la ventana (estilo
  mapa de contribuciones de GitHub, el patrón de las apps de fitness actuales),
  hoy con anillo y días futuros atenuados sin contarlos como entrenados. Resumen
  honesto: «X días entrenados» y % de constancia sobre los días ya transcurridos
  (sin historial lo dice en claro en vez de fingir una cuadrícula viva). Lógica
  pura en `src/lib/consistency.ts` (18 pruebas) y componente
  `ConsistencyHeatmap.tsx` (7 pruebas), más 4 e2e (escritorio y móvil) que
  restauran una copia y comprueban la cuadrícula día a día)*
- [x] **F3.3** Estimar 1RM por ejercicio en la gráfica de récords y marcar la
  semana en que se batió. *(v8.5.36 · tarjeta «Récords» en Estadísticas: la
  evolución del 1RM estimado (Epley, la definición única de la app) del
  ejercicio elegido, jornada a jornada; la semana del récord vigente queda
  marcada sobre la línea (banda vertical + punto con anillo), con resumen claro
  («Récord el 23 sep · semana del 21 sep»). Selector de ejercicio cuando hay
  varios (los más recientes primero) y matiz honesto cuando el récord salió de
  una serie de más de 12 repeticiones. Sin marcas con peso deja de fingir una
  gráfica y lo dice en claro. Lógica pura en `src/lib/records-chart.ts` (14
  pruebas) y componente `RecordsChart.tsx` (9 pruebas), más 4 e2e —incluido el
  recorrido real de restaurar una copia y cambiar de ejercicio— en escritorio y
  móvil)*
- [x] **F3.4** Comparativa mensual de volumen por grupo muscular. *(v8.5.41 ·
  tarjeta «Comparativa Mensual» en Estadísticas: el volumen efectivo del mes en
  curso frente al **mismo tramo** del mes pasado (día 1 → hoy contra día 1 →
  mismo día, acotado si el mes es más corto), grupo a grupo — Pecho, Espalda,
  Hombros, Brazos, Piernas, Core — con las dos barras juntas y chips de
  variación («+47 %», «-50 %», «nuevo», acotado a «>999 %»). El volumen lo
  define una sola vez el motor biomecánico: se extraen `accumulateMuscleStats`
  y `aggregateMajorGroups` (primarios 100 %, sinergistas 45 %) y
  `computeMuscleBreakdown` pasa a reutilizarlos. Lógica pura en
  `src/lib/monthly-comparison.ts` (22 pruebas) y componente
  `MonthlyComparison.tsx` (9 pruebas), más 4 e2e (escritorio y móvil) que
  restauran una copia con entrenos de ambos tramos)*

## Fase 4 — Rendimiento y calidad

- [x] **F4.1** Auditar imágenes de ejercicios (`public/images/exercises`) y bajar
  el peso total del APK sin pérdida visible. *(v8.5.32 · auditoría medida y
  compresión aplicada: `screen.webp` 1024→800 px q80 y `screen-sm.webp` 512→384,
  más 13 `screen.jpg` legacy sin referencias eliminados. **9,5 MB → 4,8 MB
  (−53 %)**; 0 archivos por encima de 800 px; calidad verificada a ojo
  (SSIM 0,998 en la muestra medida). El APK debug pasa de ~17 MB a ~12 MB)*
- [x] **F4.2** Ampliar Playwright a los flujos críticos: entreno guiado completo,
  registro de peso, cambio de tema. *(v8.5.42 · `e2e/flujos-criticos.spec.js`:
  completar un entreno guiado entero —las 6 series de la rutina de prueba, con
  descanso a pantalla completa entre series— hasta el resumen, con la sesión
  guardada con todas sus series; y registrar un pesaje comprobando que sigue ahí
  tras recargar la app. El cambio de tema y la navegación ya estaban cubiertos)*
- [x] **F4.3** Revisar `cleartext: true` y `allowNavigation` amplio en
  `capacitor.config.json`: acotar dominios sin romper el puente LAN/Tailscale.
  *(v8.5.19 · resuelto por otra vía: el fallo real era el gesto ATRÁS cerrando la
  app — `@capacitor/app` + `src/lib/back-navigation.ts` — y los 63 px que el
  WebView no cubría: `viewport-fit=cover`. Verificado en emulador Android 16 con
  navegación por gestos. Queda pendiente acotar dominios en sí.)*
- [x] **F4.4** Revisar rendimiento del WebView: re-renderizados en entreno activo
  y tiempo de arranque en frío. *(v8.5.43 · medido con una sonda de renders
  (`src/lib/perf-probe.ts` + `useRenderProbe`): cada tic de 1 Hz del descanso
  repintaba la pantalla completa del entreno —6 renders de la página en 6 s—;
  ahora las pantallas de entreno, el registrador de series, el hook de última
  marca y AuthModal se suscriben por campo y el tic repinta solo el reloj
  (**6 → 1**). Nuevo `e2e/rendimiento-webview.spec.js` (3 pruebas × escritorio y
  móvil) que vigila la regla y pone tope al arranque en frío. WebView real:
  arranque en frío ~0,4 s de mediana (adb `am start -W`); export de la home:
  FCP 48–140 ms)*

## Fase 5 — Robustez de la publicación

- [x] **F5.1** Notas y novedades inmunes al límite de la API de GitHub: el canal
  raw (`ota_server/changelog.json`, regenerado en cada publicación) sirve de
  respaldo cuando la API responde 403 o deja versiones sin notas, en Ajustes →
  Novedades, el aviso pre-descarga y la bienvenida tras actualizar. *(v8.5.44 ·
  `scripts/update-changelog.mjs` regenera el archivo en cada publicación dentro
  del commit de versión; `fetchChangelog` fusiona API + canal raw y los dos
  consumidores fuerzan una consulta nueva si la copia venía sin notas; 8
  pruebas nuevas y 1 e2e con la API simulada en 403)*
- [x] **F5.2** Arreglar los 4 e2e preexistentes del sistema de diseño (textos de
  11 px en /stats y /routine/1) y dejar la suite e2e 100 % en verde. *(v8.5.45 ·
  los chips de músculos de las tarjetas de ejercicio (`ExerciseCard`) y la
  telemetría del visor 3D (`ThreeMuscleViewer`) bajaban a 11 px; el plan semanal,
  el distintivo «Nuevas» de Ajustes y el «Instalada» de Novedades tenían el mismo
  caso latente. Todo sube al suelo tipográfico de 12 px (`text-xs`) y el token
  `label-caps` de Tailwind pasa a 12 px: `design-system.spec.js` queda **20/20**
  y la suite e2e completa **170/170 en verde** (antes 165 + 4 rojos + 1 flaky);
  verificado además en el emulador con el APK de CI)*
- [x] **F5.3** Acotar `cleartext` y `allowNavigation` en `capacitor.config.json`
  sin romper el puente LAN/Tailscale (cola de F4.3). *(v8.5.46 · el APK pedía
  HTTP sin cifrar «a todo»; ahora la política vive en
  `android/app/src/main/res/xml/network_security_config.xml` — HTTP prohibido
  por defecto y permitido solo al Mac del puente (WiFi y Tailscale) y al host
  del emulador; `allowNavigation` queda vacío y el service worker deja pasar
  las peticiones de otros orígenes, que antes devolvían su respuesta de reserva
  y enmascaraban el puente. Medido en el emulador: 200 real por 10.0.2.2,
  192.168.2.107 y 100.126.164.101; example.com bloqueado con
  ERR_CLEARTEXT_NOT_PERMITTED, también en la descarga nativa. Tests:
  `seguridad-red` (manifiesto + NSC + CANDIDATE_IPS) y `service-worker`)*

## Fase 6 — Siguientes (cola)

- [x] **F6.1** Decidir el destino de la pantalla `/routine/[day]`: enlazarla
  desde algún flujo o retirarla con su test. Hoy ningún botón lleva a ella
  (el detalle de rutina abre en modal) pero los e2e la auditan. *(v8.5.47 ·
  **retirada**: ningún flujo la necesitaba — el modal la supera — así que se
  borra con su `ModeSelector` huérfano y los e2e del flujo de entreno pasan a
  recorrer el camino real home → modal; la auditoría de diseño/contraste del
  detalle se hace ahora sobre el modal abierto —que gana `role=dialog` y se
  cierra con ATRÁS de Android—, y al medirlo apareció el título del héroe
  ilegible en claro (1,01:1): corregido con `fx-on-media`)*
- [x] **F6.2** Texto corto para el HUD del visor 3D en móvil estrecho: «SIN
  MÚSCULOS TRABAJADOS AÚN» parte en dos líneas dentro de su píldora; «Sin
  músculos aún» lo deja en una. *(v8.5.48 · al medirlo, el contador activo
  «12/16 MÚSCULOS TRABAJADOS» también partía en dos líneas a 375 y 412 px, y
  al no caber el flex encogía de rebote la píldora izquierda, así que
  «360° APAGADO» se partía también: quedan «Sin músculos aún» y
  «N/16 músculos», y un e2e nuevo mide las líneas reales a 360/375/412, sin
  datos y con un entreno restaurado)*
- [x] **F6.3** Revisar `android.allowMixedContent` (sigue en `true` para que el
  puente http funcione desde la página https): documentar por qué es necesario
  o acotarlo, p. ej. sirviendo el puente por HTTPS local. *(v8.5.49 · acotado y
  no solo documentado: `allowMixedContent` pasa a `false` —el WebView ya no
  acepta contenido mixto— y el puente (:8082) y la API local (:3001), que
  también es http, salen por **petición nativa** con `CapacitorHttp` a través
  de `fetchLocal` (src/lib/http-local.ts); el network-security-config queda
  como única puerta al texto claro. 10 pruebas del helper y guardas
  anti-regresión en `seguridad-red`. Verificado en emulador: `fetch` directo
  a http bloqueado, la petición nativa responde por ambos puertos y el
  fallback OTA completo —GitHub simulado caído → puente local— pinta el
  aviso; el APK de CI se instala encima conservando datos y muestra «Tu
  aplicación está al día (v8.5.49)»)*
- [x] **F6.4** El nombre del ejercicio en hover (modo claro) queda en 3,6:1:
  `group-hover:text-primary` lo pinta en verde `#059669` sobre tarjeta
  `slate-50`. Buscar un verde del tema con 4,5:1 sobre claro sin perder el
  acento de hover. *(v8.5.50 · token nuevo `--primary-strong-rgb`: en claro
  usa el mismo verde que el texto primario del tema, `#036B4B` —6,26:1 sobre
  la tarjeta en hover y 6,55:1 sobre blanca—; en oscuro conserva el acento
  `#10B981` (6,60:1), así que el tema oscuro no cambia. Aplicado a
  ExerciseCard, ExerciseGridCard y RoutineCard. El e2e de contraste audita
  desde hoy también el estado hover —medido en Pixel 7: `rgb(3,107,75)` sobre
  `rgb(248,250,252)`— y con la clase antigua ese caso falla con 3,60:1)*

## Fase 7 — Estados y accesibilidad

- [x] **F7.1** Auditar los estados que aún nadie mide: pulsado, foco de teclado
  y hover de botones/chips (hoy solo reposo y el nombre de las tarjetas).
  *(v8.5.51 · nueva suite `e2e/estados-interactivos.spec.js`: recorre hover,
  pulsado y foco en los dos temas y mide el color real contra su fondo. Al
  medirlo aparecieron tres fallos reales: el nombre del ejercicio dentro de la
  lista de una rutina usaba `group-hover/item:text-primary` y quedaba en
  **3,77:1** en claro —pasa al token `text-primary-strong`—; el anillo de foco
  emerald-600 se quedaba en **2,96:1** sobre las superficies hundidas
  (`#DFE4EA`), así que en claro baja a `#036B4B` con el token nuevo
  `--focus-ring` (6,5:1 sobre blanco, 5,1:1 sobre la hundida); y los campos de
  peso/reps/notas apagaban el contorno con `focus:outline-none` (2 px
  transparentes) sin pintar alternativa —el color vuelve a pintarse solo con
  teclado—. 5 pruebas nuevas en `foco-teclado.test.ts` y la guarda de hover
  ampliada a los grupos con nombre)*
- [ ] **F7.2** Las tarjetas del tema oscuro se saltan en la auditoría porque
  llevan degradado de fondo y el script no lo calcula: medir el píxel real bajo
  el texto (captura + lectura del color) en vez de descartarlas.
- [ ] **F7.3** Sustituir las ~150 reglas `html.light … !important` que
  reescriben colores por nombre de clase por tokens de tema: el fallo de F6.4
  nació justo de ahí (`group-hover:text-primary` no pasaba por la regla de
  `.text-primary`).

## Prioridad

Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7. Dentro de cada fase, de arriba abajo.
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
| v8.5.31 | — | **Las superseries ya tienen datos reales**: la activación del Día 7 (pares Curl de Bíceps ↔ Extensión de Tríceps y Curl Martillo ↔ Patada de Tríceps con `supersetGroup`) entró después del tag de v8.5.30, así que se publica aquí. Verificado en vivo: completar la primera serie pasa directo al compañero sin descanso (0 tarjetas), y al cerrar la vuelta llega el descanso con el badge también en la tarjeta. |
| v8.5.32 | F4.1 | **El catálogo de ejercicios pesa la mitad**: auditoría medida (153 archivos, 9,5 MB) y compresión aplicada — `screen.webp` 1024→800 px q80, `screen-sm.webp` 512→384 y 13 `screen.jpg` legacy sin referencias fuera. Total **9,5 MB → 4,8 MB (−53 %)** sin pérdida visible; el APK debug baja de ~17 MB a ~12 MB. Incluye la bitácora y el cierre de F4.1. |
| v8.5.33 | F2.5 | **Comparte tu entrenamiento al terminarlo**: la pantalla de resumen gana un botón "Compartir resumen" que envía un texto con lo hecho —duración, series, reps y volumen— a donde se quiera. Usa la hoja nativa del sistema (WhatsApp, Telegram, lo que haya) y, como el WebView del APK no la implementa, copia el resumen al portapapeles avisando en claro ("Resumen copiado"); cancelar la hoja nativa no se trata como error. La lógica pura vive en `src/lib/share-summary.ts` (18 pruebas) y el componente en `ShareWorkoutButton.tsx` (6), más 3 e2e que recorren el camino completo en ambos escenarios. Verificado en Pixel 7 a 375 y 412 px: zona táctil de 48 px y contraste 6,9:1 (oscuro) / 7,4:1 (claro). |
| v8.5.34 | F3.1 | **La copia de seguridad por fin se guarda de verdad en el móvil**: la exportación de Ajustes usaba `Blob`+descarga, que el WebView del APK no sabe hacer — decía "¡Copia de seguridad guardada!" y no se guardaba nada (el `Intent` moría sobre `blob:` y la carpeta Download quedaba vacía). Ahora el .json se escribe en el dispositivo con el plugin Filesystem y se entrega al sistema con la hoja de compartir (Guardar en Archivos, Drive, WhatsApp…), manteniendo la descarga clásica en navegador. La restauración recupera también la última marca por ejercicio sin pisar la más reciente del dispositivo, y los avisos dejan de mentir: cancelar la hoja no es error y un archivo ajeno se rechaza en claro. La lógica pura vive en `src/lib/backup.ts` y `src/lib/backup-save.ts` (26 pruebas) y 4 e2e. Verificado en emulador con el APK real: `fortixam-backup-xam-2026-10-04.json` (5.240 B, JSON válido con sesiones) escrito y hoja del sistema abierta; cancelarla muestra "Cerraste la hoja: la copia no se ha guardado fuera de la app". Incluye `minSdkVersion` 22→24 (Capacitor 8 y el plugin Filesystem exigen API 24; el primer build de CI falló en el manifest merger). |
| v8.5.35 | F3.2 | **Constancia de las últimas 4 semanas de un vistazo**: nueva tarjeta en Estadísticas con una cuadrícula lunes-domingo de 28 días; cada día entrenado se pinta con intensidad relativa a la jornada más fuerte de la ventana (mismo patrón que el mapa de contribuciones de GitHub), hoy lleva un anillo y los días futuros salen atenuados sin contarlos como entrenados. Resumen honesto: «X días entrenados» y % de constancia sobre los días ya transcurridos; sin historial lo dice en claro en vez de fingir una cuadrícula viva. Lógica pura en `src/lib/consistency.ts` (18 pruebas) y componente `ConsistencyHeatmap.tsx` (7 pruebas), más 4 e2e (escritorio y móvil). |
| v8.5.36 | F3.3 | **Tu récord de cada ejercicio, en una gráfica**: nueva tarjeta «Récords» en Estadísticas con la evolución del 1RM estimado (Epley, la definición única de la app) del ejercicio elegido, jornada a jornada. La semana exacta del récord vigente queda marcada sobre la línea —banda vertical y punto con anillo— y el resumen lo dice con su fecha («Récord el 23 sep · semana del 21 sep»). Con varios ejercicios hay selector (los más recientes primero); el matiz de fiabilidad aparece cuando el récord salió de más de 12 repeticiones, y sin marcas con peso lo dice en claro en vez de fingir una gráfica. Lógica pura en `src/lib/records-chart.ts` (14 pruebas) y componente `RecordsChart.tsx` (9 pruebas), más 4 e2e (escritorio y móvil) que restauran una copia y recorren el cambio de ejercicio. |
| v8.5.37 | — | **Descansos con criterio y días sin repetir ejercicios**: 239 de 247 ejercicios usaban 75 s sin importar el músculo (y 20 s en los HIIT), así que una sentadilla pesada y un curl de bíceps descansaban igual. Ahora el descanso depende del tipo: pierna pesada 120 s, multiarticular de torso 90 s, aislamiento e isométricos 60 s, metabólico/HIIT 30 s, movilidad 30 s (`src/lib/rest-guide.ts`, 7 pruebas, más `scripts/aplicar-descansos.mjs` para aplicarlo a todo el catálogo). El **Día 3 era literalmente los Días 1 y 2 pegados** —9 de sus 10 ejercicios repetidos— y duraba 48 min: se rediseña como "Full Body Equilibrado" con 8 ejercicios distintos (Press Inclinado, Remo Serrucho, Peso Muerto Rumano, Sentadilla Búlgara, Press Arnold, Pájaro, Curl Martillo Cruzado, Extensiones Tumbado) en 35 min. El Día 1 pasa a 2 ejercicios por músculo y los Días 11 y 16 bajan a 3 series para entrar en rango. `src/lib/dias-calidad.test.ts` (7 pruebas) vigila de aquí en adelante: sin duplicados por día, sin repetir entre días 1/2/3, duración 25-45 min, 6-10 ejercicios y reparto muscular. Verificado en emulador: el Día 3 muestra 35 MIN · 8 ejercicios · 24 series y el Peso Muerto Rumano descansa 120 s. |
| v8.5.38 | — | **Remates opcionales, duraciones que no mienten y músculos sin repetir**: el remate final (Burpees al Fallo del Día 2) se marca `optional` y **no cuenta para la duración** del día, con etiqueta propia en la tarjeta. **15 días declaraban una duración falsa** (el Día 3 decía 35 y duraba 41; el Día 8 decía 22 y duraba 31; el Día 17 decía 22 y duraba 15): `src/lib/duration.ts` pasa a ser la única fuente de verdad del cálculo y los scripts `ajustar-duraciones.mjs` / `ajustar-subtitulos.mjs` sincronizan carteles y subtítulos con la realidad. Los **HIIT anunciaban intervalos que no cumplían**: los Días 4, 9, 13, 15 y 17 prometen 40s/20s, 20s/10s o 30s/20s en su subtítulo pero sus ejercicios tenían descansos de fuerza de 120 s y 90 s porque el pase genérico los trató como levantamiento — 58 descansos alineados con lo que dice su propio texto. Y el motor contaba el **trapecio como primario del Pájaro**, haciendo que un día de hombros pareciera repetir trapecio cuando solo era apoyo: pasa a sinergista. Nuevo test que vigila la repetición muscular: en días full body ningún primario puede aparecer más de la mitad de las veces, mientras que los días específicos (pierna, brazos) sí repiten a propósito. Verificado en emulador: el Día 2 muestra 33 MIN · 21 series con descansos de 2m / 1m / 1m30 según el músculo. |
| v8.5.39 | — | **Planes semanales por día y la home que dice qué toca hoy**: el plan repartía las sesiones con un contador (`completados % schedule`), así que la sesión de hoy dependía de cuántos entrenos llevabas hechos, no de qué día es — si el plan dice lunes Día 1 y martes Día 2, un jueves podía salir cualquier cosa. Ahora `src/lib/weekly-plan.ts` define el plan por día de la semana (lunes…domingo) y `sesionDeHoy()` resuelve qué toca con su motivo explícito. `src/lib/weekly-plans.ts` trae **7 planes**, incluido el recomendado **«Empuje · Tirón»**: lunes Día 1, martes Día 2, **miércoles Día 1 otra vez**, jueves Día 2, con viernes y sábado como **descanso opcional** (se puede entrenar) y domingo de descanso fijo. Los demás: Full Body 3 días, Empezando 3 días, Fuerza 4 días, Fuerza + Cardio 5 días, Cardio 3 días y Sin plan. La home muestra «Hoy toca X» con el motivo, o la tarjeta de descanso con botón «Entrenar igualmente» si es opcional; **sin plan dice «Elige un plan» en vez de inventarse una sesión**. Nuevo `WeeklyPlanPicker` con la semana entera de un vistazo (L M X J V S D) y la razón de cada plan; la elección se recuerda en el dispositivo. 14 pruebas (mismo día de la semana → siempre la misma sesión, planes coherentes, un solo recomendado). Verificado en emulador: la tarjeta muestra L=1 M=2 X=1 J=2 V=· S=· D=— y la home dice «Elige un plan» sin plan activo. |
| v8.5.40 | — | **Elegir un plan ahora se ve y se aplica entero**: al pulsar un plan semanal solo se guardaba el id en silencio, así que parecía que el toque no había hecho nada. Ahora al elegir un plan (1) se guarda, (2) la app vuelve sola a la pantalla de inicio para que se vea el efecto, (3) aparece un aviso de confirmación con el nombre del plan que se retira a los 5 s, (4) la tarjeta «Hoy» dice qué toca con su motivo («Jueves toca Día 2 en «Empuje · Tirón»»), y (5) el día seleccionado se sincroniza con lo que marca el plan en vez de quedarse el que hubiera pinchado a mano. La pantalla de Planes añade un bloque con el **plan activo** (o «Sin plan elegido») para que siempre se sepa en qué estado está. Verificado con CDP dentro del WebView del emulador: el flujo Planes → pulsar plan → guardado → vuelta a Inicio funciona y `localStorage` queda en `push-pull-4`; la home pasa a decir «Jueves toca Día 2». |
| v8.5.41 | F3.4 | **Comparativa mensual por grupo muscular**: nueva tarjeta «Comparativa Mensual» en Estadísticas que compara el volumen efectivo del mes en curso con el **mismo tramo** del mes pasado (día 1 → hoy contra día 1 → el mismo día, acotado si el mes es más corto — «1–9 oct vs 1–9 sep · mismo tramo»), grupo a grupo con las dos barras juntas y chips de variación («+47 %», «-50 %», «nuevo»; acotado a «>999 %» cuando el número deja de informar). El volumen lo define una sola vez el motor biomecánico: se extraen `accumulateMuscleStats` y `aggregateMajorGroups` (primarios 100 %, sinergistas 45 %) y `computeMuscleBreakdown` pasa a reutilizarlos, así las cifras de ambas tarjetas no pueden discrepar. 22 pruebas de la lógica, 9 del componente y 4 e2e (escritorio y móvil) que restauran una copia con entrenos de ambos tramos; verificado en Pixel 7 a 375 px, claro y oscuro. |
| v8.5.42 | F4.2 | **La suite e2e cubre ya los dos flujos críticos que faltaban** (el cambio de tema y la navegación ya lo estaban): completar un entreno guiado entero —las 6 series de la rutina de prueba, con su descanso a pantalla completa entre series, hasta el resumen y con la sesión guardada con todas sus series— y registrar un pesaje en Control de Peso que sigue ahí tras recargar la app. Nuevo `e2e/flujos-criticos.spec.js`, verde en escritorio y móvil (Pixel 7); la suite queda en 162 e2e entre los dos proyectos. Se documenta además el requisito que explicaba la suite en rojo al correrla tras publicar: `dist-apk` debe ser un export fresco de `main` — con uno viejo, el aviso «Actualización Lista» de la app tapa los clics. |
| v8.5.43 | F4.4 | **El reloj del descanso deja de repintar toda la pantalla del entreno**: descanso, preparación e intervalo de trabajo hacen tic cada segundo, y como el reloj vive dentro de `activeWorkout`, cada tic re-renderizaba la pantalla completa —justo mientras sigue siendo interactiva (F2.2)—. Medido con una sonda de renders nueva (`src/lib/perf-probe.ts` + `useRenderProbe`, apagada salvo que alguien la encienda desde fuera): **6 renders de la pantalla por cada 6 s de descanso → 1**. Ahora las pantallas de entreno (individual y guiado), el registrador de series, la ficha del ejercicio, el hook de última marca y AuthModal se suscriben solo a los campos que pintan; el tic repinta únicamente el reloj (RestBar/RestTimer). Nuevo `e2e/rendimiento-webview.spec.js` (3 pruebas × escritorio y móvil) que vigila la regla y pone tope holgado al arranque en frío. WebView Android: arranque en frío ~0,4 s de mediana (adb `am start -W`); export de la home: FCP 48–140 ms. |
| v8.5.44 | F5.1 | **Las notas de «Novedades» ya no dependen del límite de la API de GitHub**: la API pública solo permite 60 peticiones/hora por IP y, al agotarse (pasó el día anterior), la app caía al texto genérico «Mejoras y correcciones de mantenimiento». Ahora cada publicación genera `ota_server/changelog.json` —las 12 últimas versiones con sus cambios reales— servido por el CDN raw, que no tiene ese límite; `fetchChangelog` fusiona API + canal raw, completa las versiones sin notas (403 incluido) para Ajustes → Novedades, el aviso pre-descarga y la bienvenida tras actualizar, y fuerza una consulta nueva si la copia guardada venía sin notas. 8 pruebas nuevas y 1 e2e con la API simulada en 403. Verificado en emulador Android 16 con el cupo realmente agotado (0/60 y 403): aviso de la v8.5.44 → descarga → instalación conservando datos → modal con los 2 cambios reales. |
| v8.5.45 | F5.2 | **Ningún texto de la aplicación vuelve a quedar por debajo de 12 px**: los chips de músculos de las tarjetas de ejercicio (`ExerciseCard`) y la telemetría del visor 3D (`ThreeMuscleViewer`: «360° APAGADO», «SIN MÚSCULOS TRABAJADOS») se pintaban a 11 px, y el plan semanal, el distintivo «Nuevas» de Ajustes y el «Instalada» de Novedades tenían el mismo caso latente. Todo sube al suelo tipográfico del sistema (12 px, `text-xs`) y el token `label-caps` de Tailwind pasa también a 12 px. Con esto `e2e/design-system.spec.js` queda **20/20** y la **suite e2e completa 170/170 en verde** (antes 165 + 4 rojos + 1 intermitente). Verificado también con el APK de CI en el emulador Android 16: los chips del «Día 1: Empuje» y el HUD de Estadísticas se ven correctos y sin cortes (el salto de línea del HUD ya existía a 11 px; se comprobó midiendo). |
| v8.5.46 | F5.3 | **El APK ya solo permite HTTP sin cifrar hacia el puente LAN/Tailscale**: declaraba tráfico en claro «a todo» (`usesCleartextTraffic=true` y un `allowNavigation` amplio cuyas entradas, además, ni casaban con el formato que usa Capacitor 8). Ahora la política vive en `network_security_config.xml`: HTTP prohibido por defecto y permitido solo a 10.0.2.2 (emulador), 192.168.2.107 (WiFi de casa) y 100.126.164.101 (Tailscale); GitHub sigue por HTTPS. `allowNavigation` queda vacío (las URLs externas se abren en el navegador del sistema) y `cleartext:false` en `capacitor.config.json`. De paso, el service worker deja pasar las peticiones de otros orígenes: su fetch interno de http desde el contexto https fallaba (mixed content) y devolvía su respuesta de reserva, así que el puente nunca llegaba a la red desde la app. Verificado en emulador Android 16 con el APK: el fetch de la página y la descarga nativa del actualizador (8.389.401 B por 10.0.2.2) responden por los tres candidatos; example.com bloqueado con `net::ERR_CLEARTEXT_NOT_PERMITTED` y «Cleartext HTTP traffic not permitted» en la ruta nativa. Tests nuevos: `seguridad-red` (manifiesto + NSC + CANDIDATE_IPS en sync) y `service-worker` (guarda de origen cruzado). |
| v8.5.47 | F6.1 | **El detalle de rutina se queda solo con el modal — y por fin se audita**: la pantalla `/routine/[day]` no tenía ningún enlace (el detalle real es el modal que abre «Empezar»), así que se retira junto a su `ModeSelector`, que solo ella usaba. Los e2e del flujo de entreno dejan de entrar por esa ruta y recorren el camino real (home → modal → calentamiento → entreno), y la auditoría de sistema de diseño y contraste del detalle pasa a hacerse sobre el modal abierto con el análisis acotado a él. El modal gana semántica de diálogo (`role=dialog`, `aria-modal`, `aria-label`), lo que además hace que el gesto ATRÁS de Android lo cierre como al resto de diálogos. Y al medirlo apareció un fallo real de modo claro: el título «Día 1: Empuje» quedaba en **1,01:1** —prácticamente invisible— porque la remezcla del tema claro convierte `.text-white` en tinta oscura y la foto del héroe sigue siendo oscura en ambos temas; nueva utilidad `fx-on-media` para texto sobre imagen. También se corrigió la flaqueza de los e2e al medir con el cursor encima: las auditorías esperan al estado en reposo. |
| v8.5.48 | F6.2 | **El HUD del visor 3D cabe en una línea en móvil**: «SIN MÚSCULOS TRABAJADOS AÚN» y «12/16 MÚSCULOS TRABAJADOS» partían en dos líneas dentro de su píldora a 375 y 412 px —medido con los rectángulos de línea reales del navegador— y, al no caber, el flex encogía también la píldora izquierda, así que «360° APAGADO» se partía de rebote. Ahora el HUD dice «Sin músculos aún» y «N/16 músculos», y ambos estados caben en una línea de 360 a 412 px. Nuevo `e2e/hud-visor-3d.spec.js` (4 pruebas, escritorio y móvil): mide las líneas a 360/375/412 en el estado vacío y con un entreno restaurado por el camino real (Ajustes → Restaurar), y vigila que el texto no desborde su píldora. Verificado en el emulador Android 16 con el APK de CI (v8.5.48): «Sin músculos aún» sin datos y, al cambiar a «Total», «5/16 músculos» — ambos en una línea dentro de su píldora. A 320 px (por debajo de la base de 375) el ancho del HUD queda justo y las dos píldoras se parten — caso de borde documentado. |
| v8.5.49 | F6.3 | **El APK deja de aceptar contenido mixto: el http local sale del WebView**: la app vive en `https://localhost` y hablaba con el puente OTA (:8082) y la API local (:3001) por `http`, así que el WebView tenía que permitir contenido mixto (`allowMixedContent: true`). Ahora esas peticiones las hace el sistema operativo con `CapacitorHttp` —fuera del WebView, donde la restricción no existe y donde sigue aplicando la política de red del APK— mediante `fetchLocal` (src/lib/http-local.ts), y `allowMixedContent` pasa a `false`: el WebView rechaza cualquier https→http. En web y para https todo sigue con `fetch` normal. 10 pruebas del helper (nativo vs web, cabeceras, cuerpos JSON, 204, abort, fallback) y guardas anti-regresión en `seguridad-red`: el flag no puede volver a `true` y ninguna URL http local puede salir por `fetch` directo. Verificado en el WebView real del emulador: `fetch` a http bloqueado («Failed to fetch»), petición nativa 200 por el puente y por la API, y el fallback OTA completo con GitHub simulado caído pinta «Actualización Lista v9.9.9» (fixture local). El APK de CI se instala encima conservando datos y muestra «Tu aplicación está al día (v8.5.49)». De paso, el compose gana un servicio renombrado (`titanium-db` + alias `db`) para que no pueda confundirse con el servicio homónimo del compose de Nextcloud que convive en la carpeta. |
| v8.5.50 | F6.4 | **El nombre del ejercicio se lee al tocarlo**: al pasar el dedo por una tarjeta, el nombre se pintaba en el verde de acento (emerald-600, `#059669`) sobre la tarjeta clara, que da **3,60:1** — por debajo del mínimo de 4,5:1, así que el nombre se desvanecía justo en el gesto de tocarlo. Ahora el hover usa un verde propio para texto (`--primary-strong-rgb`): en claro, el mismo verde que ya emplea el texto primario del tema (`#036B4B`, **6,26:1** sobre la tarjeta en hover y 6,55:1 sobre blanca); en oscuro, el acento de siempre (`#10B981`, 6,60:1), sin cambiar nada de lo que se ve. Aplica a las tres tarjetas (detalle de rutina, catálogo y home). El e2e de contraste audita ya también el estado hover: con la clase antigua falla con 3,60:1 medidos (`rgb(5,150,105)` sobre `rgb(248,250,252)`), así que no puede volver sin que la suite lo diga. |
| v8.5.51 | F7.1 | **Los estados también se leen: hover de la lista, foco de teclado y campos con contorno**: la auditoría nueva de estados interactivos —hover, pulsado y foco, en los dos temas— encontró tres fallos que nadie medía. El nombre del ejercicio dentro de la lista de una rutina se pintaba con `group-hover/item:text-primary` y quedaba en **3,77:1** sobre la tarjeta blanca (el mismo acento crudo que F6.4, pero en el `group/item` que la guarda anterior no miraba): pasa a `text-primary-strong` (**6,5:1**). El anillo de foco global usaba emerald-600 y sobre las superficies hundidas (`#DFE4EA`) daba **2,96:1** —por debajo del 3:1 de WCAG para indicadores—: token nuevo `--focus-ring`, `#036B4B` en claro (**5,1:1** sobre la hundida, 6,5:1 sobre blanco) y el acento de siempre en oscuro (7,6:1). Y los campos de peso/reps/notas apagaban el contorno con `focus:outline-none` (2 px transparentes) sin pintar alternativa, así que al tabular no se veía el foco: el color del anillo se repinta solo con teclado. Nuevo `e2e/estados-interactivos.spec.js` (4 casos × 2 temas; 14 pasan y 2 se saltan en móvil porque el hover no existe en táctil) y 5 pruebas en `foco-teclado.test.ts`; suite completa **189 pasan** (5 intermitentes que pasaron al reintentar). |
