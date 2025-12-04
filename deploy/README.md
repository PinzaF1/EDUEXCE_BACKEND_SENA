# 🚀 Guía de Despliegue en AWS EC2 con HTTPS Gratuito

Esta guía te ayudará a desplegar tu backend de EduExce en AWS EC2 con certificado SSL gratuito de Let's Encrypt.

## 📋 Requisitos Previos

1. **Instancia EC2** configurada (Ubuntu 20.04 LTS o superior)
2. **Dominio** apuntando a tu IP de EC2
3. **Puertos abiertos** en Security Group:
   - Puerto 22 (SSH)
   - Puerto 80 (HTTP)
   - Puerto 443 (HTTPS)
4. **Acceso SSH** a tu instancia

## 🔧 Configuración de Security Group en AWS

En el Security Group de tu instancia EC2, asegúrate de tener estas reglas:

```
Type        Protocol    Port Range    Source
SSH         TCP         22           0.0.0.0/0 (o tu IP específica)
HTTP        TCP         80           0.0.0.0/0
HTTPS       TCP         443          0.0.0.0/0
Custom TCP  TCP         3333         127.0.0.1/32 (solo local)
```

## 🚀 Instalación Automática

### Paso 1: Conectarse a tu instancia EC2

```bash
ssh -i tu-clave.pem ubuntu@tu-ip-publica
```

### Paso 2: Descargar y ejecutar el script de instalación

```bash
# Descargar el script
wget https://raw.githubusercontent.com/TU_USUARIO/EDUEXCE_BACKEND_SENA/fix-deploy-EC2/deploy/ec2-deploy.sh

# Dar permisos de ejecución
chmod +x ec2-deploy.sh

# Ejecutar con tu dominio y email
./ec2-deploy.sh tu-dominio.com tu-email@example.com
```

### Paso 3: Subir tu código

```bash
# Opción 1: Clonar desde GitHub (recomendado)
cd /home/ubuntu
git clone -b fix-deploy-EC2 https://github.com/TU_USUARIO/EDUEXCE_BACKEND_SENA.git eduexce-backend

# Opción 2: Subir archivos con scp
scp -i tu-clave.pem -r ./tu-proyecto ubuntu@tu-ip:/home/ubuntu/eduexce-backend
```

### Paso 4: Configurar variables de entorno

```bash
cd /home/ubuntu/eduexce-backend
cp .env.production.example .env
nano .env  # Editar con tus valores reales
```

### Paso 5: Instalar y compilar

```bash
# Instalar dependencias
npm ci --production

# Compilar la aplicación
npm run build

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Seguir las instrucciones que aparezcan
```

## 🔄 Despliegue Automatizado

Una vez configurado, puedes usar el script de despliegue para actualizaciones:

```bash
cd /home/ubuntu/eduexce-backend
./deploy/deploy.sh
```

## 🔍 Verificación del Despliegue

### Verificar que la aplicación está corriendo:

```bash
pm2 status
pm2 logs eduexce-backend
```

### Verificar Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
```

### Verificar certificado SSL:

```bash
sudo certbot certificates
```

### Probar la aplicación:

```bash
curl -I https://tu-dominio.com/health
```

## 📊 Monitoreo y Logs

### Ver logs de la aplicación:

```bash
pm2 logs eduexce-backend --lines 50
```

### Ver logs de Nginx:

```bash
sudo tail -f /var/log/nginx/eduexce-backend_access.log
sudo tail -f /var/log/nginx/eduexce-backend_error.log
```

### Monitorear recursos:

```bash
pm2 monit
htop
```

## 🔧 Comandos Útiles de Mantenimiento

### Reiniciar servicios:

```bash
# Reiniciar aplicación
pm2 restart eduexce-backend

# Reiniciar Nginx
sudo systemctl restart nginx

# Recargar configuración de Nginx sin downtime
sudo nginx -s reload
```

### Renovar certificado SSL (automático, pero manual si es necesario):

```bash
sudo certbot renew --nginx --dry-run  # Probar
sudo certbot renew --nginx            # Renovar
```

### Backup de base de datos (si usas PostgreSQL):

```bash
pg_dump -h localhost -U usuario -d eduexce_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🛡️ Seguridad Adicional

### Configurar fail2ban (protección contra ataques de fuerza bruta):

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Actualizar sistema regularmente:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

## ❌ Solución de Problemas Comunes

### 1. Error 502 Bad Gateway

```bash
# Verificar que la app está corriendo
pm2 status
pm2 restart eduexce-backend

# Verificar puerto
sudo netstat -tulpn | grep :3333
```

### 2. Error de certificado SSL

```bash
# Verificar configuración
sudo certbot certificates

# Renovar si es necesario
sudo certbot renew --nginx
```

### 3. Problemas de permisos

```bash
# Ajustar propietario de archivos
sudo chown -R ubuntu:ubuntu /home/ubuntu/eduexce-backend
```

### 4. Out of Memory

```bash
# Agregar swap si no tienes
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 🔄 Configuración de Auto-Deploy con GitHub Actions (Opcional)

Crear `.github/workflows/deploy.yml` para despliegue automático:

```yaml
name: Deploy to EC2
on:
  push:
    branches: [fix-deploy-EC2]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        uses: appleboy/ssh-action@v0.1.2
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/eduexce-backend
            ./deploy/deploy.sh
```

## 📞 Soporte

Si encuentras problemas, verifica:

1. Logs de la aplicación: `pm2 logs`
2. Logs de Nginx: `/var/log/nginx/`
3. Estado de servicios: `systemctl status nginx`
4. Conectividad: `curl -I https://tu-dominio.com`

¡Tu aplicación debería estar funcionando en https://tu-dominio.com con certificado SSL gratuito! 🎉