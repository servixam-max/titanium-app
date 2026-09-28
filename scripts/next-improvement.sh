#!/bin/bash
# Imprime la siguiente tarea pendiente del plan diario de FORTIXAM.
#
# Es el `monitor` del cron: su salida se hashea y, si es idéntica a la del día
# anterior, la ejecución del agente se suprime (ahorra tokens).
#
# ANTI-ATASCO (por qué la salida lleva la fecha):
# mirar solo el texto del plan crea un callejón sin salida. Si el agente falla
# o se queda sin tiempo antes de marcar la casilla, el plan queda igual, la
# salida no cambia y el monitor suprime TODOS los días siguientes: el bot se
# duerme para siempre (pasó del 25 al 28 de septiembre). Con la fecha incluida,
# mientras haya alguna casilla sin marcar la salida cambia cada día y el agente
# vuelve a despertar; cuando el plan esté completo, la salida es fija y el
# monitor duerme al agente (ya no hay trabajo pendiente).
#
# Determinista: la fecha en días cambia una vez al día, no en cada tick.

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

echo "DIA: $(date +%Y-%m-%d)"
echo "SIGUIENTE TAREA DEL PLAN:"
echo "$NEXT"
echo "TOTAL PENDIENTES: $(grep -c '^- \[ \]' "$PLAN")"
echo "CAMBIOS SIN COMMITEAR: $(git status --porcelain | wc -l | tr -d ' ')"
echo "COMMITS SIN PUBLICAR: $(git rev-list --count origin/main..HEAD 2>/dev/null || echo '?')"
