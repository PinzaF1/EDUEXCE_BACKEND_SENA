param(
    param(
        [string]$Authtoken = "",
        [int]$Port = 3333,
        [switch]$NoStart
    )

    $ErrorActionPreference = 'Stop'

    param(
        [string]$Authtoken = "",
        [int]$Port = 3333,
        [switch]$NoStart
    )

    $ErrorActionPreference = 'Stop'

    function Get-ToolsDir {
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
        $toolsRelative = Join-Path $scriptDir "..\.tools"
        try {
            $fullPath = [System.IO.Path]::GetFullPath($toolsRelative)
        } catch {
            $fullPath = $toolsRelative
        }
        return $fullPath
    }

    $ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
    if ($ngrokCmd) {
        $ngrokPath = $ngrokCmd.Path
        Write-Host "Usando ngrok del PATH: $ngrokPath"
    } else {
        $toolsDir = Get-ToolsDir
        if (-not (Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir | Out-Null }
        $ngrokPath = Join-Path $toolsDir 'ngrok.exe'
        if (-not (Test-Path $ngrokPath)) {
            Write-Host 'ngrok no encontrado. Descargando ngrok...' -ForegroundColor Yellow
            $zipUrl = 'https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip'
            $tmpZip = Join-Path $env:TEMP 'ngrok.zip'
            Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::ExtractToDirectory($tmpZip, $toolsDir)
            Remove-Item $tmpZip -Force
            if (-not (Test-Path $ngrokPath)) {
                $found = Get-ChildItem -Path $toolsDir -Filter 'ngrok.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) { Move-Item -Path $found.FullName -Destination $ngrokPath -Force }
            }
            Write-Host "ngrok instalado en: $ngrokPath"
        } else {
            Write-Host "ngrok ya existe en: $ngrokPath"
        }
    }

    if ($Authtoken -ne '') {
        Write-Host 'Registrando authtoken (si ya existe no hay problema)...'
        & $ngrokPath config add-authtoken $Authtoken
    }

    if ($NoStart) {
        Write-Host 'Instalación/configuración completada. No se iniciará el túnel por petición.'
        exit 0
    }

    Write-Host "Iniciando túnel ngrok en el puerto $Port... (Ctrl+C para detener)" -ForegroundColor Green
    & $ngrokPath http $Port