# Guía de despliegue

Cómo publicar el Portal de Herramientas en un servidor para que el equipo lo use
desde sus navegadores.

---

## Antes de empezar: qué necesita la aplicación

A diferencia de una web estática, este portal **necesita un proceso Node
corriendo**:

| Necesidad | Por qué |
|---|---|
| Proceso Node permanente | Es una API NestJS, no archivos HTML sueltos |
| Disco escribible | Los datos (usuarios, procedimientos, logs) son archivos JSON |
| Disco para subidas | Los avatares y documentos se guardan en `uploads/` |

**Por eso GitHub Pages no sirve** (solo publica archivos estáticos, sin proceso
ni disco). Necesitás un servidor real: un VPS, una máquina de la oficina, o un
servicio en la nube.

---

## Elegir el método

| Método | Cuándo conviene | Dificultad |
|---|---|---|
| **Docker Compose** | Servidor Linux, querés que sea reproducible y portable | Media |
| **PM2** | Servidor Linux sin Docker, o preferís algo más directo | Baja |
| **Servicio de Node** | Windows Server (NSSM) | Media |

Los tres sirven el portal en el puerto 3001 con el backend y el frontend juntos.

---

## Método A — Docker Compose (recomendado)

### Requisitos

- Docker y Docker Compose instalados en el servidor
- Puerto 3001 libre (o el que definas)

### Pasos

```bash
# 1. Copiar el proyecto al servidor
git clone <url-del-repositorio>
cd PORTAL_DE_HERRAMIENTAS

# 2. Configurar el entorno
cp .env.example .env
```

Editar `.env` y generar el secreto JWT:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```env
JWT_SECRET=<pegar-aqui-el-secreto-generado>
PORT_EXTERNO=3001
```

> El archivo `.env` **no debe subirse al repositorio**. Ya está en `.gitignore`.
> Si el secreto se filtra, cualquiera puede emitir tokens válidos.

```bash
# 3. Construir y arrancar
docker compose up -d --build

# 4. Verificar
docker compose ps
docker compose logs -f
```

### Primer arranque: la contraseña del admin

Como `users.example.json` no va dentro de la imagen (trae `admin`/`admin`),
en el primer arranque el backend genera una **contraseña aleatoria** y la
imprime **una sola vez**:

```bash
docker compose logs portal | grep -A6 "creado usuario admin"
```

Anotá esa contraseña. Si la perdés, hay que borrar el volumen de datos:

```bash
docker compose down -v      # ¡elimina todos los datos!
```

### Datos persistentes

Los datos viven en volúmenes de Docker, así que sobreviven a:

- Reconstruir la imagen (`docker compose up -d --build`)
- Reiniciar el servidor
- Actualizar el código

| Volumen | Contenido |
|---|---|
| `portal-data` | Usuarios, procedimientos, errores, logs, documentos |
| `portal-uploads` | Avatares y archivos subidos |

### Respaldos

```bash
# Respaldar los datos
docker run --rm \
  -v portal-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/data-$(date +%Y%m%d).tar.gz -C /data .

# Respaldar las subidas
docker run --rm \
  -v portal-uploads:/uploads \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /uploads .
```

### Actualizar a una versión nueva

```bash
git pull
docker compose up -d --build
```

Los datos se conservan (están en volúmenes, no en la imagen).

### Comandos útiles

```bash
docker compose logs -f          # ver logs en vivo
docker compose restart          # reiniciar
docker compose down             # detener
docker compose ps               # ver estado y salud
```

---

## Método B — PM2 (sin Docker)

### Requisitos

- Node.js 20 o superior
- PM2 instalado globalmente

### Pasos

```bash
# 1. Copiar el proyecto
git clone <url-del-repositorio>
cd PORTAL_DE_HERRAMIENTAS

# 2. Instalar dependencias y compilar
cd backend && npm ci && npm run build && cd ..
cd frontend && npm ci && npm run build && cd ..

# 3. Configurar el entorno
cp backend/.env.example backend/.env
# Editar backend/.env: JWT_SECRET (minimo 32 caracteres), NODE_ENV=production

# 4. Instalar PM2
npm install -g pm2

# 5. Arrancar
pm2 start ecosystem.config.cjs
pm2 save

# 6. Arranque automatico al reiniciar el servidor
pm2 startup      # ejecutar el comando que imprime
```

### Administración

```bash
pm2 status              # estado de los procesos
pm2 logs portal         # logs en vivo
pm2 restart portal      # reiniciar
pm2 stop portal         # detener
pm2 monit               # monitor en tiempo real
```

PM2 reinicia el proceso automáticamente si se cae, y también si supera 500 MB
de memoria (configurado en `ecosystem.config.cjs`).

---

## Método C — Windows Server (NSSM)

Si el servidor es Windows y no querés usar Docker.

