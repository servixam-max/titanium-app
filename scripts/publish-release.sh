#!/usr/bin/env bash
set -e

# Read version from ota_server/version.json
VERSION=$(node -e "console.log(require('./ota_server/version.json').version)")
APK="FORTIXAM-${VERSION}.apk"

if [ ! -f "$APK" ]; then
  echo "El archivo $APK no existe. Compila el APK primero."
  exit 1
fi

echo "Publicando release v${VERSION} en GitHub..."
gh release create "v${VERSION}" "$APK" \
  --title "FORTIXAM v${VERSION}" \
  --notes "Actualización global de FORTIXAM v${VERSION}." \
  --clobber

echo "¡Release v${VERSION} publicado con éxito en GitHub!"
