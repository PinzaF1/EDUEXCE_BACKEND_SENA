#!/bin/bash

echo "=== DIAGNÓSTICO DEL SERVIDOR EC2 ==="
echo "Fecha: $(date)"
echo

echo "1. Estado del sistema:"
uptime
echo

echo "2. Uso de memoria:"
free -h
echo

echo "3. Uso de disco:"
df -h
echo

echo "4. Procesos Node.js/PM2:"
ps aux | grep -E "(node|pm2)" | grep -v grep
echo

echo "5. Estado de PM2:"
pm2 status 2>/dev/null || echo "PM2 no encontrado"
echo

echo "6. Estado de Nginx:"
systemctl status nginx --no-pager
echo

echo "7. Puertos abiertos:"
netstat -tlnp | grep -E ":80|:443|:3333|:22"
echo

echo "8. Logs recientes de PM2:"
pm2 logs --lines 10 2>/dev/null || echo "No hay logs de PM2"
echo

echo "9. Logs de Nginx:"
tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No hay logs de Nginx"
echo

echo "10. Configuración de Nginx:"
cat /etc/nginx/sites-available/default 2>/dev/null || echo "No hay configuración de Nginx"
echo

echo "11. Variables de entorno de la aplicación:"
cat /home/ubuntu/EDUEXCE_BACKEND_SENA/.env 2>/dev/null | head -5 || echo "No se encontró archivo .env"
echo

echo "=== FIN DEL DIAGNÓSTICO ==="