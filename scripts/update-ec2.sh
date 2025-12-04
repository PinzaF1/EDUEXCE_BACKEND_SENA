#!/bin/bash
echo "=== ACTUALIZANDO BACKEND EN EC2 ==="

echo "1. Moviendo archivo conflictivo..."
mv scripts/deploy_ec2.sh scripts/deploy_ec2.sh.bkp 2>/dev/null || true

echo "2. Haciendo git pull..."
git pull origin fix-deploy-EC2

echo "3. Verificando cambios en auth_service.ts..."
grep -n "id_usuario.*id_institucion" app/services/auth_service.ts || echo "❌ FALTA: Cambio en auth_service.ts"

echo "4. Verificando cambios en admin_controller.ts..."
grep -n "procediendo con idAdmin=null" app/controller/admin_controller.ts || echo "❌ FALTA: Cambio en admin_controller.ts"

echo "5. Reconstruyendo imagen Docker..."
docker compose build --no-cache api

echo "6. Reiniciando servicio API..."
docker compose up -d api

echo "7. Esperando que el servicio inicie..."
sleep 5

echo "8. Verificando estado de contenedores..."
docker compose ps

echo "9. Mostrando logs recientes..."
docker compose logs --tail=20 api

echo ""
echo "=== PRUEBA RÁPIDA ==="
echo "Ejecuta esto en otra terminal:"
echo "curl -v -X DELETE http://localhost:3333/admin/notificaciones/11541 -H 'Authorization: Bearer TU_TOKEN'"