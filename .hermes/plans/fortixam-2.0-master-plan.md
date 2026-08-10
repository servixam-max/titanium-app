# FORTIXAM 2.0 — Plan Maestro de Mejoras

> **Para Hermes:** Usar `subagent-driven-development` para implementar tarea a tarea con revisión en dos etapas (spec compliance + code quality).

**Goal:** Convertir FORTIXAM en una app de entrenamiento móvil premium: más visual, más nativa, más útil, con más rutinas, mejor audio guía, nuevas imágenes coherentes y funcionalidades que realmente mejoren la constancia.

**Architecture:** Seguir con Next.js 14 + Tailwind + Zustand + Capacitor 6, pero consolidar lógica en el store, extraer componentes reutilizables y añadir capa de utilidades UX (audio, haptics, animaciones, utilidades de tiempo). Mantener offline-first con Dexie.

**Tech Stack:** Next.js 14, React 18, TailwindCSS 3, Zustand, Framer Motion (ya instalado), Capacitor 6, Dexie, Web Speech API, Web Audio API.

---

## Fase 1 — UX Móvil Nativa (la app debe "sentarse" como una app de verdad)

### Task 1.1: Revisar tipografía y escala móvil
- **Files:** `tailwind.config.ts`, `src/app/globals.css`
- **Objetivo:** Definir una escala tipográfica mobile-first con tamaños que no rompan en pantallas pequeñas.
- **Cambios:**
  - Añadir `font-headline-xl-mobile` (24/28), `font-headline-sm-mobile` (16/20).
  - Hacer `display-timer` responsive (actualmente 84px fijo; en móvil pequeño debería ser 56-64px).
  - Asegurar que todos los inputs sean mínimo 16px para evitar zoom de iOS (ya lo son en la mayoría, revisar).
- **Verificación:** `npm run build` OK + screenshot móvil del timer de descanso sin corte.

### Task 1.2: Consolidar headers y navegación
- **Files:** `src/components/ui/TopAppBar.tsx`, `src/components/ui/BottomNav.tsx`, `src/app/page.tsx`, `src/app/routine/[day]/RoutinePage.tsx`, `src/app/history/page.tsx`, `src/app/stats/page.tsx`, `src/app/weight/page.tsx`, `src/app/warmup/page.tsx`, `src/app/workout/complete/page.tsx`
- **Objetivo:** Usar siempre el mismo componente de header; eliminar headers inline.
- **Cambios:**
  - Hacer que `TopAppBar` soporte variantes (transparente, sólido, workout).
  - En `Dashboard`, reemplazar header inline por `TopAppBar`.
  - En `RoutinePage`, alinear paddings con el resto de la app.
  - Asegurar `safe-top` en todas las páginas con header fijo.
- **Verificación:** Navegar entre pantallas; el header no debe saltar ni duplicarse.

### Task 1.3: Mejorar bottom sheet / modal de ajustes
- **Files:** `src/components/ui/SettingsModal.tsx`, `src/app/page.tsx`
- **Objetivo:** Que el modal de ajustes entre como bottom sheet en móvil y como modal centrado en escritorio.
- **Cambios:**
  - Animar entrada/salida con Framer Motion.
  - Usar `max-w-app` centrado con transición slide-up.
  - Añadir backdrop con cierre al tocar.
  - Agrupar opciones en secciones con iconos.
- **Verificación:** Abrir/cerrar ajustes desde dashboard y desde stats/history.

### Task 1.4: Pulir tarjetas de rutina en dashboard
- **Files:** `src/components/ui/RoutineCard.tsx`, `src/app/page.tsx`
- **Objetivo:** Tarjetas más informativas, táctiles y con mejor jerarquía visual.
- **Cambios:**
  - Mostrar tags de grupos musculares (pecho, espalda, HIIT, etc.) con chips redondos.
  - Añadir indicador de duración + número de series totales.
  - Hacer la imagen de cover más contrastada (gradiente más fuerte).
  - Añadir hover/press state con escala sutil.
