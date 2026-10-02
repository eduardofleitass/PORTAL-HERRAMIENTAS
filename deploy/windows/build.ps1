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
#
# Notas sobre Windows:
#  - Usa 'npm install' en vez de 'npm ci' porque 'npm ci' borra
#    node_modules completo, y Windows no permite borrar archivos que
#    otro proceso tiene abiertos (antivirus, editores, Vite corriendo).
#  - Detecta y ofrece cerrar los procesos que bloquean la compilacion.
# ============================================================

param(
    [switch]$SaltarDeteccion
)

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

# ---------- Detectar procesos que bloquean node_modules ----------
if (-not $SaltarDeteccion) {
    $bloqueadores = @()
    foreach ($nombre in @('frontend', 'backend')) {
        $rutaProyecto = Join-Path $Raiz $nombre
        $procesos = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -like "*$rutaProyecto*" }

        foreach ($p in $procesos) {
            # Ignorar procesos propios de este script
            if ($p.ProcessId -ne $PID) {
                $bloqueadores += [PSCustomObject]@{
                    Id   = $p.ProcessId
                    Que  = if ($p.CommandLine -match 'vite') { 'servidor de desarrollo (Vite)' } else { 'proceso de Node' }
                    Ruta = $nombre
                }
            }
        }
    }

    if ($bloqueadores.Count -gt 0) {
        Write-Host ""
        Write-Host "Se encontraron procesos que pueden bloquear la compilacion:" -ForegroundColor Yellow
        foreach ($b in $bloqueadores) {
            Write-Host "  PID $($b.Id)  $($b.Que) en $($b.Ruta)" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Windows no permite reemplazar archivos en uso. Si la compilacion falla con" -ForegroundColor Yellow
        Write-Host "'EPERM: operation not permitted', hay que cerrarlos." -ForegroundColor Yellow
        Write-Host ""
        $respuesta = Read-Host "Cerrarlos ahora? (s/N)"
        if ($respuesta -match '^[sS]') {
            foreach ($b in $bloqueadores) {
                Stop-Process -Id $b.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  cerrado: PID $($b.Id)" -ForegroundColor Green
            }
            Start-Sleep -Seconds 2
        } else {
            Write-Host "  Continuando sin cerrarlos..." -ForegroundColor Yellow
        }
    }
}

# ---------- Instalar dependencias (funcion con reintento) ----------
function Install-Deps {
    param([string]$Carpeta, [string]$Nombre)

    Write-Host ""
    Write-Host "Instalando dependencias del $Nombre..." -ForegroundColor Cyan
    Set-Location (Join-Path $Raiz $Carpeta)

    # npm install (no npm ci): actualiza en vez de borrar todo node_modules.
    # Asi se evita el EPERM de Windows cuando hay archivos en uso.
    #
    # Se invoca via 'cmd /c' con la salida a un archivo temporal: npm escribe
    # sus advertencias (EBADENGINE, deprecations) en stderr, y PowerShell las
    # convertiria en errores fatales por el $ErrorActionPreference='Stop'.
    $logNpm = Join-Path $env:TEMP "portal-npm-$Nombre-$PID.log"
    & cmd /c "npm install --no-audit --no-fund > `"$logNpm`" 2>&1"
    $codigo = $LASTEXITCODE

    # Mostrar la salida omitiendo el ruido de advertencias
    if (Test-Path $logNpm) {
        Get-Content $logNpm | Where-Object {
            $_ -notmatch '^npm warn|^npm notice|EBADENGINE|^\s+(node|npm|yarn):|^\s+\}|^\s*$|packages are looking for funding|npm fund'
        } | ForEach-Object { Write-Host "  $_" }
    }

    if ($codigo -ne 0) {
        $contenido = if (Test-Path $logNpm) { Get-Content $logNpm -Raw } else { '' }
        if ($contenido -match 'EPERM|EBUSY|operation not permitted') {
            Write-Host ""
            Write-Host "ERROR: Windows bloqueo un archivo de node_modules." -ForegroundColor Red
            Write-Host "Cerrá estos programas y volvé a intentar:" -ForegroundColor Yellow
            Write-Host "  - Editores de codigo (VS Code) con el proyecto abierto"
            Write-Host "  - Un servidor de desarrollo corriendo (npm run dev)"
            Write-Host "  - El antivirus (agregá la carpeta del proyecto a las exclusiones)"
        }
        Write-Host "ERROR: fallo la instalacion de dependencias del $Nombre" -ForegroundColor Red
        if (Test-Path $logNpm) { Remove-Item $logNpm -Force -ErrorAction SilentlyContinue }
        return $false
    }

    if (Test-Path $logNpm) { Remove-Item $logNpm -Force -ErrorAction SilentlyContinue }
    return $true
}

# ---------- Compilar (aislado de stderr, igual que npm install) ----------
function Compile-Proyecto {
    param([string]$Nombre, [string]$Script)

    $logBuild = Join-Path $env:TEMP "portal-build-$Nombre-$PID.log"
    & cmd /c "npm run $Script > `"$logBuild`" 2>&1"
    $codigo = $LASTEXITCODE

    if (Test-Path $logBuild) {
        Get-Content $logBuild | ForEach-Object { Write-Host "  $_" }
    }
    if (Test-Path $logBuild) { Remove-Item $logBuild -Force -ErrorAction SilentlyContinue }

    return $codigo
}

# ---------- Backend ----------
if (-not (Install-Deps -Carpeta 'backend' -Nombre 'backend')) { exit 1 }

Write-Host ""
Write-Host "[2/3] Compilando el backend..." -ForegroundColor Cyan
Set-Location (Join-Path $Raiz 'backend')
if ((Compile-Proyecto -Nombre 'backend' -Script 'build') -ne 0) {
    Write-Host "ERROR: fallo la compilacion del backend" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $Raiz 'backend\dist\main.js'))) {
    Write-Host "ERROR: no se genero backend\dist\main.js" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: backend\dist\main.js" -ForegroundColor Green

# ---------- Frontend ----------
if (-not (Install-Deps -Carpeta 'frontend' -Nombre 'frontend')) { exit 1 }

Write-Host ""
Write-Host "[3/3] Compilando el frontend..." -ForegroundColor Cyan
Set-Location (Join-Path $Raiz 'frontend')
if ((Compile-Proyecto -Nombre 'frontend' -Script 'build') -ne 0) {
    Write-Host "ERROR: fallo la compilacion del frontend" -ForegroundColor Red
    exit 1
}

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
Write-Host "Siguiente paso: probar el portal."
Write-Host "  .\deploy\windows\iniciar-portal.bat"
Write-Host ""
Write-Host "Despues, instalarlo como servicio:"
Write-Host "  .\deploy\windows\instalar-servicio.ps1"
Write-Host ""
