# Auditoria de responsive

Scripts para auditar el layout responsive del portal con Playwright.

## Uso

1. Asegurate de que backend (puerto 3001) y frontend (puerto 5174) esten corriendo.
2. Ejecutar:

```bash
cd frontend
node responsive-audit.cjs
```

## Que hace

- Recorre 4 viewports: desktop (1440x900), tablet (820x1180), mobile (390x844), mobile-sm (320x568)
- Hace login como admin y visita las 8 pantallas del portal
- Detecta overflow horizontal (scrollWidth > clientWidth)
- Genera screenshots full-page en `responsive-audit/`

## Salida

- `responsive-audit/report.json` — datos de overflow por viewport/pantalla
- `responsive-audit/<viewport>-<pantalla>.png` — screenshots

## Notas

- El frontend del portal corre en el puerto **5174** (no 5173, que es el visor de tickets).
- Si cambia el puerto, ajustar la constante `BASE` en el script.
- Credenciales de prueba: admin / admin (entorno de desarrollo local).
