# ============================================================
# Portal de Herramientas - Servicio de Windows (NSSM)
# ============================================================
# Registra el portal como servicio de Windows: arranca solo al
# encender la PC y se reinicia si se cae.
#
# Uso (PowerShell COMO ADMINISTRADOR, desde la raiz del proyecto):
#     .\deploy\windows\instalar-servicio.ps1
#
# Requisitos:
#   1. Haber compilado:  .\deploy\windows\build.ps1
#   2. NSSM descargado de https://nssm.cc/download
#      (se puede indicar la ruta con -RutaNssm)
#
# Desinstalar:
#     .\deploy\windows\instalar-servicio.ps1 -Desinstalar
# ============================================================

param(
    [string]$RutaNssm = "",
    [string]$NombreServicio = "PortalHerramientas",
    [switch]$Desinstalar
)

$ErrorActionPreference = 'Stop'
$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# ---------- Verificar permisos de administrador ----------
$esAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $esAdmin) {
    Write-Host ""
    Write-Host "ERROR: este script necesita permisos de administrador." -ForegroundColor Red
    Write-Host "Abri PowerShell como Administrador y volve a ejecutarlo."
    Write-Host ""
    exit 1
}

# ---------- Localizar nssm.exe ----------
if (-not $RutaNssm) {
    $candidatos = @(
        (Join-Path $PSScriptRoot 'nssm.exe'),
        'C:\nssm\win64\nssm.exe',
        'C:\nssm\nssm.exe',
        'C:\Program Files\nssm\nssm.exe'
    )
    foreach ($c in $candidatos) {
        if (Test-Path $c) { $RutaNssm = $c; break }
    }
    if (-not $RutaNssm) {
        $enPath = Get-Command nssm -ErrorAction SilentlyContinue
        if ($enPath) { $RutaNssm = $enPath.Source }
    }
}

# ---------- Desinstalar ----------
if ($Desinstalar) {
    if (-not $RutaNssm) {
        Write-Host "ERROR: no se encontro nssm.exe. Indicá la ruta con -RutaNssm" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Host "Deteniendo y eliminando el servicio '$NombreServicio'..." -ForegroundColor Cyan
    & $RutaNssm stop $NombreServicio 2>$null
    Start-Sleep -Seconds 2
    & $RutaNssm remove $NombreServicio confirm
    Write-Host "Servicio eliminado." -ForegroundColor Green
    Write-Host ""
    exit 0
}

if (-not $RutaNssm) {
    Write-Host ""
    Write-Host "ERROR: no se encontro nssm.exe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Descargalo de https://nssm.cc/download, descomprimilo y:"
    Write-Host "  - copiá nssm.exe (carpeta win64) a deploy\windows\, o"
    Write-Host "  - indicá la ruta:  .\instalar-servicio.ps1 -RutaNssm C:\ruta\nssm.exe"
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Instalando el Portal como servicio" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " nssm:     $RutaNssm"
Write-Host " Servicio: $NombreServicio"
Write-Host ""

# ---------- Verificar que este compilado ----------
$mainJs = Join-Path $Raiz 'backend\dist\main.js'
if (-not (Test-Path $mainJs)) {
    Write-Host "ERROR: no existe backend\dist\main.js" -ForegroundColor Red
    Write-Host "Compila primero:  .\deploy\windows\build.ps1"
    exit 1
}

# ---------- Verificar el .env ----------
$envBackend = Join-Path $Raiz 'backend\.env'
if (-not (Test-Path $envBackend)) {
    Write-Host "ADVERTENCIA: no existe backend\.env" -ForegroundColor Yellow
    Write-Host "Se recomienda definirlo antes de instalar el servicio." -ForegroundColor Yellow
    Write-Host ""
}

# ---------- Node ----------
$nodeExe = (Get-Command node).Source
if (-not $nodeExe) {
    Write-Host "ERROR: Node.js no esta en el PATH." -ForegroundColor Red
    exit 1
}

# ---------- Detener una instalacion previa ----------
$existente = Get-Service -Name $NombreServicio -ErrorAction SilentlyContinue
if ($existente) {
    Write-Host "El servicio ya existe: deteniendolo y reconfigurandolo..." -ForegroundColor Yellow
    & $RutaNssm stop $NombreServicio 2>$null
    Start-Sleep -Seconds 2
}

# ---------- Registrar el servicio ----------
Write-Host "Registrando el servicio..." -ForegroundColor Cyan
& $RutaNssm install $NombreServicio $nodeExe
& $RutaNssm set $NombreServicio AppParameters "dist\main.js"
& $RutaNssm set $NombreServicio AppDirectory (Join-Path $Raiz 'backend')
& $RutaNssm set $NombreServicio DisplayName "Portal de Herramientas"
& $RutaNssm set $NombreServicio Description "Portal de Herramientas - API y frontend en el puerto 3001"

# Variables de entorno
& $RutaNssm set $NombreServicio AppEnvironmentExtra "NODE_ENV=production" "PORT=3001"

# Arranque automatico
& $RutaNssm set $NombreServicio Start SERVICE_AUTO_START

# Reinicio automatico si se cae
& $RutaNssm set $NombreServicio AppExit Default Restart
& $RutaNssm set $NombreServicio AppRestartDelay 5000
& $RutaNssm set $NombreServicio AppThrottle 3000

# Logs
$dirLogs = Join-Path $Raiz 'logs'
if (-not (Test-Path $dirLogs)) { New-Item -ItemType Directory -Path $dirLogs | Out-Null }
& $RutaNssm set $NombreServicio AppStdout (Join-Path $dirLogs 'portal-salida.log')
& $RutaNssm set $NombreServicio AppStderr (Join-Path $dirLogs 'portal-errores.log')
& $RutaNssm set $NombreServicio AppRotateFiles 1
& $RutaNssm set $NombreServicio AppRotateBytes 10485760

# ---------- Arrancar ----------
Write-Host "Arrancando el servicio..." -ForegroundColor Cyan
& $RutaNssm start $NombreServicio
Start-Sleep -Seconds 6

$estado = (Get-Service -Name $NombreServicio).Status
Write-Host ""
if ($estado -eq 'Running') {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host " Servicio instalado y corriendo" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
} else {
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host " El servicio esta en estado: $estado" -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Yellow
}

# ---------- Informar direcciones ----------
Write-Host ""
Write-Host "Acceso desde esta PC:  http://localhost:3001"
$ips = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL|Docker' -and
                   $_.IPAddress -notmatch '^169\.254\.' } |
    Select-Object -ExpandProperty IPAddress)

foreach ($ip in $ips) {
    Write-Host "Acceso desde la red:    http://${ip}:3001"
}

Write-Host ""
Write-Host "Contrasena inicial del admin (se muestra solo la primera vez):"
Write-Host "  Get-Content '$dirLogs\portal-salida.log' | Select-String -Pattern 'Contrasena' -Context 0,2"
Write-Host ""
Write-Host "Administrar el servicio:"
Write-Host "  Get-Service $NombreServicio"
Write-Host "  Restart-Service $NombreServicio"
Write-Host "  Stop-Service $NombreServicio"
Write-Host ""
Write-Host "Desinstalar:"
Write-Host "  .\deploy\windows\instalar-servicio.ps1 -Desinstalar"
Write-Host ""
Write-Host "IMPORTANTE: permitir el puerto 3001 en el firewall para la red local:" -ForegroundColor Yellow
Write-Host "  New-NetFirewallRule -DisplayName 'Portal de Herramientas' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow" -ForegroundColor Yellow
Write-Host ""
