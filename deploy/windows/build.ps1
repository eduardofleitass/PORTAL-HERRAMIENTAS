# ============================================================
# Portal de Herramientas - Compilar para produccion (Windows)
# ============================================================
# Compila el backend y el frontend dejandolos listos para servir.
#
# Uso (PowerShell, desde la raiz del proyecto):
#     .\deploy\windows\build.ps1
#
# Si PowerShell bloquea la ejecucion de scripts:
#     powershell -ExecutionPolicy Bypass -File .\deploy\windows\build.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

# Ir a la raiz del proyecto (dos niveles arriba de este script)
$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Raiz

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Portal de Herramientas - Build de produccion" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Raiz: $Raiz"
Write-Host ""

# ---------- Verificar Node ----------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js no esta instalado o no esta en el PATH." -ForegroundColor Red
    Write-Host "Descargalo de https://nodejs.org (version 20 o superior)."
    exit 1
}
$version = (node --version).TrimStart('v')
Write-Host "Node.js: v$version" -ForegroundColor Green
if ([int]($version.Split('.')[0]) -lt 20) {
    Write-Host "ADVERTENCIA: se recomienda Node 20 o superior." -ForegroundColor Yellow
}

# ---------- Backend ----------
Write-Host ""
Write-Host "[1/3] Instalando dependencias del backend..." -ForegroundColor Cyan
Set-Location (Join-Path $Raiz 'backend')
npm ci
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: fallo npm ci del backend" -ForegroundColor Red; exit 1 }

Write-Host "[2/3] Compilando el backend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: fallo la compilacion del backend" -ForegroundColor Red; exit 1 }

if (-not (Test-Path (Join-Path $Raiz 'backend\dist\main.js'))) {
    Write-Host "ERROR: no se genero backend\dist\main.js" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: backend\dist\main.js" -ForegroundColor Green

# ---------- Frontend ----------
Write-Host ""
Write-Host "[3/3] Compilando el frontend..." -ForegroundColor Cyan
Set-Location (Join-Path $Raiz 'frontend')
npm ci
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: fallo npm ci del frontend" -ForegroundColor Red; exit 1 }

npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: fallo la compilacion del frontend" -ForegroundColor Red; exit 1 }

if (-not (Test-Path (Join-Path $Raiz 'frontend\dist\index.html'))) {
    Write-Host "ERROR: no se genero frontend\dist\index.html" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: frontend\dist\index.html" -ForegroundColor Green

# ---------- Configuracion de produccion ----------
Set-Location $Raiz
$envBackend = Join-Path $Raiz 'backend\.env'
$envEjemplo = Join-Path $Raiz 'backend\.env.example'

if (-not (Test-Path $envBackend)) {
    Write-Host ""
    Write-Host "Creando backend\.env desde la plantilla..." -ForegroundColor Cyan
    Copy-Item $envEjemplo $envBackend

    # Generar un JWT_SECRET fuerte automaticamente
    $secreto = node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
    $contenido = Get-Content $envBackend -Raw
    $contenido = $contenido -replace '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$secreto"
    $contenido = $contenido -replace '(?m)^NODE_ENV=.*$', 'NODE_ENV=production'
    Set-Content -Path $envBackend -Value $contenido -Encoding UTF8 -NoNewline

    Write-Host "  OK: JWT_SECRET generado aleatoriamente" -ForegroundColor Green
    Write-Host "  OK: NODE_ENV=production" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "backend\.env ya existe: no se modifica." -ForegroundColor Yellow
    $tieneSecreto = (Get-Content $envBackend -Raw) -match '(?m)^JWT_SECRET=.{32,}'
    if (-not $tieneSecreto) {
        Write-Host "ADVERTENCIA: JWT_SECRET parece vacio o muy corto." -ForegroundColor Yellow
        Write-Host "Genera uno con:" -ForegroundColor Yellow
        Write-Host '  node -e "console.log(require(''crypto'').randomBytes(48).toString(''base64url''))"'
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host " Build completado" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso: instalar el servicio de Windows para que arranque solo."
Write-Host "  .\deploy\windows\instalar-servicio.ps1"
Write-Host ""
Write-Host "O arrancar manualmente para probar:"
Write-Host "  .\deploy\windows\iniciar-portal.bat"
Write-Host ""
