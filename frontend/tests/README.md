# Tests de regresion - Portal de Herramientas EPEM

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

Recorre 8 pantallas x 4 viewports, detecta overflow horizontal y genera screenshots en `responsive-audit/`.


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

## Notas

- Credenciales de prueba: `admin` / `admin` (solo entorno local de desarrollo).
- Los tests crean/borran datos temporales y restauran el estado original.
- Duracion aproximada: regression-test ~2-3 min, regression-permisos ~1 min.
