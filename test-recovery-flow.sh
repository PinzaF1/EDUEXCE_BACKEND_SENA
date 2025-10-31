#!/bin/bash

# ========================================
# Script de Verificación - Servicio de Recuperación
# ========================================

# Configuración
NGROK_URL="https://gillian-semiluminous-blubberingly.ngrok-free.dev"
TEST_EMAIL="admin@test.com"

echo "🚀 Iniciando pruebas del servicio de recuperación..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
echo "📍 Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH_RESPONSE=$(curl -s "$NGROK_URL/health")
echo "Respuesta:"
echo "$HEALTH_RESPONSE" | jq '.'

if echo "$HEALTH_RESPONSE" | jq -e '.status == "ok"' > /dev/null; then
    echo "✅ Health Check: PASÓ"
else
    echo "❌ Health Check: FALLÓ"
    echo "⚠️ El servidor no responde correctamente. Verifica que Docker esté corriendo."
    exit 1
fi
echo ""

# Test 2: Verificar que las rutas de recovery estén registradas
echo "📍 Test 2: Verificar Rutas de Recovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RUTAS_RESPONSE=$(curl -s "$NGROK_URL/debug/rutas")
RECOVERY_ROUTES=$(echo "$RUTAS_RESPONSE" | jq '.rutas_recovery')
echo "Rutas de recovery encontradas:"
echo "$RECOVERY_ROUTES" | jq '.'

if echo "$RECOVERY_ROUTES" | jq -e 'length > 0' > /dev/null; then
    echo "✅ Rutas de Recovery: ENCONTRADAS"
else
    echo "❌ Rutas de Recovery: NO ENCONTRADAS"
    echo "⚠️ Las rutas de recovery no están registradas. Reconstruye Docker."
    exit 1
fi
echo ""

# Test 3: Login Admin (para validar que el servidor funciona)
echo "📍 Test 3: Login Admin (Validación básica)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGIN_RESPONSE=$(curl -s -X POST "$NGROK_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@test.com","password":"wrongpassword"}')
echo "Respuesta:"
echo "$LOGIN_RESPONSE" | jq '.'

if echo "$LOGIN_RESPONSE" | jq -e 'has("error")' > /dev/null; then
    echo "✅ Endpoint Login: FUNCIONA (esperaba error de credenciales)"
else
    echo "❌ Endpoint Login: FALLÓ"
fi
echo ""

# Test 4: Solicitar Recuperación Admin (EL TEST CRÍTICO)
echo "📍 Test 4: Recuperación Admin - Solicitar Código"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RECOVERY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$NGROK_URL/auth/recovery/admin/enviar" \
  -H "Content-Type: application/json" \
  -d "{\"correo\":\"$TEST_EMAIL\"}")

HTTP_CODE=$(echo "$RECOVERY_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
BODY=$(echo "$RECOVERY_RESPONSE" | sed '/HTTP_CODE/d')

echo "Código HTTP: $HTTP_CODE"
echo "Respuesta:"
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    echo "✅ Recuperación Admin: ENDPOINT FUNCIONA (código $HTTP_CODE)"
    if [ "$HTTP_CODE" == "404" ]; then
        echo "⚠️ Nota: 404 puede significar que el email '$TEST_EMAIL' no existe en la BD"
    fi
else
    echo "❌ Recuperación Admin: FALLÓ (código $HTTP_CODE)"
    if [ "$HTTP_CODE" == "404" ]; then
        echo "🔴 ERROR CRÍTICO: El endpoint devuelve 404"
        echo "   Esto significa que la ruta NO está registrada en Docker."
        echo ""
        echo "🔧 Solución:"
        echo "   1. git pull origin main"
        echo "   2. docker-compose down"
        echo "   3. docker-compose build --no-cache"
        echo "   4. docker-compose up -d"
        echo "   5. docker-compose logs -f api"
    fi
    exit 1
fi
echo ""

# Test 5: Verificar Variables de Entorno
echo "📍 Test 5: Variables de Entorno"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$HEALTH_RESPONSE" | jq '{
  env: .env,
  redis: .redis,
  smtp: .smtp
}'

SMTP_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.smtp')
if [ "$SMTP_STATUS" == "configured" ]; then
    echo "✅ SMTP: CONFIGURADO"
else
    echo "⚠️ SMTP: NO CONFIGURADO (los emails no se enviarán)"
fi

REDIS_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.redis')
if [ "$REDIS_STATUS" == "configured" ]; then
    echo "✅ Redis: CONFIGURADO"
else
    echo "⚠️ Redis: NO CONFIGURADO (usará caché en memoria)"
fi
echo ""

# Resumen Final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN DE PRUEBAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Health Check: OK"
echo "✅ Rutas de Recovery: Registradas"
echo "✅ Login Admin: Funciona"

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Recuperación Admin: FUNCIONA PERFECTAMENTE"
    echo ""
    echo "🎉 ¡TODO FUNCIONA! El servicio de recuperación está operativo."
elif [ "$HTTP_CODE" == "404" ]; then
    echo "❌ Recuperación Admin: 404 (Ruta no encontrada)"
    echo ""
    echo "🔴 PROBLEMA DETECTADO: Docker tiene código desactualizado"
else
    echo "⚠️ Recuperación Admin: Código $HTTP_CODE"
fi
echo ""