- **Verificación:** Visual comparison móvil de dashboard.

### Task 1.5: Rediseñar selector de modalidad (`ModeSelector`)
- **Files:** `src/components/ui/ModeSelector.tsx`
- **Objetivo:** Que sea obvio qué modo estás eligiendo y cuál es la diferencia.
- **Cambios:**
  - Iconos más grandes y descriptivos.
  - Texto explicativo más corto.
  - Indicador visual de selección (borde neón + check).
  - Añadir tooltips o badges "Recomendado" / "Para avanzados".
- **Verificación:`npm run build` + screenshot.

### Task 1.6: Mejorar lista de ejercicios en `RoutinePage`
- **Files:** `src/app/routine/[day]/RoutinePage.tsx`, `src/components/ui/ExerciseCard.tsx`
- **Objetivo:** Que cada ejercicio se vea como una tarjeta de ejercicio real, no una fila genérica.
- **Cambios:**
  - Mostrar imagen del ejercicio en la tarjeta.
  - Añadir badge de categoría muscular.
  - Mostrar descanso y dificultad.
  - En modo individual, resaltar el ejercicio seleccionado con animación.
- **Verificación:** Entrar a Día 1, ver lista, cambiar a modo individual, seleccionar ejercicio.

### Task 1.7: Mejorar pantalla de entrenamiento activo (`guided` e `individual`)
- **Files:** `src/app/workout/guided/page.tsx`, `src/app/workout/individual/page.tsx`
- **Objetivo:** Mayor claridad de qué serie estás haciendo, próximo ejercicio, y controles accesibles con una mano.
- **Cambios:**
  - Agrandar zona de peso/reps y hacerla más escaneable.
  - Botón principal más grande en la parte inferior (zona del pulgar).
  - Mostrar mini-timeline de ejercicios arriba (scroll horizontal con dots).
  - Añadir botón "Repetir última serie" por si fallaste.
  - Feedback visual inmediato al completar (flash + micro-vibration).
- **Verificación:** Hacer un entrenamiento guiado de prueba; todo debe ser usable con una mano.

### Task 1.8: Mejorar overlay de descanso
- **Files:** `src/app/workout/guided/page.tsx`, `src/components/ui/RestTimer.tsx`
- **Objetivo:** Descanso más inmersivo, con info útil y controles sin distracciones.
- **Cambios:**
  - Fondo oscuro con halo neón que pulsa.
  - Número del timer más grande y centrado.
  - Preview del siguiente ejercicio con imagen, sets y reps.
  - Botones +/-15s más grandes y accesibles.
  - Botón "Saltar descanso" en la parte inferior.
- **Verificación:** Screenshot del overlay en móvil.

### Task 1.9: Pantalla de completado (`workout/complete`)
- **Files:** `src/app/workout/complete/page.tsx`
- **Objetivo:** Celebración más épica e informativa.
- **Cambios:**
  - Confetti ya existe; añadir sonido de celebración más largo.
  - Mostrar resumen por ejercicio (mejor serie, peso máximo).
  - Añadir botón "Compartir resumen" (generar imagen/texto nativo si es posible).
  - Animación de entrada de los stat boxes.
- **Verificación:** Finalizar un entrenamiento y ver pantalla.

### Task 1.10: Pantalla de historial más escaneable
- **Files:** `src/app/history/page.tsx`
- **Objetivo:** Que sea fácil ver progreso y buscar sesiones antiguas.
- **Cambios:**
  - Filtros por día/modo arriba.
  - Sesiones colapsables con animación suave.
  - Mostrar volumen total por sesión y tiempo.
  - Añadir búsqueda por nombre de ejercicio (opcional).
- **Verificación:** Scroll de historial con varias sesiones.

### Task 1.11: Estadísticas con gráficos más ricos
- **Files:** `src/app/stats/page.tsx`
- **Objetivo:** Más motivación visual.
- **Cambios:**
  - Añadir heatmap de días entrenados (últimas 4 semanas).
  - Gráfico de volumen semanal y mensual.
  - Mostrar PRs (peso máximo por ejercicio).
  - Añadir tendencia de peso corporal si hay registros.
