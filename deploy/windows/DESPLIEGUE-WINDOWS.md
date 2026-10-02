# Despliegue en Windows (instalación sin costo)

Guía para dejar el Portal de Herramientas corriendo en una PC con Windows, para
que el equipo lo use desde la red local. **Sin costo de hosting.**

---

## Resumen

Vas a convertir una PC en el "servidor" del portal. Queda corriendo como
servicio de Windows: arranca solo al encender la PC y se reinicia si se cae.

El equipo entra desde su navegador a una dirección como:

```
http://192.168.x.x:3001
```

**Tiempo estimado:** 30 minutos la primera vez.

---

## Requisitos

| Requisito | Detalle |
|---|---|
| PC con Windows | 10 u 11. Puede ser una PC de escritorio o una notebook |
| Node.js 20 o superior | Descargar de https://nodejs.org |
| NSSM | Descargar de https://nssm.cc/download (gratis) |
| La PC siempre encendida | O configurada para no suspender |
| Red local | La PC y los usuarios en la misma red (Wi-Fi o cable) |

### Sobre la PC

No hace falta que sea potente. El portal usa unos **150 MB de RAM** y casi nada
de CPU. Cualquier PC de los últimos 10 años sirve.

Lo importante:

- **Que esté encendida** en el horario laboral
- **IP fija** (ver más abajo) para que la dirección no cambie
- **Que no se suspenda** (o los usuarios perderán conexión)

---

## Paso 1: Node.js

Si no está instalado:

1. Descargar el instalador LTS de https://nodejs.org
2. Instalarlo con las opciones por defecto
3. Verificar en PowerShell:

```powershell
node --version    # debe mostrar v20 o superior
```

---

## Paso 2: Copiar el proyecto

```powershell
cd C:\
git clone <url-del-repositorio> PORTAL_DE_HERRAMIENTAS
cd PORTAL_DE_HERRAMIENTAS
```

Si no usás git, copiá la carpeta del proyecto a `C:\PORTAL_DE_HERRAMIENTAS`.

> **Recomendación:** poné el proyecto en una ruta corta y sin espacios
> (`C:\PORTAL_DE_HERRAMIENTAS`). Evita problemas con algunas herramientas.

---

## Paso 3: Compilar

```powershell
.\deploy\windows\build.ps1
```

Si PowerShell bloquea el script:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\build.ps1
```

Este script hace todo:

1. Instala las dependencias del backend y del frontend
2. Compila ambos
3. Crea `backend\.env` con `NODE_ENV=production` y un **JWT_SECRET generado
   aleatoriamente**

Al terminar vas a ver `Build completado`.

---

## Paso 4: Probar antes de instalar el servicio

Antes de complicarte con el servicio, verificá que funcione:

```powershell
.\deploy\windows\iniciar-portal.bat
```

El script muestra las direcciones de acceso, algo así:

```
Acceso desde esta PC:        http://localhost:3001
Acceso desde la red local:   http://192.168.34.67:3001
```

**Anotá la contraseña del admin.** Aparece una sola vez:

```
[auth] usuarios.json no existia: creado usuario admin
[auth] Usuario:    admin
[auth] Contrasena: xxxxxxxxxxxx
```

Abrí la dirección de red en el navegador y verificá que cargue el portal.

Para detener: `Ctrl+C` en la ventana.

---

## Paso 5: Abrir el puerto en el firewall

**En otra ventana de PowerShell, como Administrador:**

```powershell
.\deploy\windows\abrir-firewall.ps1
```

Sin este paso, solo funciona desde la propia PC. La regla permite el acceso
**solo desde la red local**, no desde Internet.

---

## Paso 6: Instalar como servicio

**En PowerShell como Administrador:**

1. Descargá NSSM de https://nssm.cc/download
2. Descomprimilo y copiá `nssm.exe` (de la carpeta `win64`) a
   `deploy\windows\`
3. Ejecutá:

```powershell
.\deploy\windows\instalar-servicio.ps1
```

El portal ahora:

- Arranca automáticamente al encender la PC
- Se reinicia si se cae
- Corre en segundo plano (sin ventana abierta)

### Administrar el servicio

```powershell
Get-Service PortalHerramientas      # ver estado
Restart-Service PortalHerramientas  # reiniciar
Stop-Service PortalHerramientas     # detener
Start-Service PortalHerramientas    # arrancar
```

### Ver los logs

```powershell
Get-Content logs\portal-salida.log -Tail 30
```

### Si perdiste la contraseña del admin

```powershell
Get-Content logs\portal-salida.log | Select-String "Contrasena" -Context 0,2
```

Si los logs ya rotaron, hay que regenerar el usuario:

```powershell
Stop-Service PortalHerramientas
Remove-Item backend\data\usuarios.json
Start-Service PortalHerramientas
Start-Sleep 5
Get-Content logs\portal-salida.log | Select-String "Contrasena" -Context 0,2
```

> Esto **borra todos los usuarios**. Los procedimientos, errores y documentos
> no se tocan (están versionados en el proyecto).

---

## Paso 7: IP fija

Si la PC obtiene la IP por DHCP, puede cambiar al reinar el router y los
usuarios perderían el acceso.

**Opción A — IP fija en la PC** (recomendado)

1. Panel de control → Redes → Cambiar configuración del adaptador
2. Clic derecho en la conexión → Propiedades
3. Seleccionar "Protocolo de Internet versión 4 (TCP/IPv4)" → Propiedades
4. Elegir "Usar la siguiente dirección IP" y completar:
   - IP: `192.168.34.67` (una libre en tu red)
   - Máscara: `255.255.255.0`
   - Puerta de enlace: la IP del router (suele ser `192.168.0.1` o `192.168.1.1`)

**Opción B — Reserva en el router**

En la configuración del router, buscar DHCP y reservar la IP actual de la PC
para su dirección MAC. Es más simple y evita conflictos.

**Opción C — Nombre en vez de IP**

Si la red tiene resolución de nombres, se puede acceder como
`http://nombre-de-la-pc:3001`. Probar con:

