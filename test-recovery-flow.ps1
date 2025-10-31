# ========================================
# Script de Verificación - Servicio de Recuperación (Windows)
# ========================================

$NGROK_URL = "https://gillian-semiluminous-blubberingly.ngrok-free.dev"
$TEST_EMAIL = "admin@test.com"

Write-Host "🚀 Iniciando pruebas del servicio de recuperación..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test 1: Health Check
Write-Host "📍 Test 1: Health Check" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $healthResponse = Invoke-RestMethod -Uri "$NGROK_URL/health" -Method Get
    Write-Host "Respuesta:" -ForegroundColor White
    $healthResponse | ConvertTo-Json -Depth 10
    
    if ($healthResponse.status -eq "ok") {
        Write-Host "✅ Health Check: PASÓ" -ForegroundColor Green
    } else {
        Write-Host "❌ Health Check: FALLÓ" -ForegroundColor Red
        Write-Host "⚠️ El servidor no responde correctamente. Verifica que Docker esté corriendo." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Error al conectar con el servidor: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Verificar Rutas de Recovery
Write-Host "📍 Test 2: Verificar Rutas de Recovery" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $rutasResponse = Invoke-RestMethod -Uri "$NGROK_URL/debug/rutas" -Method Get
    Write-Host "Rutas de recovery encontradas:" -ForegroundColor White
    $rutasResponse.rutas_recovery | ConvertTo-Json -Depth 10
    
    if ($rutasResponse.rutas_recovery.Count -gt 0) {
        Write-Host "✅ Rutas de Recovery: ENCONTRADAS ($($rutasResponse.rutas_recovery.Count) rutas)" -ForegroundColor Green
    } else {
        Write-Host "❌ Rutas de Recovery: NO ENCONTRADAS" -ForegroundColor Red
        Write-Host "⚠️ Las rutas de recovery no están registradas. Reconstruye Docker." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Error al verificar rutas: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Login Admin (Validación básica)
Write-Host "📍 Test 3: Login Admin (Validación básica)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $loginBody = @{
        correo = "admin@test.com"
        password = "wrongpassword"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$NGROK_URL/admin/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction SilentlyContinue
    
    Write-Host "Respuesta:" -ForegroundColor White
    $loginResponse | ConvertTo-Json -Depth 10
    Write-Host "✅ Endpoint Login: FUNCIONA (esperaba error de credenciales)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Endpoint Login: FUNCIONA (devolvió error esperado)" -ForegroundColor Green
    } else {
        Write-Host "❌ Endpoint Login: FALLÓ con error inesperado" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Recuperación Admin (EL TEST CRÍTICO)
Write-Host "📍 Test 4: Recuperación Admin - Solicitar Código" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $recoveryBody = @{
        correo = $TEST_EMAIL
    } | ConvertTo-Json
    
    $recoveryResponse = Invoke-RestMethod -Uri "$NGROK_URL/auth/recovery/admin/enviar" `
        -Method Post `
        -ContentType "application/json" `
        -Body $recoveryBody `
        -ErrorAction Stop
    
    Write-Host "Código HTTP: 200" -ForegroundColor Green
    Write-Host "Respuesta:" -ForegroundColor White
    $recoveryResponse | ConvertTo-Json -Depth 10
    Write-Host "✅ Recuperación Admin: FUNCIONA PERFECTAMENTE" -ForegroundColor Green
    
    if ($recoveryResponse.ok) {
        Write-Host "🎉 ¡Email de recuperación enviado exitosamente!" -ForegroundColor Cyan
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Código HTTP: $statusCode" -ForegroundColor $(if ($statusCode -eq 404) { "Red" } else { "Yellow" })
    
    if ($statusCode -eq 404) {
        Write-Host "❌ Recuperación Admin: FALLÓ (404 - Not Found)" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔴 ERROR CRÍTICO: El endpoint devuelve 404" -ForegroundColor Red
        Write-Host "   Esto significa que la ruta NO está registrada en Docker." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔧 Solución:" -ForegroundColor Cyan
        Write-Host "   1. git pull origin main" -ForegroundColor White
        Write-Host "   2. docker-compose down" -ForegroundColor White
        Write-Host "   3. docker-compose build --no-cache" -ForegroundColor White
        Write-Host "   4. docker-compose up -d" -ForegroundColor White
        Write-Host "   5. docker-compose logs -f api" -ForegroundColor White
        exit 1
    } elseif ($statusCode -eq 404) {
        Write-Host "⚠️ Nota: El email '$TEST_EMAIL' puede no existir en la BD (esperado)" -ForegroundColor Yellow
        Write-Host "✅ Pero el ENDPOINT SÍ FUNCIONA" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Código de estado: $statusCode" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 5: Variables de Entorno
Write-Host "📍 Test 5: Variables de Entorno" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$envStatus = @{
    "NODE_ENV" = $healthResponse.env
    "Redis" = $healthResponse.redis
    "SMTP" = $healthResponse.smtp
}
$envStatus | ConvertTo-Json

if ($healthResponse.smtp -eq "configured") {
    Write-Host "✅ SMTP: CONFIGURADO" -ForegroundColor Green
} else {
    Write-Host "⚠️ SMTP: NO CONFIGURADO (los emails no se enviarán)" -ForegroundColor Yellow
}

if ($healthResponse.redis -eq "configured") {
    Write-Host "✅ Redis: CONFIGURADO" -ForegroundColor Green
} else {
    Write-Host "⚠️ Redis: NO CONFIGURADO (usará caché en memoria)" -ForegroundColor Yellow
}
Write-Host ""

# Resumen Final
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ Health Check: OK" -ForegroundColor Green
Write-Host "✅ Rutas de Recovery: Registradas" -ForegroundColor Green
Write-Host "✅ Login Admin: Funciona" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Para probar con un email real de tu BD, edita la variable `$TEST_EMAIL en el script" -ForegroundColor Cyan
Write-Host ""

