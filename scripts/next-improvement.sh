#!/bin/bash
# Imprime la siguiente tarea pendiente del plan diario de FORTIXAM.
#
# Es el `monitor` del cron: su salida se hashea y, si es idéntica a la del día
# anterior, la ejecución del agente se suprime (ahorra tokens).
#
# IMPORTANTE (anti-atasco): mirar SOLO el texto del plan crea un callejón sin
# salida. Si el agente falla o se queda sin tiempo antes de marcar la casilla,
# el plan queda igual y el monitor suprime todos los días siguientes para
# siempre. Por eso la salida incluye también el ESTADO DE TRABAJO -y no solo el
# plan-: si queda trabajo a medias (árbol sucio, commits sin publicar) o si
# pasan los días sin publicar, la salida cambia y el agente vuelve a despertar.
# Determinista: sin horas (solo la fecha en días), así que dentro del mismo día
# la salida es estable.

PLAN="/Users/servimac/apps/Titanium/titanium-app/docs/plan-mejora-diaria.md"
REPO="/Users/servimac/apps/Titanium/titanium-app"

if [ ! -f "$PLAN" ]; then
  echo "PLAN NO ENCONTRADO: $PLAN"
  exit 0
fi

NEXT=$(grep -n '^- \[ \]' "$PLAN" | head -1)
if [ -z "$NEXT" ]; then
  # Plan completo: salida fija -> el monitor deja de despertar al agente.
  echo "PLAN COMPLETO: no quedan tareas sin marcar"
  exit 0
fi

cd "$REPO" 2>/dev/null || { echo "REPO NO ENCONTRADO: $REPO"; exit 0; }

SUCIO=$(git status --porcelain | wc -l | tr -d ' ')
SIN_PUSH=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo '?')
DIAS=$(( ( $(date +%s) - $(git log -1 --format=%ct 2>/dev/null || date +%s) ) / 86400 ))

echo "SIGUIENTE TAREA DEL PLAN:"
echo "$NEXT"
echo "TOTAL PENDIENTES: $(grep -c '^- \[ \]' "$PLAN")"
echo "CAMBIOS SIN COMMITEAR: $SUCIO"
echo "COMMITS SIN PUBLICAR: $SIN_PUSH"
echo "DIAS SIN PUBLICAR: $DIAS"
