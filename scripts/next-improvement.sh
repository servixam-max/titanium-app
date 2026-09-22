#!/bin/bash
# Imprime la siguiente tarea pendiente del plan diario de FORTIXAM.
# Sin timestamps: salida determinista -> sirve como `monitor` de cron
# (mientras no se cierre una casilla, el agente no vuelve a despertar).

PLAN="/Users/servimac/apps/Titanium/titanium-app/docs/plan-mejora-diaria.md"
if [ ! -f "$PLAN" ]; then
  echo "PLAN NO ENCONTRADO: $PLAN"
  exit 0
fi

NEXT=$(grep -n '^- \[ \]' "$PLAN" | head -1)
if [ -z "$NEXT" ]; then
  echo "PLAN COMPLETO: no quedan tareas sin marcar"
  exit 0
fi

echo "SIGUIENTE TAREA DEL PLAN:"
echo "$NEXT"
echo "TOTAL PENDIENTES: $(grep -c '^- \[ \]' "$PLAN")"
