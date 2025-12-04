#!/bin/bash

# Script de backup automático para la base de datos
# Se puede ejecutar manualmente o programar con cron

set -e

# Configuración
BACKUP_DIR="/home/ubuntu/backups"
APP_NAME="eduexce-backend"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7  # Mantener backups por 7 días

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🗄️ Iniciando backup de base de datos...${NC}"

# Crear directorio de backup si no existe
mkdir -p $BACKUP_DIR

# Leer configuración de base de datos del .env
if [ -f "/home/ubuntu/$APP_NAME/.env" ]; then
    source /home/ubuntu/$APP_NAME/.env
else
    echo -e "${RED}❌ No se encuentra el archivo .env${NC}"
    exit 1
fi

# Verificar que las variables necesarias estén definidas
if [ -z "$DB_HOST" ] || [ -z "$DB_DATABASE" ] || [ -z "$DB_USER" ]; then
    echo -e "${RED}❌ Faltan variables de base de datos en .env${NC}"
    exit 1
fi

# Definir nombre del archivo de backup
BACKUP_FILE="$BACKUP_DIR/${APP_NAME}_backup_${DATE}.sql"

echo -e "${YELLOW}📋 Configuración del backup:${NC}"
echo "Host: $DB_HOST"
echo "Base de datos: $DB_DATABASE"
echo "Usuario: $DB_USER"
echo "Archivo: $BACKUP_FILE"

# Realizar backup según el tipo de base de datos
if command -v pg_dump >/dev/null 2>&1; then
    echo -e "${YELLOW}🐘 Realizando backup de PostgreSQL...${NC}"
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p ${DB_PORT:-5432} \
        -U $DB_USER \
        -d $DB_DATABASE \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        > $BACKUP_FILE
        
elif command -v mysqldump >/dev/null 2>&1; then
    echo -e "${YELLOW}🐬 Realizando backup de MySQL...${NC}"
    mysqldump \
        -h $DB_HOST \
        -P ${DB_PORT:-3306} \
        -u $DB_USER \
        -p$DB_PASSWORD \
        --single-transaction \
        --routines \
        --triggers \
        $DB_DATABASE > $BACKUP_FILE
        
else
    echo -e "${RED}❌ No se encontró pg_dump ni mysqldump${NC}"
    exit 1
fi

# Comprimir backup
echo -e "${YELLOW}🗜️ Comprimiendo backup...${NC}"
gzip $BACKUP_FILE
BACKUP_FILE="$BACKUP_FILE.gz"

# Verificar que el backup se creó correctamente
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup completado exitosamente${NC}"
    echo -e "${GREEN}📁 Archivo: $BACKUP_FILE${NC}"
    echo -e "${GREEN}📊 Tamaño: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Error: El archivo de backup no se creó${NC}"
    exit 1
fi

# Limpiar backups antiguos
echo -e "${YELLOW}🧹 Limpiando backups antiguos (más de $RETENTION_DAYS días)...${NC}"
find $BACKUP_DIR -name "${APP_NAME}_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Mostrar backups disponibles
echo -e "${YELLOW}📋 Backups disponibles:${NC}"
ls -lh $BACKUP_DIR/${APP_NAME}_backup_*.sql.gz 2>/dev/null || echo "No hay backups anteriores"

echo -e "${GREEN}🎉 Proceso de backup completado${NC}"

# Enviar notificación (opcional)
if command -v curl >/dev/null 2>&1 && [ ! -z "$WEBHOOK_URL" ]; then
    curl -X POST $WEBHOOK_URL \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Backup de $APP_NAME completado exitosamente - $BACKUP_SIZE\"}" \
        >/dev/null 2>&1 || true
fi