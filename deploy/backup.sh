#!/usr/bin/env bash
# ============================================================
# Portal de Herramientas - Respaldo de datos
# ============================================================
# Respalda los datos y las subidas. Funciona con Docker Compose
# (volumenes) o con una instalacion directa (carpetas).
#
# Uso:
#   ./deploy/backup.sh                 # respaldo a ./backups/
#   ./deploy/backup.sh /ruta/destino   # respaldo a otra ruta
#
# Programar con cron (todos los dias a las 3:00):
#   0 3 * * * /ruta/PORTAL_DE_HERRAMIENTAS/deploy/backup.sh >> /var/log/portal-backup.log 2>&1
#
# Retencion: conserva los ultimos 30 respaldos y borra los mas antiguos.
# ============================================================

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="${1:-$RAIZ/backups}"
FECHA="$(date +%Y%m%d-%H%M%S)"
RETENCION=30

mkdir -p "$DESTINO"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando respaldo"

# ---------- Detectar el modo de despliegue ----------
if docker volume inspect portal-data >/dev/null 2>&1; then
  MODO="docker"
  echo "  Modo: Docker Compose (volumenes)"
else
  MODO="directo"
  echo "  Modo: instalacion directa (carpetas)"
fi

# ---------- Respaldar ----------
if [ "$MODO" = "docker" ]; then
  docker run --rm \
    -v portal-data:/data:ro \
    -v "$DESTINO":/backup \
    alpine tar czf "/backup/data-$FECHA.tar.gz" -C /data .

  docker run --rm \
    -v portal-uploads:/uploads:ro \
    -v "$DESTINO":/backup \
    alpine tar czf "/backup/uploads-$FECHA.tar.gz" -C /uploads .

  echo "  data-$FECHA.tar.gz"
  echo "  uploads-$FECHA.tar.gz"
else
  if [ ! -d "$RAIZ/backend/data" ]; then
    echo "ERROR: no se encuentra $RAIZ/backend/data" >&2
    exit 1
  fi

  tar czf "$DESTINO/data-$FECHA.tar.gz" -C "$RAIZ/backend" data

  if [ -d "$RAIZ/backend/uploads" ]; then
    tar czf "$DESTINO/uploads-$FECHA.tar.gz" -C "$RAIZ/backend" uploads
  fi

  echo "  data-$FECHA.tar.gz"
  [ -d "$RAIZ/backend/uploads" ] && echo "  uploads-$FECHA.tar.gz"
fi

# ---------- Aplicar retencion ----------
echo "  Aplicando retencion (ultimos $RETENCION por tipo)"
for patron in "data-*.tar.gz" "uploads-*.tar.gz"; do
  # shellcheck disable=SC2012
  ANTIGUOS=$(ls -1t "$DESTINO"/$patron 2>/dev/null | tail -n +$((RETENCION + 1)) || true)
  if [ -n "$ANTIGUOS" ]; then
    echo "$ANTIGUOS" | while read -r f; do
      rm -f "$f"
      echo "    eliminado: $(basename "$f")"
    done
  fi
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo completado en $DESTINO"
