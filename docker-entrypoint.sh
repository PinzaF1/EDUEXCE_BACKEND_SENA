#!/bin/sh
set -e

# Si ya existe el archivo de credenciales, no hacer nada
TARGET="/app/build/config/firebase-admin-sdk.json"

if [ -n "$FIREBASE_SERVICE_ACCOUNT" ] && [ ! -f "$TARGET" ]; then
  echo "🔧 Decodificando FIREBASE_SERVICE_ACCOUNT en $TARGET..."
  mkdir -p "$(dirname "$TARGET")"
  # Acepta tanto base64 en una sola linea como JSON sin codificar
  # Intentamos decodificar, si falla asumimos que la variable contiene JSON plano
  if echo "$FIREBASE_SERVICE_ACCOUNT" | base64 -d >/dev/null 2>&1; then
    echo "$FIREBASE_SERVICE_ACCOUNT" | base64 -d > "$TARGET"
  else
    echo "$FIREBASE_SERVICE_ACCOUNT" > "$TARGET"
  fi
  chmod 600 "$TARGET" || true
  echo "✅ Archivo de credenciales escrito"
elif [ -f "$TARGET" ]; then
  echo "ℹ️ Archivo de credenciales ya existe en $TARGET, no se sobrescribe"
else
  echo "⚠️ No se encontró FIREBASE_SERVICE_ACCOUNT y tampoco existe $TARGET"
fi

# Ejecutar el CMD original
exec "$@"
