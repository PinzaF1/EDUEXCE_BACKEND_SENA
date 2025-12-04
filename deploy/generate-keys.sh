#!/bin/bash

# Script para generar claves de seguridad para producción
# Ejecutar este script antes del primer despliegue

set -e

echo "🔐 Generando claves de seguridad para producción..."

# Generar APP_KEY de 32 caracteres
APP_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "APP_KEY generado: $APP_KEY"

# Generar JWT_SECRET de 64 caracteres
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET generado: $JWT_SECRET"

# Generar una contraseña segura para la base de datos
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/")
echo "Sugerencia de DB_PASSWORD: $DB_PASSWORD"

echo ""
echo "📋 Copia estas claves a tu archivo .env de producción:"
echo "=========================================="
echo "APP_KEY=$APP_KEY"
echo "JWT_SECRET=$JWT_SECRET"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANTE: Guarda estas claves de forma segura y no las compartas."
echo "   Una vez en producción, NO cambies APP_KEY ya que se usa para cifrado."