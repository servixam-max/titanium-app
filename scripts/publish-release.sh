#!/usr/bin/env bash
set -e

VERSION=$(node -e "console.log(require('./ota_server/version.json').version)")
APK="FORTIXAM-${VERSION}.apk"

if [ ! -f "$APK" ]; then
  echo "El archivo $APK no existe. Compila el APK primero."
  exit 1
fi

echo "Verificando release v${VERSION} en GitHub..."
if gh release view "v${VERSION}" >/dev/null 2>&1; then
  echo "Release v${VERSION} ya existe. Actualizando archivo APK..."
  gh release upload "v${VERSION}" "$APK" --clobber
else
  echo "Creando nuevo release v${VERSION} en GitHub..."
  gh release create "v${VERSION}" "$APK" \
    --title "FORTIXAM v${VERSION}" \
    --notes "Actualización global de FORTIXAM v${VERSION}."
fi

echo "¡Release v${VERSION} disponible públicamente en GitHub!"
