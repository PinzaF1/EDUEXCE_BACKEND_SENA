#!/bin/bash

# Script mejorado de instalación para EC2
# Fecha: $(date)

# Configurar logging
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "=== INICIANDO INSTALACIÓN DEL SERVIDOR ==="
echo "Timestamp: $(date)"

# Actualizar sistema
echo "1. Actualizando sistema..."
apt-get update -y
apt-get upgrade -y

# Instalar dependencias básicas
echo "2. Instalando dependencias básicas..."
apt-get install -y curl wget git unzip software-properties-common

# Instalar Node.js 20 LTS
echo "3. Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Verificar instalación de Node.js
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Instalar PM2 globalmente
echo "4. Instalando PM2..."
npm install -g pm2

# Instalar Nginx
echo "5. Instalando Nginx..."
apt-get install -y nginx

# Configurar firewall básico
echo "6. Configurando firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw allow 3333
echo "y" | ufw enable

# Clonar repositorio
echo "7. Clonando repositorio..."
cd /home/ubuntu
git clone -b fix-deploy-EC2 https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA.git
chown -R ubuntu:ubuntu /home/ubuntu/EDUEXCE_BACKEND_SENA

# Configurar aplicación como usuario ubuntu
echo "8. Configurando aplicación..."
cd /home/ubuntu/EDUEXCE_BACKEND_SENA

# Crear archivo de entorno
cat > .env << EOF
TZ=America/Bogota
PORT=3333
HOST=127.0.0.1
NODE_ENV=production
APP_KEY=YOUR_APP_KEY_HERE
LOG_LEVEL=info

DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.jmeuhxhpaejceztalzqz
DB_PASSWORD=DennysMedal2024
DB_DATABASE=postgres

SUPABASE_URL=https://jmeuhxhpaejceztalzqz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqbWV1aHhocGFlGNlemtB3G1hbHpxeiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMyOTE4MzQ4LCJleHAiOjIwNDg0OTQzNDh9.bNChv-TPOhI44Rtz4AMtfJJqotNkDpqGM72xsKP6OVA

FIREBASE_PROJECT_ID=eduexce-backend-sena
FIREBASE_PRIVATE_KEY_ID=private_key_id
FIREBASE_PRIVATE_KEY=private_key
FIREBASE_CLIENT_EMAIL=client_email
FIREBASE_CLIENT_ID=client_id
FIREBASE_CLIENT_CERT_URL=client_cert_url

OPENAI_API_KEY=sk-openai-key-here
EOF

chown ubuntu:ubuntu .env

# Instalar dependencias como usuario ubuntu
echo "9. Instalando dependencias de Node.js..."
sudo -u ubuntu npm install

# Compilar aplicación
echo "10. Compilando aplicación..."
sudo -u ubuntu npm run build

# Configurar Nginx
echo "11. Configurando Nginx..."
cat > /etc/nginx/sites-available/default << 'NGINX_CONFIG'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    # Logs específicos para debugging
    access_log /var/log/nginx/eduexce_access.log;
    error_log /var/log/nginx/eduexce_error.log;
    
    # Configuración de proxy
    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3333/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
NGINX_CONFIG

# Probar configuración de Nginx
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx

# Configurar PM2
echo "12. Configurando PM2..."
cd /home/ubuntu/EDUEXCE_BACKEND_SENA

# Crear configuración de PM2
cat > ecosystem.config.mjs << 'PM2_CONFIG'
export default {
  apps: [{
    name: 'eduexce-backend',
    script: './build/bin/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3333,
      HOST: '127.0.0.1'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '300M',
    node_args: '--max-old-space-size=256'
  }]
};
PM2_CONFIG

chown ubuntu:ubuntu ecosystem.config.mjs

# Crear directorio de logs
sudo -u ubuntu mkdir -p logs

# Iniciar aplicación con PM2
echo "13. Iniciando aplicación con PM2..."
sudo -u ubuntu pm2 start ecosystem.config.mjs
sudo -u ubuntu pm2 save
sudo -u ubuntu pm2 startup

# Verificar servicios
echo "14. Verificando servicios..."
systemctl status nginx --no-pager
sudo -u ubuntu pm2 status

echo "15. Estados de puertos:"
netstat -tlnp | grep -E ":80|:3333"

echo "=== INSTALACIÓN COMPLETADA ==="
echo "Timestamp: $(date)"
echo "La aplicación debería estar disponible en: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "Logs disponibles en: /var/log/user-data.log"