- **Verificación:** `npm run build` + visual check.

### Task 1.12: Página de peso más nativa
- **Files:** `src/app/weight/page.tsx`
- **Objetivo:** Registro rápido y gráfico claro.
- **Cambios:**
  - Input grande tipo rueda o teclado numérico.
  - Gráfico de línea con área rellena.
  - Notas de variación con flechas de color.
  - Recordatorio si no pesas en X días.
- **Verificación:** Añadir un peso y ver gráfico.

---

## Fase 2 — Audio, Voz y Haptics (feedback que guía de verdad)

### Task 2.1: Mejorar motor de audio y voz
- **Files:** `src/lib/audio.ts`, `src/lib/speech.ts`
- **Objetivo:** Audio más robusto, especialmente en Android WebView y iOS.
- **Cambios:**
  - Encolar anuncios para que no se solapen.
  - Detectar si el dispositivo está en silencio y avisar al usuario.
  - Precargar voces al inicio.
  - Añadir función `speakWithQueue`.
  - Añadir opción de velocidad de voz en ajustes.
- **Verificación:** Probar página `/audio` en móvil real.

### Task 2.2: Anuncios contextuales durante el entreno
- **Files:** `src/lib/audio.ts`, `src/app/workout/guided/page.tsx`, `src/app/workout/individual/page.tsx`
- **Objetivo:** La voz te dice cosas útiles, no solo nombres.
- **Cambios:**
  - "Quedan 2 series" al empezar un ejercicio si quedan pocas.
  - "Última serie, dalo todo".
  - "Descanso de X segundos" + "prepara [siguiente ejercicio]".
  - "Faltan 30 segundos" durante descansos largos.
  - Aviso de mitad de entrenamiento.
- **Verificación:** Hacer entrenamiento guiado con audio activado.

### Task 2.3: Mejorar pitidos y vibraciones
- **Files:** `src/lib/audio.ts`, `src/lib/haptics.ts` (nuevo)
- **Objetivo:** Feedback táctil y sonoro en momentos clave.
- **Cambios:**
  - Crear `src/lib/haptics.ts` con patrones: success, error, tick, countdown, complete.
  - Usar vibración en: completar serie, saltar ejercicio, inicio/fin descanso, fin entrenamiento.
  - Añadir pequeño pitido en cada segundo de los últimos 5 del descanso.
- **Verificación:** Probar en móvil real (Android/iOS).

### Task 2.4: Modo "solo pitidos" y "solo voz"
- **Files:** `src/components/ui/SettingsModal.tsx`, `src/lib/store.ts`, `src/lib/types.ts`, `src/lib/audio.ts`
- **Objetivo:** Que el usuario elija qué tipo de audio quiere.
- **Cambios:**
  - Añadir preferencia `audioMode: 'full' | 'beeps' | 'voice' | 'silent'`.
  - Actualizar anuncios para respetar el modo.
  - UI en ajustes con 4 opciones visuales.
- **Verificación:** Cambiar modos y hacer entrenamiento; comportamiento correcto.

---

## Fase 3 — Nuevos Ejercicios, Rutinas y Semanas

### Task 3.1: Ampliar biblioteca de ejercicios
- **Files:** `src/lib/data.ts`, `src/lib/types.ts`, `public/images/exercises/`
- **Objetivo:** Tener más ejercicios para construir rutinas variadas.
- **Nuevos ejercicios a añadir:**
  - **Pecho:** press inclinado, press declinado, crossover con mancuernas, flexiones diamante.
  - **Espalda:** remo con barra (simulado con mancuerna), face pull con toalla, hiperextensiones, remo en T.
  - **Hombros:** press Arnold, pájaro, elevación frontal, encogimientos.
  - **Bíceps:** curl predicador, curl concentración, curl cable/mancuerna, curl inverso.
  - **Tríceps:** fondos en banco, patada de tríceps, extensión de tríceps, flexión cerrada.
  - **Piernas:** sentadilla búlgara, sentadilla frontal, peso muerto sumo, zancadas caminando, hip thrust, curl femoral, extensiones de cuádriceps.
  - **Core:** abdominales bicicleta, crunch, elevación de piernas, vacío abdominal, palanca lateral, russian twist.
  - **Full body / HIIT:** burpees, mountain climbers, jumping jacks, box jumps, thrusters, man makers, kettlebell swing.
