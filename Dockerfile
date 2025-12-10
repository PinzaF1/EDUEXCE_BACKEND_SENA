FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
# Copy built app
COPY --from=builder /app/build ./build
# Do NOT copy service account into image; mount it at runtime for security.
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget --quiet --tries=1 --spider http://localhost:3333/health || exit 1
CMD ["node", "build/bin/server.js"]
# depspliegue
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Adonis: compila a ./build
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

# Vars 
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Copiamos node_modules y el build ya listo
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/build        ./build

# IMPORTANTE: Docker Compose carga .env.production vía env_file
# No es necesario copiarlo manualmente al contenedor

EXPOSE 3333
# OJO: Adonis arranca aquí
CMD ["node","build/bin/server.js"]
