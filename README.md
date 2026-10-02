# Portal de Herramientas

Aplicación web de uso general para equipos de soporte, desarrollo o cualquier
organización que necesite centralizar su conocimiento operativo.

Reúne los procedimientos paso a paso, el catálogo de errores conocidos con sus
diagnósticos, la documentación interna y la trazabilidad de quién hizo qué.
Funciona igual de bien para un equipo de Help Desk, de desarrollo, de
infraestructura o de operaciones.

---

## Índice

- [Qué resuelve](#qué-resuelve)
- [Módulos](#módulos)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Seguridad](#seguridad)
- [API del backend](#api-del-backend)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Datos y persistencia](#datos-y-persistencia)
- [Tests](#tests)
- [Empaquetado como aplicación de escritorio](#empaquetado-como-aplicación-de-escritorio)
- [Despliegue en producción](#despliegue-en-producción)
- [Solución de problemas](#solución-de-problemas)
- [Pendientes conocidos](#pendientes-conocidos)

---

## Qué resuelve

En la mayoría de los equipos el conocimiento operativo está disperso:
procedimientos en documentos sueltos, errores resueltos que se vuelven a
diagnosticar desde cero, manuales difíciles de encontrar, y ninguna forma de
saber quién cambió qué.

Este portal lo unifica en un único lugar, con búsqueda, permisos por usuario y
registro de actividad.

| Necesidad | Cómo lo cubre |
|---|---|
| "¿Cómo se hace X?" | Procedimientos paso a paso con nivel y tiempo estimado |
| "Ya vi este error antes" | Catálogo de errores con causa y solución |
| "¿Dónde está el manual?" | Documentación centralizada (PDF, TXT, MD) |
| "¿Quién cambió esto?" | Registro de actividad con detalle técnico y legible |
| "No quiero que todos editen" | Permisos granulares por módulo y por acción |

---

## Módulos

| Módulo | Ruta | Descripción |
|---|---|---|
| **Dashboard** | `/` | Métricas del portal y gráficos por módulo, nivel y errores |
| **Procedimientos** | `/procedimientos` | Guías paso a paso para casos frecuentes |
| **Errores** | `/errores` | Catálogo de errores con diagnóstico y solución |
| **Documentación** | `/documentacion` | Manuales y políticas, con vista previa integrada |
| **Actividad** | `/logs` | Registro de auditoría con filtros interactivos |
| **Usuarios** | `/usuarios` | Alta, edición, permisos y estado de usuarios |
| **Perfil** | `/perfil` | Datos propios, avatar y cambio de contraseña |

Los módulos visibles dependen de los permisos del usuario. Un usuario sin permiso
en un módulo no lo ve en el menú **y el backend rechaza el acceso** aunque
intente entrar por URL directa.

---

## Stack tecnológico

**Backend**

| Componente | Tecnología |
|---|---|
| Framework | NestJS 12 (TypeScript, ESM) |
| Autenticación | JWT (`jsonwebtoken`) con sesión deslizante |
| Contraseñas | bcrypt (10 rondas) |
| Persistencia | Archivos JSON |
| Servidor HTTP | Express (vía `@nestjs/platform-express`) |
| Configuración | Variables de entorno + `dotenv` |
| Tests | Vitest |

**Frontend**

| Componente | Tecnología |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Ruteo | React Router 6 (`HashRouter`) |
| Estilos | CSS propio con variables (tema claro/oscuro) |
| Iconos | lucide-react |
| Gráficos | SVG nativo (sin librerías) |
| Tests E2E | Playwright |

**Escritorio (opcional)**

| Componente | Tecnología |
|---|---|
| Empaquetado | Electron 44 + electron-builder |
| Instalador | NSIS (Windows) |

---

## Requisitos

| Requisito | Versión | Nota |
|---|---|---|
| Node.js | **20 o superior** | Desarrollado y probado con v24.12.0 |
| npm | 10 o superior | Viene con Node |
| Sistema | Windows / Linux / macOS | El empaquetado `.exe` es solo Windows |

Verificar la versión instalada:

```bash
node --version
```

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd PORTAL_DE_HERRAMIENTAS

# 2. Instalar dependencias de los tres paquetes
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. (Opcional) Instalar dependencias del empaquetado de escritorio
npm install

# 4. (Opcional) Preparar la configuración
cp backend/.env.example backend/.env
```

**Sobre `usuarios.json`:** no está en el repositorio (contiene hashes de
contraseñas). En el primer arranque, el backend lo crea automáticamente con un
usuario `admin` y **una contraseña aleatoria que se muestra una sola vez en la
consola**. Anotala.

---

## Configuración

Toda la configuración del backend va por variables de entorno. Ninguna es
obligatoria en desarrollo: si no se definen, se usan valores por defecto seguros
definidos en `backend/src/config.ts`.

Copiar la plantilla:

```bash
cp backend/.env.example backend/.env
```

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del backend |
| `NODE_ENV` | `development` | `production` sirve el frontend compilado y oculta detalles de error |
| `JWT_SECRET` | *(generado)* | Secreto para firmar tokens. **Mínimo 32 caracteres.** Si no se define, se genera uno aleatorio y se guarda en `backend/data/.jwt-secret` |
| `TOKEN_TTL` | `3m` | Duración del token. Con sesión deslizante actúa como ventana de inactividad |
| `LOGIN_MAX_INTENTOS` | `5` | Intentos de login permitidos por IP |
| `LOGIN_VENTANA_SEG` | `60` | Ventana de tiempo del límite de intentos |
| `CORS_ORIGINS` | *(vacío)* | Orígenes permitidos separados por coma. Vacío = solo orígenes locales |
| `PORTAL_FRONTEND_DIST` | *(vacío)* | Ruta al frontend compilado si `NODE_ENV=production` |

Generar un secreto JWT fuerte:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**Configuración del frontend** (`frontend/.env`, opcional):

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL del backend. Si no se define, se resuelve automáticamente (ver más abajo) |

La resolución automática de la URL del backend, definida en
`frontend/src/config/api.ts`, sigue este orden:

1. `VITE_API_URL` si está definida en tiempo de compilación
2. El mismo origen, cuando el backend sirve el frontend (producción)
3. `http://localhost:3001` (desarrollo con Vite y aplicación Electron)

Esto permite usar **la misma compilación** en los tres escenarios.

---

## Ejecución

### Desarrollo

Abrir **dos terminales**:

```bash
# Terminal 1 — Backend (con recarga automática)
cd backend
npm run start:dev

# Terminal 2 — Frontend (Vite, recarga en caliente)
cd frontend
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5174 |
| Backend | http://localhost:3001 |

> **Atención al puerto del frontend.** Vite toma el primer puerto libre a partir
> de 5173. Si tenés otro proyecto corriendo en esa máquina, el portal puede
> quedar en **5174 o 5175**. El puerto real se muestra al arrancar Vite.

### Producción (local)

```bash
# 1. Compilar ambos paquetes
cd backend && npm run build
cd ../frontend && npm run build

# 2. Activar modo producción en backend/.env
#    NODE_ENV=production

# 3. Arrancar
cd ../backend
npm run start:prod
```

Con `NODE_ENV=production`, el backend sirve el frontend compilado. Todo queda
disponible en `http://localhost:3001`.

> **Nota sobre Windows:** definí las variables en `backend/.env` en lugar de
> usar el prefijo (`NODE_ENV=production npm run ...`). El prefijo funciona en
> bash pero no en PowerShell ni en el Símbolo del sistema.

---

## Seguridad

| Medida | Implementación |
|---|---|
| Contraseñas | Hash bcrypt con 10 rondas. Nunca se guardan en texto plano |
| Tokens | JWT firmados; el secreto se genera aleatoriamente si no se define |
| Sesión deslizante | El token se renueva mientras el usuario esté activo; muere tras 3 min de inactividad |
| Rate limiting | Máximo 5 intentos de login por IP por minuto (HTTP 429) |
| Permisos | Validados en el backend (no solo ocultos en el frontend) |
| Auditoría | Cada acción queda registrada con usuario, IP y detalle en `logs.json` |
| Credenciales por defecto | Eliminadas. Si no hay usuarios, se genera una contraseña aleatoria |
| Aviso de contraseña débil | Al arrancar, advierte si algún usuario conserva la contraseña `admin` |

**Recomendaciones para producción:**

1. Definir `JWT_SECRET` como variable de entorno (mínimo 32 caracteres).
2. Definir `CORS_ORIGINS` con los dominios reales.
3. Definir `NODE_ENV=production`.
4. Cambiar la contraseña del usuario `admin` desde Perfil.
5. Servir detrás de HTTPS (proxy inverso).

---

## API del backend

Base: `http://localhost:3001`

### Autenticación — `/auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | — | Inicia sesión. Devuelve `{ token, usuario }` |
| POST | `/auth/refresh` | Token | Renueva el token (sesión deslizante) |
| GET | `/auth/me` | Token | Datos del usuario autenticado |
| PATCH | `/auth/me/avatar` | Token | Sube el avatar propio |

### Módulos

| Método | Ruta | Permiso requerido |
|---|---|---|
| GET | `/procedimientos` | Módulo `procedimientos` |
| POST | `/procedimientos` | Acción `crear` |
| PATCH | `/procedimientos/:id` | Acción `editar` |
| DELETE | `/procedimientos/:id` | Acción `eliminar` |
| GET | `/errores` | Módulo `errores` |
| POST | `/errores` | Acción `crear` |
| PATCH | `/errores/:id` | Acción `editar` |
| DELETE | `/errores/:id` | Acción `eliminar` |
| GET | `/documentacion` | Módulo `documentacion` |
| POST | `/documentacion` | Acción `crear` |
| PATCH | `/documentacion/:id` | Acción `editar` |
| DELETE | `/documentacion/:id` | Acción `eliminar` |
| GET | `/logs` | Módulo `actividad` |
| GET | `/logs/resumen` | Módulo `actividad` |
| DELETE | `/logs` | Módulo `actividad` |
| POST | `/logs/frontend` | **Público** — reporta errores del frontend |
| GET | `/usuarios` | Módulo `usuarios` |
| GET | `/usuarios/:id` | Módulo `usuarios` (o el propio `:id`) |
| POST | `/usuarios` | Módulo `usuarios` |
| PATCH | `/usuarios/:id` | Módulo `usuarios` (o el propio `:id`) |
| DELETE | `/usuarios/:id` | Módulo `usuarios` |
| GET | `/metricas` | Público |
| GET | `/configuracion/*` | Público |

**Autenticación en las peticiones:**

```
Authorization: Bearer <token>
```

### Permisos

Cada usuario tiene un objeto de permisos con dos dimensiones:

```json
{
  "modulos": {
    "dashboard": true,
    "procedimientos": true,
    "errores": true,
    "documentacion": false,
    "actividad": false,
    "usuarios": false
  },
  "acciones": {
    "crear": true,
    "editar": true,
    "eliminar": false,
    "exportarPDF": true,
    "exportarCSV": false
  }
}
```

- **`modulos`** controla el acceso a cada sección completa.
- **`acciones`** controla qué operaciones puede realizar dentro de ellas.
- Los usuarios con rol `admin` tienen acceso total sin importar este objeto.
- Excepción: cualquier usuario puede editar **su propio** perfil.

---

## Estructura del proyecto

```
PORTAL_DE_HERRAMIENTAS/
├── backend/                  API NestJS
│   ├── src/
│   │   ├── auth/             Login, JWT, guards (auth, permiso, módulo, throttle)
│   │   ├── configuracion/    Grupos, estados, módulos, sucursales
│   │   ├── documentacion/    Carga y gestión de archivos
│   │   ├── errores/          Catálogo de errores
│   │   ├── logs/             Registro de auditoría
│   │   ├── metricas/         Datos del dashboard
│   │   ├── procedimientos/   Guías paso a paso
│   │   ├── usuarios/         Gestión de usuarios y avatares
│   │   ├── config.ts         Configuración central por entorno
│   │   ├── data-path.ts      Resolución de rutas de los JSON
│   │   └── main.ts           Arranque, CORS, estáticos
│   ├── data/                 Datos en JSON (persistencia)
│   ├── uploads/              Archivos subidos (avatares, documentos)
│   └── .env.example          Plantilla de configuración
│
├── frontend/                 Interfaz React
│   ├── src/
│   │   ├── components/       Sidebar, modales, paginación, alertas
│   │   ├── config/api.ts     Resolución de la URL del backend
│   │   ├── context/          Auth, tema, notificaciones, toasts
│   │   ├── hooks/            Paginación, ordenamiento
│   │   ├── pages/            Una página por módulo
│   │   ├── utils/            Exportación a PDF
│   │   └── index.css         Estilos y temas (claro/oscuro)
│   ├── public/               Imágenes y recursos estáticos
│   └── tests/                Suites E2E de Playwright
│
├── electron/                 Proceso principal de Electron
├── scripts/                  Hooks de empaquetado
└── package.json              Scripts de orquestación y empaquetado
```

---

## Datos y persistencia

La información vive en archivos JSON dentro de `backend/data/`:

| Archivo | Contenido | En el repositorio |
|---|---|---|
| `usuarios.json` | Usuarios con contraseñas hasheadas | **No** (se genera) |
| `usuarios.example.json` | Plantilla de usuarios | Sí |
| `procedimientos.json` | Procedimientos | Sí |
| `errores.json` | Catálogo de errores | Sí |
| `documentacion.json` | Índice de documentos | Sí |
| `logs.json` | Registro de auditoría | **No** (se genera) |
| `configuracion.json` | Grupos, estados, módulos, sucursales | Sí |
| `.jwt-secret` | Secreto JWT autogenerado | **No** |

Los archivos subidos se guardan en `backend/uploads/`.

### Respaldos

Al ser archivos planos, un respaldo es copiar el directorio:

```bash
cp -r backend/data backups/data-$(date +%Y%m%d)
cp -r backend/uploads backups/uploads-$(date +%Y%m%d)
```

**Limitación conocida:** las escrituras no usan bloqueo. Si dos usuarios guardan
al mismo tiempo, una escritura puede sobrescribir a la otra. Para un equipo
pequeño el riesgo es bajo; si el uso crece, conviene migrar a una base de datos.

---

## Tests

Las suites E2E usan Playwright y validan el portal completo contra los servicios
en ejecución.

### Requisitos previos

Backend y frontend deben estar corriendo (ver [Ejecución](#ejecución)).

### Suites disponibles

```bash
cd frontend/tests
```

| Suite | Checks | Qué valida |
|---|---|---|
| `regression-test.cjs` | 31 | Autenticación, permisos, botones PDF/CSV, exportación, sidebar móvil, responsive, errores JS |
| `regression-permisos.cjs` | 15 | Permisos granulares con un usuario temporal; lo elimina al terminar |
| `regression-logs-filtros.cjs` | 18 | Filtros interactivos del módulo Actividad |
| `regression-buscador.cjs` | 9 | Buscador global: no expulsa la sesión |
| `regression-sesion.cjs` | 13 | Sesión deslizante y expiración por inactividad |
| `responsive-audit.cjs` | — | Detecta desbordamiento horizontal en 4 tamaños y genera capturas |
| `light-audit.cjs` | — | Capturas de las 7 páginas en modo claro |

```bash
# Ejecutar una suite
node regression-test.cjs

# Ver todas
node regression-test.cjs && \
node regression-permisos.cjs && \
node regression-logs-filtros.cjs && \
node regression-sesion.cjs
```

Cada check imprime `PASS` o `FAIL`, con un resumen final. El código de salida es
`0` si todo pasa y `1` si hay fallos.

**Duración:** alrededor de 15 minutos en total. La suite de sesión espera
deliberadamente más de 3 minutos para verificar la expiración por inactividad.

### Tests del backend

```bash
cd backend
npm test
```

---

## Empaquetado como aplicación de escritorio

Genera un instalador `.exe` de Windows que incluye backend, frontend y Electron.

```bash
# Desde la raíz del proyecto
npm install          # instala electron y electron-builder
npm run dist
```

El instalador queda en `dist-electron/`.

### Durante el desarrollo

```bash
npm run electron:dev
```

Levanta backend, frontend y Electron juntos, con recarga automática.

### Notas

- La aplicación empaquetada arranca el backend internamente en el puerto 3001.
- El frontend resuelve la URL del backend automáticamente (ver
  [Configuración](#configuración)), por lo que la misma compilación funciona
  empaquetada y en la web.
- Diagnóstico: definir `PORTAL_DEBUG=1` para ver los logs de Electron en consola.
  También se escriben en `electron-debug.log` dentro del directorio de datos
  del usuario.

---

## Despliegue en producción

> **Windows, sin costo:** [`deploy/windows/DESPLIEGUE-WINDOWS.md`](deploy/windows/DESPLIEGUE-WINDOWS.md)
> — dejar el portal corriendo en una PC de la oficina con servicio de Windows.
>
> **Servidor con dominio y HTTPS:** [`deploy/DEPLOY.md`](deploy/DEPLOY.md)
> — Docker Compose, PM2 o NSSM.

### Antes de empezar: qué necesita la aplicación

A diferencia de una web estática, el portal **necesita un proceso Node
corriendo**:

| Necesidad | Por qué |
|---|---|
| Proceso Node permanente | Es una API NestJS, no archivos HTML sueltos |
| Disco escribible | Los datos (usuarios, procedimientos, logs) son archivos JSON |
| Disco para subidas | Los avatares y documentos se guardan en `uploads/` |

Por eso **no sirve un hosting estático** (GitHub Pages, Netlify, Vercel en modo
estático). Necesitás un servidor: un VPS, una máquina de la oficina, o un
servicio en la nube que ejecute procesos.

### Método A — Docker Compose (recomendado)

```bash
# 1. Configurar
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# Pegar el resultado en JWT_SECRET dentro de .env

# 2. Construir y arrancar
docker compose up -d --build

# 3. Obtener la contraseña inicial del admin (se muestra una sola vez)
docker compose logs portal | grep -A6 "creado usuario admin"
```

Los datos y las subidas viven en volúmenes (`portal-data`, `portal-uploads`),
así que sobreviven a reconstrucciones y reinicios. Para actualizar:

```bash
git pull && docker compose up -d --build
```

### Método B — PM2 (sin Docker)

```bash
# 1. Compilar
cd backend && npm ci && npm run build && cd ..
cd frontend && npm ci && npm run build && cd ..

# 2. Configurar backend/.env (JWT_SECRET y NODE_ENV=production)

# 3. Arrancar con PM2
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup     # arranque automático al reiniciar
```

### Método C — Windows Server

Ver [`deploy/DEPLOY.md`](deploy/DEPLOY.md) para el registro como servicio con NSSM.

### HTTPS

El portal no debería quedar expuesto por HTTP: el token viaja en cada petición.
La configuración de nginx en `deploy/nginx.conf.example` incluye el proxy inverso
y las cabeceras de seguridad. El certificado se obtiene gratis:

```bash
sudo certbot --nginx -d portal.midominio.com
```

### Respaldos

```bash
./deploy/backup.sh                 # respaldo a ./backups/
./deploy/backup.sh /ruta/destino   # respaldo a otra ruta
```

Programar con cron (diario a las 3:00):

```
0 3 * * * /ruta/PORTAL_DE_HERRAMIENTAS/deploy/backup.sh >> /var/log/portal-backup.log 2>&1
```

Conserva los últimos 30 respaldos y borra los más antiguos automáticamente.

### Checklist posterior al despliegue

- [ ] El portal carga por HTTPS
- [ ] El login funciona y la sesión se mantiene mientras se usa
- [ ] La contraseña del admin fue cambiada desde Perfil
- [ ] Los usuarios del equipo están creados con sus permisos
- [ ] Los datos están en un volumen (no dentro de la imagen)
- [ ] Hay un respaldo programado de `data` y `uploads`
- [ ] El servicio arranca automáticamente al reiniciar el servidor

### Archivos de despliegue

| Archivo | Para qué |
|---|---|
| `Dockerfile` | Imagen de producción (build multi-etapa) |
| `docker-compose.yml` | Orquestación con volúmenes y healthcheck |
| `.env.example` | Plantilla de configuración del despliegue |
| `ecosystem.config.cjs` | Alternativa sin Docker (PM2) |
| `deploy/DEPLOY.md` | Guía completa paso a paso |
| `deploy/nginx.conf.example` | Proxy inverso con HTTPS |
| `deploy/backup.sh` | Respaldo con retención automática (Linux/macOS) |
| `deploy/windows/build.ps1` | Compila y configura todo en Windows |
| `deploy/windows/instalar-servicio.ps1` | Registra el portal como servicio de Windows |
| `deploy/windows/abrir-firewall.ps1` | Permite el acceso desde la red local |
| `deploy/windows/iniciar-portal.bat` | Arranque manual (para probar) |
| `deploy/windows/backup.ps1` | Respaldo con retención automática (Windows) |
| `deploy/windows/DESPLIEGUE-WINDOWS.md` | Guía completa para Windows |

---

## Solución de problemas

### El backend no arranca: `EADDRINUSE: address already in use :::3001`

Hay otro proceso usando el puerto 3001, generalmente una instancia anterior.

```bash
# Ver qué proceso lo ocupa
netstat -ano | grep ":3001" | grep LISTENING

# Terminarlo (Windows, con el PID del paso anterior)
powershell -Command "Stop-Process -Id <PID> -Force"
```

O cambiar el puerto con `PORT=3002 npm run start:prod`.

### El frontend carga pero no muestra datos

Casi siempre es la URL del backend. Abrir la consola del navegador (F12):
si aparecen errores hacia `localhost:3001`, verificar que el backend esté
corriendo y que el puerto coincida.

### "Demasiados intentos de inicio de sesión"

El rate limiting bloqueó la IP tras 5 intentos fallidos en un minuto. Esperar
el tiempo indicado. Para desarrollo se puede subir el límite en `backend/.env`:

```
LOGIN_MAX_INTENTOS=100
```

### Me saca al login aunque esté usando el portal

El token dura 3 minutos sin actividad. Si ocurre **mientras** interactuás,
verificar la hora del sistema: la expiración se calcula comparando fechas.
Revisar también `TOKEN_TTL`.

### El modal no entra en pantalla en el celular

Los modales son responsivos. Si el problema persiste, verificar que no haya
estilos personalizados sobrescribiendo las reglas móviles.

### No sé la contraseña del usuario admin

Si `usuarios.json` se regeneró, la contraseña se mostró una vez en la consola.
Si se perdió:

```bash
# Detener el backend, borrar el archivo y reiniciar
rm backend/data/usuarios.json
# Al arrancar se crea un admin nuevo con contraseña aleatoria visible en consola
```

> Esto elimina **todos** los usuarios. Si solo querés recuperar el admin,
> respaldá el archivo antes.

### El empaquetado de Electron falla

Verificar que no haya otro backend corriendo en el puerto 3001, y que
`frontend/dist/` exista (correr `npm run build:frontend` primero).

---

## Pendientes conocidos

| Pendiente | Impacto | Nota |
|---|---|---|
| CI/CD | Medio | Los 77 tests se corren manualmente. Automatizarlos con GitHub Actions |
| Migración a base de datos | Medio | Los JSON no soportan escrituras concurrentes sin bloqueo |
| Tests del backend | Bajo | Solo existe el test de ejemplo de NestJS |
| `NOMBRES_ACCION` | Bajo | Si el backend agrega nuevas acciones, hay que sumarlas a la traducción en `Logs.tsx` |
| Empaquetado multiplataforma | Bajo | El instalador configurado es solo para Windows |

---

## Créditos

Desarrollado para uso general en equipos de soporte, desarrollo y operaciones.

Stack: NestJS · React · TypeScript · Vite · Electron