- **Verificación:** Todos los ejercicios tienen `id` único, categoría, dificultad e imagen.

### Task 3.2: Generar imágenes de nuevos ejercicios con ComfyUI
- **Files:** `scripts/generate-exercise-images.py` (nuevo), `public/images/exercises/`
- **Objetivo:** Tener imágenes coherentes con el estilo actual (dark-neon lime) para los nuevos ejercicios.
- **Cambios:**
  - Escribir script que, dado un listado de ejercicios, genere prompts para ComfyUI y descargue las imágenes.
  - Prompt base: "Minimalist fitness illustration, single muscular figure performing [exercise], dark background, neon lime accent (#ccff00), flat vector style, high contrast, centered, no text, no UI".
  - Guardar como `screen.png` dentro de carpeta normalizada.
- **Verificación:** Generar al menos 10 imágenes y revisar visualmente coherencia.

### Task 3.3: Añadir rutinas adicionales (Días 6, 7, 8+)
- **Files:** `src/lib/data.ts`
- **Objetivo:** Más días para no aburrirse.
- **Propuestas:**
  - **Día 6: Pierna y Core** — sentadilla búlgara, peso muerto sumo, zancadas, hip thrust, puente, plancha, abdominales.
  - **Día 7: Brazos (bíceps/tríceps)** — curl clásico, martillo, concentración, copa tríceps, fondos, patada tríceps.
  - **Día 8: Full Body Express (20 min)** — thrusters, remo, sentadilla, flexiones, plancha.
  - **Día 9: HIIT 20 min** — 4 ejercicios, 40s trabajo / 20s descanso.
  - **Día 10: Movilidad y Recuperación** — estiramientos, foam roller simulado, respiración.
- **Verificación:** Cada rutina aparece en dashboard con imagen, duración y ejercicios.

### Task 3.4: Rutinas semanales predefinidas
- **Files:** `src/lib/data.ts`, `src/lib/types.ts`
- **Objetivo:** Que el usuario pueda elegir un plan de 4 semanas.
- **Cambios:**
  - Añadir tipo `Plan` con nombre, descripción y array de `day` por semana.
  - Crear planes: "Fuerza 3 días", "Fuerza 4 días", "HIIT 2 días", "Mixto".
  - En dashboard, añadir selector de plan y mostrar qué día toca hoy.
- **Verificación:** Seleccionar plan y ver días recomendados marcados.

### Task 3.5: Ejercicios favoritos y recientes
- **Files:** `src/lib/store.ts`, `src/lib/types.ts`, `src/app/routine/[day]/RoutinePage.tsx`
- **Objetivo:** Acceso rápido a lo que más usas.
- **Cambios:**
  - Guardar en store ejercicios más usados y últimos pesos.
  - En página de ejercicio libre (Día 4), mostrar ejercicios favoritos.
- **Verificación:** Hacer ejercicios y ver que aparecen en favoritos.

---

## Fase 4 — Funcionalidades Nuevas que Enganchan

### Task 4.1: Temporizador de descanso flotante
- **Files:** `src/components/ui/FloatingRestTimer.tsx` (nuevo), `src/app/workout/individual/page.tsx`
- **Objetivo:** En modo individual, permitir iniciar un descanso sin bloquear la pantalla.
- **Cambios:**
  - Crear componente flotante minimizable.
  - Mostrar tiempo restante y botones +/-15s, saltar.
  - Sonar/vibrar al finalizar.
- **Verificación:** Entrenamiento individual con descanso flotante.

