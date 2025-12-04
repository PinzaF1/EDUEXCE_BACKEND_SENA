#!/bin/bash

# Script de despliegue para AWS EC2 con HTTPS gratuito usando Let's Encrypt
# Este script automatiza la configuración completa del servidor

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando despliegue en AWS EC2 con HTTPS gratuito${NC}"

# Variables de configuración (personalizar según tus necesidades)
DOMAIN_NAME=${1:-"tu-dominio.com"}  # Pasar como primer argumento
EMAIL=${2:-"tu-email@example.com"}  # Pasar como segundo argumento
APP_NAME="eduexce-backend"
APP_USER="ubuntu"
APP_DIR="/home/$APP_USER/$APP_NAME"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "Dominio: $DOMAIN_NAME"
echo "Email: $EMAIL"
echo "Directorio: $APP_DIR"

# 1. Actualizar el sistema
echo -e "${GREEN}📦 Actualizando el sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 20 LTS
echo -e "${GREEN}🟢 Instalando Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar PM2 globalmente
echo -e "${GREEN}⚙️ Instalando PM2...${NC}"
sudo npm install -g pm2

# 4. Instalar Nginx
echo -e "${GREEN}🌐 Instalando Nginx...${NC}"
sudo apt install -y nginx

# 5. Instalar Certbot para Let's Encrypt
echo -e "${GREEN}🔒 Instalando Certbot para SSL gratuito...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# 6. Configurar firewall
echo -e "${GREEN}🛡️ Configurando firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 7. Crear directorio de la aplicación si no existe
echo -e "${GREEN}📁 Preparando directorio de aplicación...${NC}"
mkdir -p $APP_DIR

# 8. Configurar Nginx (configuración temporal para obtener certificado)
echo -e "${GREEN}🔧 Configurando Nginx temporalmente...${NC}"
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOL
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}
EOL

# Habilitar el sitio
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 9. Obtener certificado SSL gratuito
echo -e "${GREEN}🔒 Obteniendo certificado SSL gratuito de Let's Encrypt...${NC}"
sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --email $EMAIL --agree-tos --non-interactive --redirect

# 10. Configurar Nginx para producción con SSL
echo -e "${GREEN}🔧 Configurando Nginx para producción con HTTPS...${NC}"
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOL
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    return 301 https://\$server_name\$request_uri;
}

# Configuración HTTPS principal
server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # Configuración SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    # Configuración SSL moderna y segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Configuración del proxy para AdonisJS
    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Servir archivos estáticos directamente (si los tienes)
    location /static/ {
        alias $APP_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOL

# Reiniciar Nginx
sudo nginx -t
sudo systemctl restart nginx

# 11. Configurar renovación automática del certificado
echo -e "${GREEN}🔄 Configurando renovación automática del certificado...${NC}"
echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx" | sudo crontab -

# 12. Crear archivo de configuración PM2
echo -e "${GREEN}⚙️ Creando configuración de PM2...${NC}"
tee $APP_DIR/ecosystem.config.js > /dev/null <<EOL
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'build/bin/server.js',
    cwd: '$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3333
    },
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
}
EOL

# 13. Crear directorio de logs
mkdir -p $APP_DIR/logs

echo -e "${GREEN}✅ Configuración del servidor completada!${NC}"
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo "1. Sube tu código a $APP_DIR"
echo "2. Copia tu archivo .env de producción"
echo "3. Ejecuta: cd $APP_DIR && npm ci --production"
echo "4. Ejecuta: npm run build"
echo "5. Inicia la aplicación: pm2 start ecosystem.config.js"
echo "6. Guarda la configuración PM2: pm2 save && pm2 startup"
echo ""
echo -e "${GREEN}🌟 Tu aplicación estará disponible en: https://$DOMAIN_NAME${NC}"