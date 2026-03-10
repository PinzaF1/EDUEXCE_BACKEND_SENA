# ---------- Dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev

# ---------- Build ----------  
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Adonis: compila a ./build
RUN npm run build

# ---------- Production ----------
FROM node:20-alpine AS runner
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar aplicación compilada
COPY --from=build /app/build ./build

# Seguridad: no copiar archivos sensibles al contenedor
# firebase-admin-sdk.json se monta como volumen en docker-compose

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S adonisjs -u 1001
USER adonisjs

EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3333/health || exit 1

# Iniciar servidor AdonisJS
CMD ["node", "build/bin/server.js"]
