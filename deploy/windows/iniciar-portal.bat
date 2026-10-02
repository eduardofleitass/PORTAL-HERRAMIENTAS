@echo off
REM ============================================================
REM Portal de Herramientas - Arranque manual (Windows)
REM ============================================================
REM Arranca el portal en modo produccion. Usar para probar o para
REM dejar corriendo en una consola.
REM
REM Para que arranque solo con Windows, usar instalar-servicio.ps1
REM ============================================================

setlocal

REM Ir a la raiz del proyecto (dos niveles arriba de este archivo)
cd /d "%~dp0..\.."

echo.
echo =============================================
echo  Portal de Herramientas
echo =============================================
echo.

if not exist "backend\dist\main.js" (
    echo ERROR: no se encuentra backend\dist\main.js
    echo Compila primero con:  deploy\windows\build.ps1
    pause
    exit /b 1
)

if not exist "backend\.env" (
    echo ADVERTENCIA: no existe backend\.env
    echo Se usaran los valores por defecto. Para produccion, defini JWT_SECRET.
    echo.
)

REM Mostrar la IP de red para que el equipo sepa donde entrar
echo Acceso desde esta PC:        http://localhost:3001
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do echo Acceso desde la red local: http://%%b:3001
)
echo.
echo Contrasena inicial del admin: revisar el mensaje de abajo
echo (solo aparece la primera vez que arranca)
echo.
echo Para detener: Ctrl+C
echo =============================================
echo.

cd backend
set NODE_ENV=production
node dist\main.js

pause
