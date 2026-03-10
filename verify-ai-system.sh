#!/bin/bash
# Script para verificar el estado completo del sistema de IA en EC2
# Para usar: ./verify-ai-system.sh

echo "🔧 VERIFICACIÓN COMPLETA DEL SISTEMA DE IA - EC2"
echo "=================================================="

echo ""
echo "📋 1. Verificando variables de entorno en contenedor..."
echo "----------------------------------------"
docker-compose exec zavira-api sh -c 'echo "USE_OPENAI_DIRECT: $USE_OPENAI_DIRECT"'
docker-compose exec zavira-api sh -c 'echo "OPENAI_MODEL: $OPENAI_MODEL"'
docker-compose exec zavira-api sh -c 'echo "OPENAI_TIMEOUT_MS: $OPENAI_TIMEOUT_MS"'
docker-compose exec zavira-api sh -c 'if [ -n "$OPENAI_API_KEY" ]; then echo "OPENAI_API_KEY: SET ✅ (length: ${#OPENAI_API_KEY})"; else echo "OPENAI_API_KEY: NOT SET ❌"; fi'

echo ""
echo "🚀 2. Verificando servicios activos..."
echo "----------------------------------------"
docker-compose ps

echo ""
echo "❤️ 3. Verificando health del API..."
echo "----------------------------------------"
curl -s http://localhost:3333/health | jq '.' 2>/dev/null || echo "Health endpoint no disponible"

echo ""
echo "🤖 4. Probando endpoint de generación de preguntas..."
echo "----------------------------------------"
echo "Creando JWT para prueba..."

# Generar JWT de prueba (necesitarías adaptar esto según tu lógica)
# Por ahora solo mostramos el comando curl que se usaría
echo "Comando de prueba (requiere JWT válido):"
echo 'curl -X POST http://localhost:3333/sesion/parada \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_JWT_TOKEN" \'
echo '  -d "{"'
echo '    "area": "Matemáticas",'
echo '    "subtema": "Álgebra básica",'
echo '    "nivel": 1'
echo '  }"'

echo ""
echo "📊 5. Verificando logs recientes..."
echo "----------------------------------------"
docker-compose logs --tail=20 zavira-api | grep -E "(IA|OpenAI|SDK|Error)" || echo "No hay logs de IA recientes"

echo ""
echo "✅ Verificación completada!"
echo "=============================================="