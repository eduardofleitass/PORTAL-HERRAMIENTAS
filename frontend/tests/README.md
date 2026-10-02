# Tests de regresion - Portal de Herramientas

Suite de tests E2E con Playwright que valida los cambios recientes del portal.

## Prerequisitos

1. Backend corriendo en el puerto **3001**
2. Frontend corriendo en el puerto **5174** (no 5173, ese es el visor de tickets)

## Scripts

### `regression-test.cjs` — Suite principal (31 checks)

```bash
node regression-test.cjs
```

Cubre:
- **Autenticacion**: login admin, token en localStorage, permisos cargados, JWT expira en 180s, login fallido rechazado
- **Permisos backend**: 401 sin token, 401 con token invalido, 200 con admin
- **Botones PDF/CSV**: PDF presente y CSV eliminado en Procedimientos/Errores/Documentacion
- **Exportar PDF**: abre popup, incluye titulo, pasos numerados, metadatos, contenido sustancial
- **Sidebar mobile**: oculto al inicio, hamburger visible, abre/cierra, overlay, cierre al navegar
- **Responsive**: sin overflow horizontal en 1440/820/390/320 px
- **Sin errores JS** en las 7 paginas

### `regression-permisos.cjs` — Permisos granulares (15 checks)

```bash
node regression-permisos.cjs
```

Crea un usuario temporal `test_regresion` con permisos especificos, valida el flujo completo, y restaura `usuarios.json` al terminar.

Cubre:
- Sidebar respeta `permisos.modulos` (oculta Documentacion/Actividad/Usuarios)
- Rutas protegidas redirigen (`/usuarios`)
- Botones de accion segun `permisos.acciones` (crear visible, PDF oculto)
- Backend permite POST/PATCH/DELETE con `crear/editar/eliminar=true`
- Backend rechaza (403) modulos sin permiso: `/logs`, `/documentacion`

### `responsive-audit.cjs` — Auditoria de layout

```bash
node responsive-audit.cjs
```

Recorre 7 pantallas x 4 viewports (1440 / 820 / 390 / 320 px), detecta overflow
horizontal y genera capturas en `responsive-audit/`.

### `light-audit.cjs` — Capturas en modo claro

```bash
node light-audit.cjs
```

Recorre las 7 pantallas forzando el tema claro y genera capturas en
`light-audit/`, util para revisar contrastes y legibilidad.


### `regression-sesion.cjs` — Sesion deslizante (13 checks)

```bash
node regression-sesion.cjs
```

Valida el comportamiento de expiracion de sesion por inactividad.

Cubre:
- **API /auth/refresh**: funciona con token valido, 401 sin token, 401 con token invalido, extiende el `exp`
- **Actividad continua > 3 min**: NO expulsa navegando por modulos; el token se renueva
- **Inactividad real >= 3 min**: SI expulsa con mensaje de inactividad
- **Actividad reciente (30s)**: NO expulsa

**Duracion: ~5 min** (incluye una espera real de 3+ min de navegacion simulada).

---

## Modelo de sesion

El portal usa **sesion deslizante** (sliding session), no un tope fijo:

| Mecanismo | Valor | Que hace |
|---|---|---|
| `INACTIVIDAD_MS` | 3 min | Cierra sesion si no hay actividad en NINGUNA pestana |
| `RENOVACION_MS` | 1 min | Renueva el JWT mientras haya actividad |
| `TOKEN_TTL` (backend) | 3 min | Ventana del token; se renueva con la actividad |

La actividad se registra en `localStorage` (`portal-ultima-actividad`), asi que
varias pestanas comparten el mismo estado: usar una mantiene vivas las demas.

**Importante:** mientras el usuario interactue, la sesion NO expira. Solo expira
tras 3 minutos reales sin ninguna interaccion (mouse, teclado, scroll, touch).


### `diagnostico-layout.cjs` — Centrado del contenido

```bash
PORTAL_USER=admin PORTAL_PASS=tucontrasena node diagnostico-layout.cjs
```

Recorre las 7 páginas y mide el contenedor raíz de cada una con el sidebar
abierto y colapsado. Reporta si el contenido queda centrado (izquierda y derecha
equilibradas) y falla con exit code 1 si alguna página queda descentrada.

Útil tras tocar el layout: detecta en segundos lo que a ojo cuesta ver.

### `regression-buscador.cjs` — Buscador global (9 checks)

```bash
node regression-buscador.cjs
```