```powershell
hostname    # el nombre de la PC
```

---

## Paso 8: Que no se suspenda

Si la PC entra en suspensión, el portal deja de responder.

**Configuración → Sistema → Inicio/apagado y suspensión:**

- Pantalla: se puede apagar (no afecta)
- **Suspender: "Nunca"**

También en **Opciones de energía → Cambiar el comportamiento de la tapa** (si es
notebook), poner "No hacer nada" al cerrar la tapa.

---

## Paso 9: Respaldos automáticos

```powershell
.\deploy\windows\backup.ps1
```

Genera un `.zip` de los datos y las subidas en `backups/`. Conserva los últimos 30.

### Programarlo a diario

1. Abrir **Programador de tareas** → **Crear tarea básica**
2. Nombre: `Respaldo Portal`
3. Desencadenador: **Diariamente** a las **03:00**
4. Acción: **Iniciar un programa**
   - Programa: `powershell.exe`
   - Argumentos: `-ExecutionPolicy Bypass -File "C:\PORTAL_DE_HERRAMIENTAS\deploy\windows\backup.ps1"`

> **Importante:** guardá los respaldos en **otro disco** o en una carpeta de red.
> Un respaldo en el mismo disco no sirve si el disco falla.

---

## Actualizar el portal

Cuando haya cambios nuevos:

```powershell
Stop-Service PortalHerramientas
git pull
.\deploy\windows\build.ps1
Start-Service PortalHerramientas
```

Los datos **no se pierden**: viven en `backend\data\` y `backend\uploads\`,
fuera del código compilado.

---

## Avisar al equipo

Mandales:

- La dirección: `http://192.168.34.67:3001`
- Su usuario y contraseña (creados en el módulo **Usuarios** con el admin)
- Que el portal solo funciona **dentro de la red de la oficina**

Si algún día necesitan entrar desde fuera de la oficina, hay que migrar a un
servidor con dominio (ver `deploy/DEPLOY.md`).

---

## Lista de comprobación final

- [ ] Node.js instalado
- [ ] `build.ps1` ejecutado sin errores
- [ ] El portal carga en `http://localhost:3001`
- [ ] La contraseña del admin está anotada
- [ ] El puerto 3001 está abierto en el firewall
- [ ] El servicio está instalado y corriendo
- [ ] El portal carga desde otra PC de la red (`http://IP:3001`)
- [ ] La IP de la PC es fija o está reservada en el router
- [ ] La PC no entra en suspensión
- [ ] El respaldo diario está programado en otro disco
- [ ] La contraseña del admin fue cambiada desde Perfil
- [ ] Los usuarios del equipo están creados con sus permisos

---

## Problemas frecuentes

### No carga desde otras PCs de la red

1. ¿El firewall permite el puerto? Verificá:
   ```powershell
   Get-NetFirewallRule -DisplayName "*Portal de Herramientas*"
   ```
   Si no aparece, ejecutá `abrir-firewall.ps1` como administrador.

2. ¿La red está marcada como "Pública"? Windows bloquea las conexiones entrantes
   en redes públicas. Cambiala a "Privada":
   Configuración → Red e Internet → Wi-Fi → Propiedades → Perfil de red: Privada

3. ¿Se puede hacer ping desde la otra PC?
   ```powershell
   ping 192.168.34.67
   ```

### "EADDRINUSE: address already in use :::3001"

Hay otra instancia corriendo (por ejemplo, si arrancaste el `.bat` y además el
servicio).

```powershell
Stop-Service PortalHerramientas
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### El servicio arranca y se detiene

Mirá los logs:

```powershell
Get-Content logs\portal-errores.log -Tail 30
```

Causa típica: falta `backend\.env` o el `JWT_SECRET` está vacío.

### Cambió la IP y nadie puede entrar

Configurá IP fija (Paso 7) o reservá la dirección en el router.

### Funciona un rato y después no

Probablemente la PC entró en suspensión (Paso 8) o perdió la conexión de red.

### No sé con qué usuario entraron

El módulo **Actividad** registra cada inicio de sesión con fecha, hora y usuario.
También podés verlo en los logs del servidor.

---

## Si más adelante querés cero mantenimiento

Cuando el equipo adopte el portal y necesiten acceso desde fuera de la oficina
(o no quieras depender de que la PC esté encendida), la migración a un VPS con
Docker es directa: ya está todo preparado en `Dockerfile` y
`docker-compose.yml`, y probado. Ver `deploy/DEPLOY.md`.
