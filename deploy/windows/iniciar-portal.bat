@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM Portal de Herramientas - Arranque manual (Windows)
REM ============================================================
REM Arranca el portal en modo produccion. Usar para probar o para
REM dejar corriendo en una consola.
REM
REM Para que arranque solo con Windows, usar instalar-servicio.ps1
REM ============================================================

set PUERTO=3001
cd /d "%~dp0..\.."

echo.
echo =============================================
echo  Portal de Herramientas
echo =============================================
echo.

REM ---------- Verificar que este compilado ----------
if not exist "backend\dist\main.js" (
    echo ERROR: no se encuentra backend\dist\main.js
    echo.
    echo Compila primero con:
    echo   .\deploy\windows\build.ps1
    echo.
    pause
    exit /b 1
)

REM ---------- Verificar que el puerto este libre ----------
set PID_OCUPADO=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PUERTO%" ^| findstr "LISTENING"') do (
    if "!PID_OCUPADO!"=="" set PID_OCUPADO=%%p
)

if not "!PID_OCUPADO!"=="" (
    echo ADVERTENCIA: el puerto %PUERTO% ya esta en uso.
    echo.
    for /f "tokens=*" %%c in ('powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=!PID_OCUPADO!').CommandLine" 2^>nul') do (
        echo   Proceso: PID !PID_OCUPADO!
        echo   Comando: %%c
    )
    echo.
    echo Puede ser:
    echo   - El servicio de Windows ya instalado ^(PortalHerramientas^)
    echo   - Otra consola con el portal abierto
    echo.
    echo Si el servicio ya esta corriendo, no hace falta este script:
    echo el portal ya es accesible en http://localhost:%PUERTO%
    echo.
    set /p RESPUESTA="Cerrar ese proceso y continuar? (s/N): "
    if /i not "!RESPUESTA!"=="s" (
        echo.
        echo Cancelado. No se hizo ningun cambio.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Cerrando PID !PID_OCUPADO!...
    taskkill /F /PID !PID_OCUPADO! >nul 2>&1
    if errorlevel 1 (
        echo ERROR: no se pudo cerrar. Proba ejecutar como Administrador.
        pause
        exit /b 1
    )
    echo Listo.
    echo.
    REM Esperar a que el sistema libere el puerto
    timeout /t 3 /nobreak >nul
)

REM ---------- Verificar configuracion ----------
if not exist "backend\.env" (
    echo ADVERTENCIA: no existe backend\.env
    echo Se usaran los valores por defecto. Para produccion, defini JWT_SECRET.
    echo.
)

REM ---------- Mostrar direcciones de acceso ----------
echo Acceso desde esta PC:        http://localhost:%PUERTO%
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set IP=%%b
        REM Ignorar direcciones de adaptadores virtuales (169.254.x = sin red)
        echo !IP! | findstr /b /c:"169.254." >nul
        if errorlevel 1 (
            echo !IP! | findstr /b /c:"172.29." >nul
            if errorlevel 1 echo Acceso desde la red local: http://!IP!:%PUERTO%
        )
    )
)
echo.
echo Contrasena del admin:
echo   - Si es el primer arranque, aparece abajo ^(anotala^)
echo   - Si no, es la que definiste al crear el usuario
echo.
echo Para detener: Ctrl+C
echo =============================================
echo.

cd backend
set NODE_ENV=production
node dist\main.js

echo.
echo El portal se detuvo.
pause
