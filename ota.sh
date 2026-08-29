#!/bin/bash

# Script to serve OTA updates to the FORTIXAM app
# Usage: ./ota.sh <version> <apk_file>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Uso: ./ota.sh <version> <apk_file>"
  echo "Ejemplo: ./ota.sh 3.2 ./FORTIXAM-3.2.apk"
  exit 1
fi

VERSION=$1
APK_FILE=$2

if [ ! -f "$APK_FILE" ]; then
  echo "Error: No se encuentra el archivo $APK_FILE"
  exit 1
fi

mkdir -p ota_server
cp "$APK_FILE" ota_server/FORTIXAM-latest.apk

cat <<JSON > ota_server/version.json
{
  "version": "$VERSION",
  "url": "http://100.126.164.101:8082/FORTIXAM-latest.apk"
}
JSON

echo "========================================="
echo "✅ Servidor OTA configurado para versión $VERSION"
echo "🌐 Iniciando servidor en http://100.126.164.101:8082"
echo "📱 Mantén esta terminal abierta para que la app pueda descargar la actualización."
echo "========================================="

cd ota_server && python3 ../sync_server.py
