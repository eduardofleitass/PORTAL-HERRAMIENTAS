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
