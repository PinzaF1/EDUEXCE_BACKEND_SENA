#!/usr/bin/env bash
set -euo pipefail

# deploy_ec2.sh
# Uso: ./scripts/deploy_ec2.sh [branch] [service_api]
# Ejemplo: ./scripts/deploy_ec2.sh fix-deploy-EC2 zavira-api

BRANCH=${1:-fix-deploy-EC2}
SERVICE_API=${2:-zavira-api}

echo "Despliegue automático: branch=$BRANCH, service_api=$SERVICE_API"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker no está instalado o no está en PATH" >&2
  exit 1
fi
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker-compose no está instalado o no está en PATH" >&2
  exit 1
fi

echo 'Haciendo fetch y cambiando branch...'
git fetch --all --prune
git checkout "$BRANCH" || git checkout -b "$BRANCH" "origin/$BRANCH"
git pull origin "$BRANCH"

echo 'Parando contenedores existentes (si hay)...'
docker-compose down --remove-orphans || true

echo 'Reconstruyendo imágenes y levantando servicios...'
docker-compose build --no-cache --pull
docker-compose up -d --remove-orphans

echo 'Esperando 5s para que los servicios inicien...'
sleep 5

echo 'Mostrando estado de contenedores relevantes'
docker-compose ps

echo 'Si necesitas ver logs en tiempo real ejecuta:'
echo "  docker-compose logs -f $SERVICE_API"

echo 'Intentando ejecutar migraciones (si aplica) dentro del contenedor API...'
if docker-compose ps | grep -q "$SERVICE_API"; then
  echo "Ejecutando migraciones en $SERVICE_API (si el contenedor lo soporta)..."
  docker-compose exec -T "$SERVICE_API" node ace migration:run || echo 'No se pudieron ejecutar migraciones automáticamente.'
else
  echo "Contenedor $SERVICE_API no encontrado; omitiendo migraciones automáticas."
fi

echo 'Comprobación rápida del endpoint /health (local dentro del host):'
if curl -sS --max-time 5 http://localhost:3333/health >/dev/null 2>&1; then
  echo 'OK: /health responde en http://localhost:3333/health'
else
  echo 'Atención: /health no responde en http://localhost:3333/health — revisa logs con:'
  echo "  docker-compose logs -f $SERVICE_API"
fi

echo 'Despliegue completado.'
