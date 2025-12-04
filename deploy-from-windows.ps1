# Script de deploy manual para EC2 desde Windows
# Asegúrate de tener configurado SSH

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando deploy a EC2..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Variables
$EC2_HOST = "ec2-18-216-138-203.us-east-2.compute.amazonaws.com"
$EC2_USER = "ec2-user"
$APP_DIR = "/home/ec2-user/zavira-api"
$BRANCH = "fix-deploy-EC2"

try {
    Write-Host "📦 1. Actualizando código en EC2..." -ForegroundColor Yellow
    
    $sshCommand = "cd $APP_DIR && git fetch origin && git pull origin $BRANCH && echo 'Código actualizado'"
    ssh -o ConnectTimeout=10 "${EC2_USER}@${EC2_HOST}" "$sshCommand"
    
    Write-Host "🔄 2. Reconstruyendo contenedores..." -ForegroundColor Yellow
    
    $deployCommand = "cd $APP_DIR && docker-compose down && docker-compose build --no-cache && docker-compose up -d && echo 'Servicios reiniciados'"
    ssh -o ConnectTimeout=30 "${EC2_USER}@${EC2_HOST}" "$deployCommand"
    
    Write-Host "❤️ 3. Verificando health..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    $healthCommand = "curl -s http://localhost:3333/health || echo 'Health check failed'"
    ssh -o ConnectTimeout=10 "${EC2_USER}@${EC2_HOST}" "$healthCommand"
    
    Write-Host "✅ Deploy completado exitosamente!" -ForegroundColor Green
    Write-Host "🔗 URL: http://$EC2_HOST:3333" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error durante el deploy: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎯 Para verificar variables de IA en EC2, ejecuta:" -ForegroundColor Magenta
Write-Host "ssh $EC2_USER@$EC2_HOST 'cd $APP_DIR && ./verify-ai-system.sh'" -ForegroundColor White