```powershell
# 1. Compilar
cd backend; npm ci; npm run build; cd ..
cd frontend; npm ci; npm run build; cd ..

# 2. Configurar backend\.env con NODE_ENV=production y JWT_SECRET

# 3. Descargar NSSM desde https://nssm.cc/download y descomprimirlo

# 4. Registrar el servicio
nssm install PortalHerramientas "C:\Program Files\nodejs\node.exe"
nssm set PortalHerramientas AppDirectory "C:\ruta\PORTAL_DE_HERRAMIENTAS\backend"
nssm set PortalHerramientas AppParameters "dist\main.js"
nssm set PortalHerramientas AppEnvironmentExtra NODE_ENV=production
nssm set PortalHerramientas Start SERVICE_AUTO_START

# 5. Arrancar
nssm start PortalHerramientas
```

El servicio arranca solo con Windows y se reinicia si falla.

---

## HTTPS con dominio propio

El portal no debería quedar expuesto por HTTP: los tokens viajan en cada
petición.

### Nginx (Linux)

```bash
# 1. Copiar y adaptar la configuración
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/portal
sudo nano /etc/nginx/sites-available/portal     # cambiar el dominio

# 2. Activar
sudo ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. Certificado gratuito con Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d portal.midominio.com
```

Certbot configura el HTTPS y renueva el certificado automáticamente.

> **Importante:** la configuración de nginx ya envía `X-Forwarded-For`. El
> backend confía en ese header para que el rate limiting del login identifique
> la IP real del cliente y no la del proxy.

### Windows Server (IIS)

Usar **URL Rewrite** con **ARR** (Application Request Routing) como proxy
inverso hacia `http://127.0.0.1:3001`, o instalar Caddy:

```
portal.midominio.com {
    reverse_proxy 127.0.0.1:3001
}
```

Caddy gestiona el certificado HTTPS automáticamente sin configuración extra.

---

## Verificación posterior al despliegue

```bash
# El portal responde
curl -I http://localhost:3001

# La API responde
curl http://localhost:3001/configuracion
```

Luego, desde el navegador:

1. Abrir la URL del portal
2. Iniciar sesión con el usuario `admin` y la contraseña del primer arranque
3. Verificar que carguen los módulos (Dashboard, Procedimientos, Errores…)
4. Cambiar la contraseña del admin en **Perfil**
5. Crear los usuarios del equipo en **Usuarios**, con sus permisos
6. Subir un documento de prueba en **Documentación** (verifica las escrituras)

### Lista de comprobación

- [ ] El portal carga por HTTPS
- [ ] El login funciona y la sesión se mantiene mientras se usa
- [ ] La contraseña del admin fue cambiada
- [ ] Los usuarios del equipo están creados con sus permisos
- [ ] Los datos están en un volumen (no dentro de la imagen)
- [ ] Hay un respaldo programado de `data` y `uploads`
- [ ] El servicio arranca automáticamente al reiniciar el servidor
- [ ] `JWT_SECRET` está definido como variable de entorno
- [ ] `NODE_ENV=production`

---

## Configuración de referencia

Todas las variables se documentan en detalle en el README principal. Resumen
para producción:

| Variable | Valor recomendado | Obligatorio |
|---|---|---|
| `JWT_SECRET` | 48 bytes aleatorios en base64url | **Sí** |
| `NODE_ENV` | `production` | **Sí** |
| `PORT` | `3001` | No |
| `TOKEN_TTL` | `3m` (ventana de inactividad) | No |
| `LOGIN_MAX_INTENTOS` | `5` | No |
| `LOGIN_VENTANA_SEG` | `60` | No |
| `CORS_ORIGINS` | *(vacío si el backend sirve el frontend)* | No |

---

## Problemas frecuentes

### El contenedor arranca y se reinicia en bucle

Ver los logs:

```bash
docker compose logs --tail=50 portal
```

Causas típicas: `JWT_SECRET` vacío, puerto ocupado, o permisos del volumen.

### "Debes definir JWT_SECRET en el archivo .env"

Docker Compose exige esa variable a propósito. Generá el secreto y completá el
`.env`.

### Las subidas se pierden al reconstruir

Verificá que los volúmenes estén montados:

```bash
docker compose config | grep -A4 volumes
```

### El rate limiting bloquea a todo el equipo

Si el portal está detrás de un proxy y el backend no recibe `X-Forwarded-For`,
todas las peticiones parecen venir de la misma IP. Confirmar que el proxy envía
ese header (la configuración de nginx de este proyecto ya lo hace).

### No sé la contraseña del admin

Se imprimió una sola vez en el primer arranque:

```bash
docker compose logs portal | grep -B2 -A6 "creado usuario admin"
```

Si los logs ya rotaron, hay que borrar los datos y empezar de nuevo (perdiendo
los usuarios existentes pero conservando procedimientos, errores y documentos,
que están versionados en el repositorio):

```bash
docker compose down
docker run --rm -v portal-data:/data alpine rm -f /data/usuarios.json
docker compose up -d
docker compose logs portal | grep -A6 "creado usuario admin"
```
