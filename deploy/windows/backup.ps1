# ============================================================
# Portal de Herramientas - Respaldo de datos (Windows)
# ============================================================
# Comprime los datos y las subidas en un .zip con fecha.
#
# Uso (PowerShell, desde la raiz):
#     .\deploy\windows\backup.ps1
#     .\deploy\windows\backup.ps1 -Destino "D:\Respaldos"
#
# Programar con el Programador de tareas de Windows:
#   1. Abrir "Programador de tareas" -> Crear tarea basica
#   2. Desencadenador: Diariamente a las 03:00
#   3. Accion: Iniciar un programa
#      Programa:   powershell.exe
#      Argumentos: -ExecutionPolicy Bypass -File "C:\ruta\PORTAL_DE_HERRAMIENTAS\deploy\windows\backup.ps1"
#
# Conserva los ultimos 30 respaldos y borra los mas antiguos.
# ============================================================

param(
    [string]$Destino = "",
    [int]$Retencion = 30
)

$ErrorActionPreference = 'Stop'

$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not $Destino) { $Destino = Join-Path $Raiz 'backups' }

$fecha = Get-Date -Format 'yyyyMMdd-HHmmss'
if (-not (Test-Path $Destino)) { New-Item -ItemType Directory -Path $Destino -Force | Out-Null }

Write-Host ""
Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Iniciando respaldo"

# ---------- Respaldar datos ----------
$origenDatos = Join-Path $Raiz 'backend\data'
if (-not (Test-Path $origenDatos)) {
    Write-Host "ERROR: no se encuentra $origenDatos" -ForegroundColor Red
    exit 1
}

$zipDatos = Join-Path $Destino "portal-data-$fecha.zip"
Compress-Archive -Path (Join-Path $origenDatos '*') -DestinationPath $zipDatos -Force
Write-Host "  data-$fecha.zip"

# ---------- Respaldar subidas ----------
$origenSubidas = Join-Path $Raiz 'backend\uploads'
if (Test-Path $origenSubidas) {
    $hayArchivos = Get-ChildItem $origenSubidas -Recurse -File | Select-Object -First 1
    if ($hayArchivos) {
        $zipSubidas = Join-Path $Destino "portal-uploads-$fecha.zip"
        Compress-Archive -Path (Join-Path $origenSubidas '*') -DestinationPath $zipSubidas -Force
        Write-Host "  uploads-$fecha.zip"
    } else {
        Write-Host "  (sin archivos subidos que respaldar)"
    }
}

# ---------- Aplicar retencion ----------
Write-Host "  Aplicando retencion (ultimos $Retencion por tipo)"
foreach ($patron in @('portal-data-*.zip', 'portal-uploads-*.zip')) {
    $archivos = Get-ChildItem -Path $Destino -Filter $patron -File |
        Sort-Object LastWriteTime -Descending
    if ($archivos.Count -gt $Retencion) {
        $archivos | Select-Object -Skip $Retencion | ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "    eliminado: $($_.Name)"
        }
    }
}

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Respaldo completado en $Destino" -ForegroundColor Green
Write-Host ""
