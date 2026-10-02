# ============================================================
# Portal de Herramientas - Imagen de produccion
# ============================================================
# Build multi-etapa: compila el frontend y el backend por separado,
# y la imagen final solo lleva lo necesario para ejecutar.
#
# Usa Node 24 para que la version de npm coincida con la del entorno de
# desarrollo (el package-lock.json se genera con npm 11; con npm 10 el
# 'npm ci' falla al detectar el arbol de dependencias desincronizado).
#
# Build:
#   docker build -t portal-herramientas .
#
# Run:
#   docker run -d --name portal -p 3001:3001 \
#     -e JWT_SECRET="<secreto-de-32+>" \
#     -v portal-data:/app/backend/data \
#     -v portal-uploads:/app/backend/uploads \
#     portal-herramientas
# ============================================================

# ---------- Etapa 1: dependencias del backend ----------
FROM node:24-alpine AS deps-backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

# ---------- Etapa 2: compilar el backend ----------
FROM deps-backend AS build-backend
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ---------- Etapa 3: dependencias y build del frontend ----------
FROM node:24-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Las suites E2E no hacen falta en la imagen
RUN rm -rf tests
RUN npm run build

# ---------- Etapa 4: imagen final ----------
FROM node:24-alpine AS runtime

# dumb-init para manejar correctamente las senales (Ctrl+C, docker stop)
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    PORT=3001

WORKDIR /app

# Backend ya compilado con sus dependencias de produccion
COPY --from=build-backend /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/dist ./backend/dist
COPY --from=build-backend /app/backend/package.json ./backend/package.json

# Datos semilla y plantilla de usuarios (los volumenes los sobreescriben)
COPY backend/data ./backend/data

# Frontend compilado (el backend lo sirve como estatico)
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Directorio de subidas (se monta como volumen en produccion)
RUN mkdir -p backend/uploads/avatars && \
    chown -R node:node /app

# Ejecutar como usuario sin privilegios
USER node

EXPOSE 3001

# El backend sirve la API y el frontend en el mismo puerto
WORKDIR /app/backend
CMD ["dumb-init", "node", "dist/main"]