Valida que el buscador global (Ctrl+K) no expulse la sesion.

Cubre:
- El buscador abre y acepta texto
- Las 3 peticiones que hace (`/documentacion`, `/errores`, `/procedimientos`)
  llevan el header `Authorization`
- Ninguna devuelve 401
- **La sesion sigue viva despues de buscar** (el bug reportado)
- El buscador devuelve resultados
- Sin 401 inesperados que disparen el cierre de sesion

**Contexto**: `SearchModal` hacia los fetch sin el token. Como esos endpoints
estan protegidos con `AuthGuard` + `ModuloGuard`, respondian 401 y
`SessionInterceptor` lo interpretaba como sesion expirada, echando al usuario al
login. Se veia como "me desconecta por inactividad al buscar".

### `regression-logs-filtros.cjs` — Filtros clickeables de Actividad (18 checks)

```bash
node regression-logs-filtros.cjs
```

Valida los filtros interactivos de la pagina Actividad.

Cubre:
- Las 5 tarjetas de nivel son `<button>` clickeables
- Click en una tarjeta filtra la tabla por ese nivel
- Click en la misma tarjeta quita el filtro
- La tarjeta queda marcada visualmente como activa
- El `<select>` de nivel se sincroniza con el click
- Los chips de actividad filtran por tipo de accion
- Indicador "(filtrando: X)" aparece
- Boton "Limpiar filtros" restaura el total

---

## Modulo Actividad: filtros interactivos

Los contadores de nivel y los chips de tipo de actividad son **clickeables**:

| Elemento | Accion |
|---|---|
| Tarjeta "Registros" | Quita el filtro de nivel (ver todo) |
| Tarjeta Info/Exito/Advertencias/Errores | Filtra solo ese nivel; click de nuevo lo quita |
| Chip de actividad | Filtra solo ese tipo de accion; click de nuevo lo quita |
| Boton "Limpiar filtros" | Resetea nivel + accion + busqueda |

Los conteos de las tarjetas se recalculan segun el filtro de accion/busqueda activo,
asi que siempre reflejan cuantos registros hay disponibles para filtrar.

## Interpretacion

Cada check imprime `PASS` o `FAIL`. Al final hay un resumen:

```
TOTAL: 31 | PASS: 31 | FAIL: 0
```

Exit code 0 = todo pasa, 1 = hay fallos (utile para CI).

## Credenciales de los tests

Las suites leen el usuario y la contrasena de variables de entorno, porque la
contrasena del admin se define en el despliegue y ya no es `admin`/`admin`:

| Variable | Por defecto | Descripcion |
|---|---|---|
| `PORTAL_USER` | `admin` | Usuario para los tests |
| `PORTAL_PASS` | valor de `PORTAL_USER` | Contrasena (si difiere del usuario) |
| `BASE` | segun la suite | URL a probar (`http://localhost:5174` en dev, `http://localhost:3001` en produccion) |

```bash
# Desarrollo (Vite en 5174)
PORTAL_USER=admin PORTAL_PASS=tucontrasena node regression-test.cjs

# Produccion (backend sirviendo el frontend en 3001)
BASE=http://localhost:3001 PORTAL_USER=admin PORTAL_PASS=tucontrasena node regression-buscador.cjs
```

**Ojo con el rate limiting**: cada suite hace varios logins y el backend permite 5
por minuto por IP. Correr varias suites seguidas puede dar `429`. Ver la nota de
abajo para subir el limite mientras se testea.

## Notas

- **Rate limiting:** el backend limita a 5 intentos de login por IP por minuto.
  Las suites hacen muchos logins, asi que los helpers `login()` esperan y
  reintentan cuando reciben un 429. Para correr todo seguido sin demoras se
  puede subir el limite en `backend/.env`:

  ```
  LOGIN_MAX_INTENTOS=100
  ```

- **Credenciales de prueba:** `admin` / `admin` en el entorno local. Si
  `usuarios.json` se regenero, la contrasena es la aleatoria que se mostro
  una vez en la consola del backend.

- Los tests crean y borran datos temporales, y restauran el estado original
  (por ejemplo `regression-permisos` hace respaldo de `usuarios.json`).

- **Duracion total:** ~15 min. `regression-sesion` sola tarda ~5 min porque
  espera mas de 3 minutos reales para verificar la expiracion por inactividad.

- `regression-logs-filtros` y `regression-sesion` necesitan que el backend
  tenga datos de actividad; con una base vacia algunos checks se saltan.
