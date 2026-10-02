# ============================================================
# Portal de Herramientas - Abrir el puerto en el Firewall
# ============================================================
# Permite que el equipo entre al portal desde la red local.
# Sin esto, solo funciona desde la propia PC del servidor.
#
# Uso (PowerShell COMO ADMINISTRADOR):
#     .\deploy\windows\abrir-firewall.ps1
#
# Cerrar el acceso:
#     .\deploy\windows\abrir-firewall.ps1 -Cerrar
# ============================================================

param(
    [int]$Puerto = 3001,
    [switch]$Cerrar
)

$ErrorActionPreference = 'Stop'

$esAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $esAdmin) {
    Write-Host ""
    Write-Host "ERROR: se necesitan permisos de administrador." -ForegroundColor Red
    Write-Host "Abri PowerShell como Administrador y volve a ejecutarlo."
    Write-Host ""
    exit 1
}

$nombreRegla = "Portal de Herramientas (TCP $Puerto)"

if ($Cerrar) {
    $regla = Get-NetFirewallRule -DisplayName $nombreRegla -ErrorAction SilentlyContinue
    if ($regla) {
        Remove-NetFirewallRule -DisplayName $nombreRegla
        Write-Host "Regla de firewall eliminada: el portal ya no es accesible desde la red." -ForegroundColor Green
    } else {
        Write-Host "No habia una regla con ese nombre." -ForegroundColor Yellow
    }
    exit 0
}

# ---------- Crear la regla ----------
$existente = Get-NetFirewallRule -DisplayName $nombreRegla -ErrorAction SilentlyContinue
if ($existente) {
    Write-Host "La regla ya existe: actualizandola." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $nombreRegla
}

# Restringir a la red local (mas seguro que abrirlo a cualquier origen)
New-NetFirewallRule `
    -DisplayName $nombreRegla `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $Puerto `
    -Action Allow `
    -Profile Private, Domain `
    -RemoteAddress LocalSubnet `
    -Description "Permite el acceso al Portal de Herramientas desde la red local" | Out-Null

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host " Puerto $Puerto habilitado en el firewall" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host " Solo desde la red local (LocalSubnet), no desde Internet."
Write-Host ""
Write-Host "El equipo puede entrar desde:"
$ips = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL|Docker' -and
                   $_.IPAddress -notmatch '^169\.254\.' } |
    Select-Object -ExpandProperty IPAddress)
foreach ($ip in $ips) {
    Write-Host "  http://${ip}:$Puerto"
}
Write-Host ""
