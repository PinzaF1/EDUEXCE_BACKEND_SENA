#!/bin/bash

# Script de despliegue automatizado para actualizar la aplicación
# Uso: ./deploy.sh

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_NAME="eduexce-backend"
APP_DIR="/home/ubuntu/$APP_NAME"
REPO_URL="https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA.git"
BRANCH="fix-deploy-EC2"

echo -e "${GREEN}🚀 Iniciando despliegue de $APP_NAME${NC}"

# Verificar si estamos en el directorio correcto
if [ ! -d "$APP_DIR" ]; then
    echo -e "${YELLOW}📁 Clonando repositorio...${NC}"
    cd /home/ubuntu
    git clone -b $BRANCH $REPO_URL $APP_NAME
    cd $APP_DIR
else
    echo -e "${YELLOW}📥 Actualizando código...${NC}"
    cd $APP_DIR
    
    # Hacer backup de .env si existe
    if [ -f ".env" ]; then
        cp .env .env.backup
        echo -e "${GREEN}✅ Backup de .env creado${NC}"
    fi
    
    # Actualizar código
    git fetch origin
    git reset --hard origin/$BRANCH
    
    # Restaurar .env si existe el backup
    if [ -f ".env.backup" ]; then
        cp .env.backup .env
        echo -e "${GREEN}✅ Archivo .env restaurado${NC}"
    fi
fi

# Instalar dependencias de producción
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm ci --production

# Compilar la aplicación
echo -e "${YELLOW}🔨 Compilando aplicación...${NC}"
npm run build

# Crear directorio de logs si no existe
mkdir -p logs

# Reiniciar aplicación con PM2
echo -e "${YELLOW}🔄 Reiniciando aplicación...${NC}"
if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart $APP_NAME
else
    pm2 start ecosystem.config.js
fi

# Guardar configuración PM2
pm2 save

# Verificar estado
echo -e "${YELLOW}📊 Verificando estado de la aplicación...${NC}"
pm2 status

# Verificar logs recientes
echo -e "${YELLOW}📋 Últimos logs:${NC}"
pm2 logs $APP_NAME --lines 10

echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
echo -e "${GREEN}🌐 La aplicación está ejecutándose en: https://$(hostname -f)${NC}"