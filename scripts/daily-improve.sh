#!/usr/bin/env bash
#
# FORTIXAM — piloto de la mejora diaria automática.
#
# Lo llama el cron de Hermes (perfil default). El agente ya ha editado el
# código; este script se encarga de la parte mecánica y reproducible:
#
#   1. valida que el repo está en main y limpio (antes de tocar nada)
#   2. ejecuta la suite de tests (puerta de calidad)
#   3. compila el export estático del APK (puerta de calidad)
#   4. commitea el cambio del día
#   5. sube la versión con `npm run release` (patch) y commitea
#   6. push a main
#   7. crea el tag vX.Y.Z y lo empuja  ->  GitHub Actions compila y publica
#      el APK en GitHub Releases (canal OTA de la app)
#
# Uso:
#   scripts/daily-improve.sh "feat(ui): descripción corta" "cuerpo opcional"
#
# Salida: líneas "OK:" / "FAIL:" para que el agente las reporte tal cual.

set -uo pipefail

REPO="/Users/servimac/apps/Titanium/titanium-app"
cd "$REPO" || { echo "FAIL: no existe $REPO"; exit 1; }

MSG="${1:-}"
BODY="${2:-}"

if [ -z "$MSG" ]; then
  echo "FAIL: falta el mensaje de commit (arg 1)"
  exit 2
fi

log() { echo "$1"; }

# ---------------------------------------------------------------- 1. repo
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  log "FAIL: rama actual '$BRANCH' (se esperaba main)"
  exit 3
fi

git fetch origin -q || true

# main local no debe ir por delante de origin/main (evita publicar sobre una
# base divergente)
if ! git diff --quiet origin/main..HEAD; then
  log "FAIL: main local va por delante de origin/main; resuelve antes"
  exit 5
fi

# Nada de secretos ni binarios en el commit del día
FORBIDDEN=$(git status --porcelain | awk '{print $2}' | grep -E '(^|/)\.env|\.keystore$|\.jks$|key\.properties$|\.apk$' || true)
if [ -n "$FORBIDDEN" ]; then
  log "FAIL: hay rutas prohibidas en el cambio del día:"
  echo "$FORBIDDEN"
  exit 4
fi

# ---------------------------------------------------------------- 2. tests
log "== npm test =="
if ! npm test -- --run >/tmp/fortixam-daily-test.log 2>&1; then
  log "FAIL: tests en rojo (ver /tmp/fortixam-daily-test.log)"
  tail -25 /tmp/fortixam-daily-test.log
  exit 6
fi
log "OK: tests pasan ($(grep -oE 'Tests +[0-9]+ passed' /tmp/fortixam-daily-test.log | head -1))"

# ------------------------------------------------------- 3. build del APK
log "== BUILD_MODE=apk npm run build =="
if ! BUILD_MODE=apk npm run build >/tmp/fortixam-daily-build.log 2>&1; then
  log "FAIL: el build del APK falla (ver /tmp/fortixam-daily-build.log)"
  tail -25 /tmp/fortixam-daily-build.log
  exit 7
fi
log "OK: build estático del APK correcto"

# -------------------------------------------------- 4. commit del cambio
if git diff --quiet; then
  log "WARN: no hay cambios que commitear; nada que publicar"
  exit 0
fi

git add -A
if [ -n "$BODY" ]; then
  git commit -q -m "$MSG" -m "$BODY"
else
  git commit -q -m "$MSG"
fi
log "OK: commit $(git rev-parse --short HEAD) — $MSG"

# ------------------------------------------------- 5. subida de versión
node scripts/release.mjs patch >/tmp/fortixam-daily-release.log 2>&1
if [ $? -ne 0 ]; then
  log "FAIL: 'node scripts/release.mjs patch' falló (ver /tmp/fortixam-daily-release.log)"
  tail -20 /tmp/fortixam-daily-release.log
  exit 8
fi

VERSION=$(node -p "require('./version.json').version")
VERSION_CODE=$(node -p "require('./version.json').versionCode")

git add -A
git commit -q -m "chore(release): v${VERSION} — versionCode ${VERSION_CODE}"
log "OK: versión v${VERSION} (versionCode ${VERSION_CODE})"

# ------------------------------------------------------------- 6. push
if ! git push -q origin main; then
  log "FAIL: git push origin main rechazado"
  exit 9
fi
log "OK: main empujado"

# --------------------------------------- 7. tag -> CI -> release + APK
TAG="v${VERSION}"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  log "FAIL: el tag $TAG ya existe localmente"
  exit 10
fi

git tag -a "$TAG" -m "FORTIXAM ${TAG}"
if ! git push -q origin "$TAG"; then
  log "FAIL: no se pudo empujar el tag $TAG"
  exit 11
fi
log "OK: tag ${TAG} empujado — GitHub Actions compilará y publicará el APK"

log "DONE: ${VERSION}"