### Task 4.2: Modo "Superset"
- **Files:** `src/lib/types.ts`, `src/lib/data.ts`, `src/lib/store.ts`, `src/app/workout/guided/page.tsx`
- **Objetivo:** Permitir definir superseries en rutinas (dos ejercicios seguidos, luego descanso).
- **Cambios:**
  - Añadir campo `supersetGroup?: string` a `Exercise`.
  - En `completeSet`, si el siguiente ejercicio es del mismo superset, avanzar sin descanso.
  - UI mostrando "Superset 1/2".
- **Verificación:** Crear rutina de prueba con superset y ejecutar.

### Task 4.3: Temporizador AMRAP / EMOM
- **Files:** `src/lib/types.ts`, `src/app/workout/` (nueva página o modal)
- **Objetivo:** Añadir modalidades de entrenamiento por tiempo.
- **Cambios:**
  - Añadir tipo de rutina `amrap` y `emom`.
  - Crear pantalla/timer específico.
  - Integrar en dashboard como "Modos especiales".
- **Verificación:** Probar AMRAP de 10 minutos.

### Task 4.4: Progresiones sugeridas
- **Files:** `src/lib/store.ts`, `src/lib/utils/progression.ts` (nuevo), `src/app/routine/[day]/RoutinePage.tsx`
- **Objetivo:** Sugerir cuándo subir peso.
- **Cambios:**
  - Calcular si el usuario completó todas las series en el rango alto de reps.
  - Mostrar sugerencia: "Sube 1-2 kg la próxima vez".
  - Guardar últimos pesos y mostrar en la pantalla de ejercicio.
- **Verificación:** Hacer serie con reps altas y ver sugerencia.

### Task 4.5: Recordatorios y notificaciones (Capacitor)
- **Files:** Capacitor plugins, `src/lib/notifications.ts` (nuevo), `src/app/page.tsx`
- **Objetivo:** Recordar entrenar.
- **Cambios:**
  - Instalar `@capacitor/local-notifications`.
  - Configurar notificación diaria a hora configurable en ajustes.
  - Añadir badge de racha en icono de app si es posible.
- **Verificación:** Probar notificación local en Android.

### Task 4.6: Compartir resumen nativo
- **Files:** `src/app/workout/complete/page.tsx`, `src/lib/share.ts` (nuevo)
- **Objetivo:** Compartir entrenamiento en redes/mensajes.
- **Cambios:**
  - Generar texto con resumen.
  - Usar Web Share API si está disponible.
  - Fallback a copiar al portapapeles.
- **Verificación:** Pulsar "Compartir" en pantalla de completado.

### Task 4.7: Widget de inicio rápido / acciones rápidas
- **Files:** `src/app/page.tsx`, `src/components/ui/QuickActions.tsx` (nuevo)
- **Objetivo:** Botones grandes para lo más frecuente.
- **Cambios:**
  - Añadir sección "Acciones rápidas": último entreno, día recomendado, calentamiento, registrar peso.
- **Verificación:** Dashboard muestra acciones rápidas.

### Task 4.8: Modo oscuro automático / temas
- **Files:** `tailwind.config.ts`, `src/app/globals.css`, `src/components/ui/SettingsModal.tsx`
- **Objetivo:** Aunque la app es oscura, permitir ajustes de acento.
- **Cambios:**
  - Opciones de color de acento: lime (actual), naranja, azul, rosa.
  - Guardar preferencia en store.
  - Aplicar CSS variables dinámicas.
- **Verificación:** Cambiar color y ver reflejo en toda la app.

---

## Fase 5 — Refactor Técnico y Calidad

### Task 5.1: Extraer componentes comunes
- **Files:** `src/components/ui/TimerCircle.tsx`, `src/components/ui/ExerciseImage.tsx`, `src/components/ui/PrimaryButton.tsx`, `src/components/ui/SectionTitle.tsx`
- **Objetivo:** Menos duplicación, más consistencia.
- **Cambios:**
  - `TimerCircle`: usado en descanso, warmup, AMRAP.
  - `ExerciseImage`: fallback, object-contain, onError.
  - `PrimaryButton`: estilos de botón principal.
  - `SectionTitle`: título con línea de color o icono.
