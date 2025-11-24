# ====================================================
# Script para usar BASE DE DATOS SUPABASE (Producción)
# ====================================================
# Uso: .\usar-bd-supabase.ps1
# Descripción: Restaura la configuración de Supabase
# ====================================================

Write-Host "🔄 Cambiando a BASE DE DATOS SUPABASE..." -ForegroundColor Cyan

if (-Not (Test-Path ".env.supabase.backup")) {
    Write-Host "❌ ERROR: No existe backup de Supabase (.env.supabase.backup)" -ForegroundColor Red
    Write-Host "   No se puede restaurar la configuración de Supabase" -ForegroundColor Yellow
    exit 1
}

# Restaurar configuración de Supabase
Copy-Item ".env.supabase.backup" ".env" -Force

Write-Host ""
Write-Host "✅ Configuración restaurada a BASE DE DATOS SUPABASE" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuración actual:" -ForegroundColor Yellow
Write-Host "   DB_HOST: aws-1-us-east-2.pooler.supabase.com" -ForegroundColor White
Write-Host "   DB_PORT: 5432" -ForegroundColor White
Write-Host "   DB_USER: postgres.qjqhdfhiedsqrstymbio" -ForegroundColor White
Write-Host "   DB_DATABASE: postgres" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Ahora ejecuta: npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Para volver a local, ejecuta: .\usar-bd-local.ps1" -ForegroundColor Gray
