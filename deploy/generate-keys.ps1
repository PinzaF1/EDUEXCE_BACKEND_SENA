# Script para generar claves de seguridad para produccion en Windows
# Ejecutar con PowerShell: .\generate-keys.ps1

Write-Host "Generando claves de seguridad para produccion..." -ForegroundColor Green

# Funcion para generar string aleatorio
function New-RandomString {
    param(
        [int]$Length = 32,
        [string]$Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    )
    
    $random = New-Object System.Random
    $result = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $result += $Characters[$random.Next(0, $Characters.Length)]
    }
    return $result
}

# Funcion para generar string hexadecimal
function New-HexString {
    param([int]$Length = 64)
    
    $hex = '0123456789abcdef'
    $random = New-Object System.Random
    $result = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $result += $hex[$random.Next(0, $hex.Length)]
    }
    return $result
}

# Generar claves
$APP_KEY = New-RandomString -Length 32
$JWT_SECRET = New-HexString -Length 64
$DB_PASSWORD = New-RandomString -Length 24

Write-Host "APP_KEY generado: $APP_KEY" -ForegroundColor Yellow
Write-Host "JWT_SECRET generado: $JWT_SECRET" -ForegroundColor Yellow
Write-Host "Sugerencia de DB_PASSWORD: $DB_PASSWORD" -ForegroundColor Yellow

Write-Host ""
Write-Host "Copia estas claves a tu archivo .env de produccion:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor White
Write-Host "APP_KEY=$APP_KEY" -ForegroundColor White
Write-Host "JWT_SECRET=$JWT_SECRET" -ForegroundColor White
Write-Host "DB_PASSWORD=$DB_PASSWORD" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Guarda estas claves de forma segura y no las compartas." -ForegroundColor Red
Write-Host "Una vez en produccion, NO cambies APP_KEY ya que se usa para cifrado." -ForegroundColor Red

# Guardar en archivo temporal para facil copia
$keysContent = @"
# Claves generadas para produccion - $(Get-Date)
APP_KEY=$APP_KEY
JWT_SECRET=$JWT_SECRET
DB_PASSWORD=$DB_PASSWORD
"@

$keysContent | Out-File -FilePath "production-keys.txt" -Encoding UTF8
Write-Host ""
Write-Host "Claves guardadas en 'production-keys.txt' para referencia." -ForegroundColor Green