- **Verificación:** Reemplazar usos inline por componentes; build OK.

### Task 5.2: Consolidar lógica de entrenamiento en el store
- **Files:** `src/lib/store.ts`, `src/app/workout/guided/page.tsx`, `src/app/workout/individual/page.tsx`
- **Objetivo:** Que el store sea la única fuente de verdad del estado activo.
- **Cambios:**
  - Mover `handleComplete` y navegación al store (ya parcialmente hecho).
  - Añadir `previousExercise`, `goToExercise(index)`, `resetCurrentSet()`.
  - Simplificar las páginas de workout para que solo rendericen.
- **Verificación:** Tests manuales de avance/retroceso/series.

### Task 5.3: Limpiar lint y errores TypeScript
- **Files:** Todo el proyecto.
- **Objetivo:** `npm run lint` sin errores de nuestros archivos.
- **Cambios:**
  - Eliminar imports y variables sin usar.
  - Corregir `any` explícitos.
  - Añadir dependencias faltantes en hooks o usar refs.
  - Preferir `const` donde no se reasigna.
- **Verificación:** `npm run lint` pasa.

### Task 5.4: Tests con Playwright
- **Files:** `tests/` (nuevo), `package.json`, `playwright.config.ts` (nuevo)
- **Objetivo:** Tener tests E2E básicos para los flujos críticos.
- **Cambios:**
  - Instalar/configurar Playwright (ya está como devDep).
  - Test: "Iniciar entrenamiento guiado, completar una serie, avanzar".
  - Test: "Registro de peso".
  - Test: "Navegación dashboard → rutina → workout".
- **Verificación:** `npx playwright test` pasa.

### Task 5.5: Service Worker y offline
- **Files:** `public/sw.js`, `src/app/layout.tsx`
- **Objetivo:** Mejorar experiencia offline.
- **Cambios:**
  - Revisar `sw.js` para cachear assets estáticos.
  - Mostrar toast "Sin conexión" si falla sync.
  - Asegurar que IndexedDB funciona offline.
- **Verificación:** Desconectar red, usar app, reconectar, sync.

---

## Fase 6 — Imágenes y Branding

### Task 6.1: Regenerar/imagen de ejercicios existentes si es necesario
- **Files:** `scripts/generate-exercise-images.py`, `public/images/exercises/`
- **Objetivo:** Imágenes coherentes y de calidad.
- **Cambios:**
  - Auditar imágenes actuales.
  - Generar nuevas para las que no tengan buena calidad.
  - Asegurar estilo consistente.
- **Verificación:** Revisión visual de todas las imágenes.

### Task 6.2: Iconos y splash screen para Capacitor
- **Files:** `assets/`, `capacitor.config.ts`, `android/app/src/main/res/`
- **Objetivo:** Que la app se vea nativa en el launcher.
- **Cambios:**
  - Generar iconos adaptativos y splash screens.
  - Actualizar manifest de Android.
- **Verificación:** Build de APK y ver icono/splash en móvil.

### Task 6.3: Animaciones de transición entre pantallas
- **Files:** `src/app/layout.tsx` o wrapper con Framer Motion.
- **Objetivo:** Transiciones suaves tipo app nativa.
- **Cambios:**
  - Añadir AnimatePresence para transiciones de página.
  - Cuidado con rendimiento en Capacitor.
- **Verificación:** Navegar y notar transiciones suaves.

---

## Fase 7 — Onboarding y Experiencia de Primer Uso

### Task 7.1: Onboarding inicial
- **Files:** `src/app/onboarding/page.tsx` (nuevo), `src/app/page.tsx`
- **Objetivo:** Explicar la app en 3-4 pantallas.
- **Cambios:**
  - Bienvenida, elegir plan, probar audio, permisos.
  - Guardar flag `hasCompletedOnboarding`.
- **Verificación:** Primera instalación muestra onboarding.

