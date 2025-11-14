# ====================================================
# Script para usar BASE DE DATOS LOCAL (PostgreSQL)
# ====================================================
# Uso: .\usar-bd-local.ps1
# Descripción: Copia .env.local a .env para usar PostgreSQL local
# ====================================================

Write-Host "🔄 Cambiando a BASE DE DATOS LOCAL..." -ForegroundColor Cyan

if (-Not (Test-Path ".env.local")) {
    Write-Host "❌ ERROR: No existe el archivo .env.local" -ForegroundColor Red
    Write-Host "   Crea primero el archivo .env.local con la configuración local" -ForegroundColor Yellow
    exit 1
}

# Hacer backup del .env actual (Supabase)
if (Test-Path ".env") {
    Copy-Item ".env" ".env.supabase.backup" -Force
    Write-Host "✅ Backup de .env (Supabase) guardado en .env.supabase.backup" -ForegroundColor Green
}

# Copiar configuración local
Copy-Item ".env.local" ".env" -Force

Write-Host ""
Write-Host "✅ Configuración cambiada exitosamente a BASE DE DATOS LOCAL" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuración actual:" -ForegroundColor Yellow
Write-Host "   DB_HOST: localhost" -ForegroundColor White
Write-Host "   DB_PORT: 5432" -ForegroundColor White
Write-Host "   DB_USER: postgres" -ForegroundColor White
Write-Host "   DB_DATABASE: eduexce_local" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Ahora ejecuta: npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Para volver a Supabase, ejecuta: .\usar-bd-supabase.ps1" -ForegroundColor Gray
