# Firma del APK y actualizaciones OTA

> Verificado el 2026-09-22 sobre la release `v8.5.12`.

## Cómo se firma cada APK

| Origen | Clave usada | Consecuencia |
|---|---|---|
| **CI (GitHub Actions)** | El keystore del secreto `ANDROID_KEYSTORE_BASE64` | **Estable entre versiones** → las actualizaciones OTA instalan encima |
| Mac del desarrollador | `~/.android/debug.keystore`, o las variables `FORTIXAM_*` si están definidas | Firma **distinta** a la de CI |

El APK publicado en la release `v8.5.12` está firmado así:

```
Signer #1 certificate DN: C=US, O=Android, CN=Android Debug
Signer #1 certificate SHA-256: 63ab94e2f57dd0c82dececcfb0dcfcde1638705d3ec2c9bf09376f10cbcc1aee
```

Ese certificado sale del secreto `ANDROID_KEYSTORE_BASE64`, que **ya está configurado** en el repositorio. Al ser siempre el mismo, cada versión que publica la CI se instala encima de la anterior sin desinstalar nada — que es lo que necesita el canal OTA.

## Lo que no hay que romper

- **No borres el secreto `ANDROID_KEYSTORE_BASE64`.** Si desaparece, el workflow genera un keystore temporal nuevo en cada ejecución, y entonces **cada APK tendría una firma distinta**: los usuarios no podrían instalar la actualización (Android rechaza cambiar de firma) y habría que desinstalar la app, perdiendo los datos locales que no hayan sincronizado.
- Si algún día rotas la clave del secreto, ocurre lo mismo que al borrarlo: los APK posteriores no instalarán sobre los anteriores.

## APK compilado a mano vs APK de la OTA

Un APK compilado en el Mac (con `npm run build:apk`, que cae en el keystore de depuración local) tiene una firma **diferente** a la del que publica la CI. Android no permite instalar una app con otra firma encima de la instalada: dará "Aplicación no instalada".

Por eso:

- Para uso diario, instala **el APK de la release** (el que baja la propia app).
- Si compilas a mano para probar, hazlo en un dispositivo con la app desinstalada, o define las variables `FORTIXAM_STORE_FILE`, `FORTIXAM_STORE_PASSWORD`, `FORTIXAM_KEY_ALIAS` y `FORTIXAM_KEY_PASSWORD` apuntando al **mismo** keystore que usa la CI, y así ambas rutas firman igual.

## Comprobarlo en cualquier momento

```bash
# Descargar el APK publicado y ver su firma
curl -sL https://github.com/servixam-max/titanium-app/releases/latest/download/FORTIXAM-$(node -p "require('./package.json').version").apk -o /tmp/ota.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs /tmp/ota.apk
```

Si el `SHA-256` coincide con el de esta página, la cadena de actualizaciones sigue intacta.