### Task 7.2: Tooltips contextuales
- **Files:** `src/components/ui/Tooltip.tsx` (nuevo)
- **Objetivo:** Explicar elementos sin abrumar.
- **Cambios:**
  - Tooltip en botón de audio, selector de modo, botón de completar serie.
  - Mostrar solo las primeras veces.
- **Verificación:** Usar app y ver tooltips iniciales.

### Task 7.3: Página de ayuda / preguntas frecuentes
- **Files:** `src/app/help/page.tsx` (nuevo)
- **Objetivo:** Resolver dudas sin salir de la app.
- **Cambios:**
  - FAQ: ¿Cómo cambiar peso? ¿Qué es modo guiado? ¿Cómo exportar datos?
  - Enlace a test de audio.
- **Verificación:** Abrir página de ayuda desde ajustes.

---

## Fase 8 — Integración y Build

### Task 8.1: Actualizar versión y release notes
- **Files:** `package.json`, `src/components/ui/SettingsModal.tsx`
- **Objetivo:** Marcar la 2.0.
- **Cambios:**
  - Cambiar versión a `2.0.0`.
  - Mostrar "Novedades 2.0" en settings.

### Task 8.2: Build y APK
- **Files:** Todo.
- **Objetivo:** Generar APK funcional.
- **Comandos:**
  - `cp next.config.apk.mjs next.config.mjs`
  - `npm run build`
  - `npx cap sync android`
  - Gradle build con Java 17.
- **Verificación:** APK instalable en móvil real.

### Task 8.3: Capturas móviles para verificación
- **Objetivo:** Documentar visualmente el resultado.
- **Capturas requeridas:**
  - Dashboard con todas las rutinas.
  - Pantalla de rutina con lista de ejercicios.
  - Entrenamiento guiado en serie 2 de 3.
  - Overlay de descanso.
  - Pantalla de completado.
  - Historial y stats.
- **Verificación:** Capturas revisadas punto por punto.

---

## Priorización Sugerida

### Sprint A (fundamentos visuales + audio)
1. Tipografía y escala móvil.
2. Headers consolidados.
3. Mejorar tarjetas de rutina.
4. Mejorar audio/voz (cola, modos).
5. Limpiar lint.

### Sprint B (entrenamiento perfecto)
6. Pantalla de entreno activo mejorada.
7. Overlay de descanso mejorado.
8. Consolidar store.
9. Componentes comunes.
10. Tests E2E básicos.

### Sprint C (contenido nuevo)
11. Nuevos ejercicios.
12. Generar imágenes nuevas.
13. Nuevas rutinas (Día 6, 7, 8...).
14. Planes semanales.

### Sprint D (funcionalidades premium)
15. Progresiones sugeridas.
16. Temporizador flotante / supersets.
17. AMRAP/EMOM.
18. Notificaciones locales.
19. Compartir resumen.
20. Temas de color.

### Sprint E (pulido)
21. Onboarding.
22. Iconos/splash.
23. Transiciones.
24. Capturas móviles y build APK.

---

## Notas de Implementación

- **No tocar** el backend deshabilitado en `src/app/_api_disabled/` salvo que se reactive.
- **Mantener** la basePath y configuración de Capacitor tal cual; no cambiar URLs del proyecto Spotify Payments ni de la boda.
- **Todas las imágenes nuevas** deben seguir el patrón `/images/exercises/<folder-normalized>/screen.png`.
- **Mobile-first en todo:** diseñar primero para 375px de ancho.
- **Accesibilidad:** inputs 16px+, touch targets 48px+, contraste suficiente.
- **Performance:** evitar re-renderizados masivos en workout; usar `useMemo`/`useCallback` donde sea crítico.

---

## Cómo Empezar

1. Crear rama `feat/fortixam-2.0`.
2. Implementar Sprint A tarea por tarea.
3. Cada tarea: test manual + `npm run build`.
4. Al final de cada sprint: `npm run lint` + capturas móviles.
5. Al final del plan: build APK y verificación en dispositivo real.
