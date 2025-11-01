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
