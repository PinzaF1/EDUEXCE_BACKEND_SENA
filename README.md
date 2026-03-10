# 🎓 EduExce Backend - Sistema de Gestión Educativa

Backend API para la plataforma EduExce SENA, construido con AdonisJS v6, PostgreSQL y OpenAI SDK para generación inteligente de preguntas.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Deploy](#-deploy)
- [API Endpoints](#-api-endpoints)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Variables de Entorno](#-variables-de-entorno)
- [Testing](#-testing)
- [Contribución](#-contribución)

---

## ✨ Características

### 🎯 Core Features
- **Autenticación JWT** con roles (Administrador, Estudiante)
- **Gestión de Usuarios** por instituciones educativas
- **Generación de Preguntas con IA** usando OpenAI GPT-4o-mini
- **Sistema de Niveles y Progreso** gamificado
- **Test de Estilos de Aprendizaje** (Kolb)
- **Notificaciones Push** con Firebase Cloud Messaging
- **Sistema de Retos** entre estudiantes
- **Simulacros ICFES** personalizados
- **Dashboard Administrativo** con métricas en tiempo real

### 🤖 Inteligencia Artificial
- **OpenAI SDK Directo**: Generación de preguntas adaptadas por área y nivel
- **Fallback Automático**: Banco local de preguntas si OpenAI no disponible
- **Adaptación por Estilo de Aprendizaje**: Preguntas personalizadas según Kolb
- **Timeout Configurable**: 20 segundos por request
- **Modelo Optimizado**: `gpt-4o-mini` (balance costo/rendimiento)

### 📊 Sistema de Notificaciones
- **Detección Automática**: Áreas críticas, estudiantes en alerta, inactividad
- **Cron Jobs**: Tareas programadas para análisis periódico
- **Redis Pub/Sub**: Notificaciones en tiempo real
- **Firebase Push**: Notificaciones móviles multiplataforma

---

## 🛠️ Stack Tecnológico

### Backend Framework
- **AdonisJS v6** - Framework Node.js moderno y elegante
- **TypeScript** - Tipado estático para mayor robustez
- **Node.js v20** - Runtime JavaScript

### Base de Datos
- **PostgreSQL** - Base de datos relacional principal
- **Lucid ORM** - ORM integrado de AdonisJS
- **Supabase** - PostgreSQL como servicio (conexión pooler)

### Cache & Messaging
- **Redis v7** - Cache y pub/sub para notificaciones
- **ioredis** - Cliente Redis para Node.js

### Inteligencia Artificial
- **OpenAI SDK** - Generación de preguntas con GPT-4o-mini
- **Axios** - Cliente HTTP para API externa (fallback Python)

### Autenticación & Seguridad
- **JWT (jsonwebtoken)** - Tokens de autenticación
- **bcrypt** - Hash de contraseñas
- **phc-argon2** - Hashing alternativo

### Push Notifications
- **Firebase Admin SDK** - Gestión de notificaciones push
- **FCM (Firebase Cloud Messaging)** - Envío multiplataforma

### Deployment
- **Docker & Docker Compose** - Contenedorización
- **Nginx** - Proxy inverso y SSL/TLS
- **EC2 (AWS)** - Servidor de producción
- **DDNS (No-IP)** - Dominio dinámico

### Development Tools
- **ESLint** - Linter de código
- **Prettier** - Formateador de código
- **Japa** - Framework de testing
- **hot-hook** - Hot Module Replacement
- **pino-pretty** - Pretty logging

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                        │
│           https://senaeduexcel.vercel.app                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (CORS habilitado)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   NGINX REVERSE PROXY                        │
│           https://eduexce-backend.ddns.net                   │
│                    (SSL/TLS - Port 443)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   DOCKER COMPOSE (EC2)                       │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  zavira-api   │  │ zavira-redis │  │  eduexce-ngrok  │  │
│  │   Port 3333   │  │   Port 6379  │  │   Port 4040     │  │
│  └───────┬───────┘  └──────┬───────┘  └─────────────────┘  │
└──────────┼──────────────────┼──────────────────────────────┘
           │                  │
           ▼                  ▼
    ┌──────────────┐   ┌──────────────┐
    │  PostgreSQL  │   │    Redis     │
    │  (Supabase)  │   │   (Cache)    │
    └──────────────┘   └──────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │  Servicios Externos              │
    │  • OpenAI API (GPT-4o-mini)      │
    │  • Firebase Cloud Messaging      │
    │  • SMTP (Brevo)                  │
    └──────────────────────────────────┘
```

---

## 📦 Requisitos Previos

- **Node.js** v20 o superior
- **Docker** v24 o superior
- **Docker Compose** v2.20 o superior
- **PostgreSQL** v14 o superior (o cuenta Supabase)
- **Redis** v7 o superior (o contenedor Docker)
- **Git** para clonar el repositorio

### Cuentas de Servicios Externos (Opcional)
- **OpenAI API Key** para generación de preguntas
- **Firebase Project** para notificaciones push
- **Cuenta SMTP** (Brevo, Mailtrap, etc.) para emails

---

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA.git
cd EDUEXCE_BACKEND_SENA
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env  # o tu editor preferido
```

### 4. Configurar Firebase (Opcional)

```bash
# Copiar ejemplo de configuración
cp config/firebase-admin-sdk.example.json config/firebase-admin-sdk.json

# Agregar tus credenciales de Firebase Admin SDK
nano config/firebase-admin-sdk.json
```

---

## ⚙️ Configuración

### Variables de Entorno Principales

```env
# === ENVIRONMENT ===
NODE_ENV=development
PORT=3333
HOST=localhost
APP_KEY=tu_app_key_segura

# === DATABASE (Supabase) ===
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_DATABASE=postgres

# === JWT & SEGURIDAD ===
JWT_SECRET=tu_jwt_secret_seguro
JWT_RECOVERY_EXPIRES=900

# === OPENAI (IA) ===
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=20000
USE_OPENAI_DIRECT=true

# === REDIS ===
REDIS_URL=redis://localhost:6379

# === SMTP ===
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=tu_usuario
SMTP_PASS=tu_password
SMTP_FROM=noreply@tudominio.com

# === CORS ===
CORS_ORIGIN=http://localhost:5173,https://senaeduexcel.vercel.app

# === FRONTEND URL ===
FRONT_URL=http://localhost:5173
```

Ver sección [Variables de Entorno](#-variables-de-entorno) para lista completa.

---

## 🎮 Ejecución

### Desarrollo Local

#### Opción 1: Con Docker Compose (Recomendado)

```bash
# Levantar todos los servicios
docker compose up -d

# Ver logs
docker compose logs -f api

# Verificar estado
docker compose ps

# Health check
curl http://localhost:3333/health
```

#### Opción 2: Modo Desarrollo Nativo

```bash
# Asegúrate de tener PostgreSQL y Redis corriendo

# Ejecutar migraciones
node ace migration:run

# Ejecutar seeders (opcional)
node ace db:seed

# Modo desarrollo con HMR
npm run dev

# O sin HMR
npm start
```

### Testing

```bash
# Todos los tests
npm test

# Solo tests unitarios
npm run test:unit

# Solo tests funcionales
npm run test:functional

# Tests con cobertura
npm run test:coverage

# Modo watch
npm run test:watch
```

### Build de Producción

```bash
# Compilar TypeScript
npm run build

# Ejecutar build
cd build
npm ci --omit=dev
node bin/server.js
```

---

## 🚢 Deploy

### Deploy a EC2 (Producción)

#### Requisitos Previos
- Instancia EC2 (Ubuntu 22.04 LTS)
- Docker y Docker Compose instalados
- Nginx configurado como proxy inverso
- Dominio apuntando a la IP de EC2

#### Pasos de Deploy

```bash
# 1. Conectar a EC2
ssh ubuntu@44.211.73.227
# O con dominio:
ssh ubuntu@eduexce-backend.ddns.net

# 2. Ir al directorio del proyecto
cd ~/EDUEXCE_BACKEND_SENA

# 3. Actualizar código
git fetch origin
git pull origin fix-deploy-EC2

# 4. Rebuild y restart
docker compose down
docker compose build --no-cache api
docker compose up -d

# 5. Verificar
docker compose ps
docker compose logs api --tail=20
curl http://localhost:3333/health
```

#### Script Automatizado (desde Windows)

```powershell
# Hacer commit de cambios
git add .
git commit -m "feat: tus cambios"
git push origin fix-deploy-EC2

# Conectar y deploy
ssh -i "C:\Users\bryan\Downloads\key-adonisJS.pem" ubuntu@44.211.73.227
cd ~/EDUEXCE_BACKEND_SENA
git pull origin fix-deploy-EC2
docker compose down
docker compose build --no-cache api
docker compose up -d
```

### Configuración Nginx

```nginx
server {
    listen 80;
    server_name eduexce-backend.ddns.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name eduexce-backend.ddns.net;

    ssl_certificate /etc/letsencrypt/live/eduexce-backend.ddns.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eduexce-backend.ddns.net/privkey.pem;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔌 API Endpoints

### Health & Status

```http
GET /health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T18:57:03.176+00:00",
  "environment": "production",
  "uptime": 5.125508019,
  "memory": { "used": 46, "total": 74 }
}
```

### Autenticación

#### Login Administrador
```http
POST /auth/admin/login
Content-Type: application/json

{
  "correo": "admin@ejemplo.com",
  "password": "password123"
}
```

#### Login Estudiante
```http
POST /auth/estudiante/login
Content-Type: application/json

{
  "correo": "estudiante@ejemplo.com",
  "password": "password123"
}
```

### Administración

#### Listar Notificaciones
```http
GET /admin/notificaciones
Authorization: Bearer {token}
```

#### Eliminar Notificación
```http
DELETE /admin/notificaciones/:id
Authorization: Bearer {token}
```

#### Dashboard
```http
GET /admin/dashboard
Authorization: Bearer {token}
```

### Móvil (Estudiantes)

#### Crear Sesión/Parada
```http
POST /sesion/parada
Authorization: Bearer {token}
Content-Type: application/json

{
  "area": "Matemáticas",
  "subtema": "Álgebra básica",
  "nivel": 1
}
```

#### Cerrar Sesión
```http
POST /sesion/cerrar
Authorization: Bearer {token}
Content-Type: application/json

{
  "id_sesion": 123,
  "resultados": [...]
}
```

#### Test de Kolb
```http
POST /quizz/responder
Authorization: Bearer {token}
Content-Type: application/json

{
  "respuestas": [...]
}
```

### Documentación Completa

Ver archivo `docs/API.md` para documentación completa de endpoints.

---

## 📁 Estructura del Proyecto

```
EDUEXCE_BACKEND_SENA/
├── app/
│   ├── controller/           # Controladores HTTP
│   │   ├── admin_controller.ts
│   │   ├── auth_controller.ts
│   │   ├── movil_controller.ts
│   │   └── ...
│   ├── middleware/           # Middlewares
│   │   ├── only_rol.ts       # Autorización por rol
│   │   ├── audit_logger_middleware.ts
│   │   └── ...
│   ├── models/               # Modelos Lucid ORM
│   │   ├── usuario.ts
│   │   ├── sesione.ts
│   │   ├── notificacione.ts
│   │   └── ...
│   └── services/             # Lógica de negocio
│       ├── auth_service.ts
│       ├── ia_preguntas_service.ts
│       ├── sesiones_service.ts
│       ├── notificaciones_service.ts
│       ├── fcm_service.ts
│       └── ...
├── config/                   # Configuración
│   ├── app.ts
│   ├── cors.ts
│   ├── database.ts
│   ├── firebase-admin-sdk.json
│   └── ...
├── database/
│   ├── migrations/           # Migraciones de BD
│   └── seeders/              # Datos de prueba
├── start/
│   ├── routes.ts             # Definición de rutas
│   ├── kernel.ts             # Middlewares globales
│   ├── cron.ts               # Tareas programadas
│   └── env.ts                # Validación de env vars
├── tests/                    # Tests automatizados
│   ├── functional/
│   └── unit/
├── deploy/                   # Scripts de deploy
│   ├── deploy.sh
│   ├── nginx-config.conf
│   └── ...
├── docker-compose.yml        # Orquestación Docker
├── Dockerfile                # Imagen Docker
├── .env.production           # Variables producción
└── package.json
```

---

## 🔐 Variables de Entorno

### Completas

```env
# === ENVIRONMENT ===
TZ=UTC
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=info
APP_KEY=tu_app_key_64_caracteres
NODE_ENV=production

# === DATABASE - Supabase Direct ===
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password_seguro
DB_DATABASE=postgres

# === DATABASE - Supabase Pooler (opcional) ===
# DB_HOST=aws-0-us-east-2.pooler.supabase.com
# DB_PORT=6543

# === JWT & SEGURIDAD ===
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_RECOVERY_EXPIRES=900

# === OPENAI (IA GENERATIVA) ===
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=20000
USE_OPENAI_DIRECT=true

# === REDIS ===
REDIS_URL=redis://redis:6379

# === SMTP - Brevo ===
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu_usuario
SMTP_PASS=tu_password
SMTP_FROM=noreply@tudominio.com

# === CORS ===
CORS_ORIGIN=http://localhost:5173,https://senaeduexcel.vercel.app

# === FRONTEND URL ===
FRONT_URL=https://senaeduexcel.vercel.app

# === FIREBASE (archivo JSON separado) ===
FIREBASE_SERVICE_ACCOUNT=config/firebase-admin-sdk.json

# === DEBUG (opcional) ===
ALLOW_DEBUG_NOTIFICATIONS=true
DB_DEBUG=false
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests unitarios
npm run test:unit

# Tests funcionales (requiere BD de test)
npm run test:functional

# Con cobertura
npm run test:coverage

# Modo watch
npm run test:watch

# Debug mode
npm run test:debug
```

### Configuración de Tests

Los tests usan una base de datos SQLite en memoria por defecto:

```typescript
// tests/bootstrap.ts
import { defineConfig } from '@japa/runner'

export default defineConfig({
  files: ['tests/**/*.spec.ts'],
  timeout: 30000,
})
```

---

## 🤝 Contribución

### Flujo de Trabajo

1. **Fork** el repositorio
2. Crea una **rama** para tu feature: `git checkout -b feature/mi-feature`
3. **Commit** tus cambios: `git commit -m 'feat: agregar nueva funcionalidad'`
4. **Push** a tu rama: `git push origin feature/mi-feature`
5. Abre un **Pull Request**

### Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `docs:` Cambios en documentación
- `style:` Formato de código (sin cambios funcionales)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

### Code Style

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run typecheck
```

---

## 📞 Soporte

### Contacto

- **Equipo:** Backend EduExce SENA
- **Email:** soporte@eduexce.com
- **Repository:** [GitHub](https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA)

### Issues

Para reportar bugs o solicitar features:
1. Ir a [Issues](https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA/issues)
2. Crear nuevo issue con template apropiado
3. Incluir detalles: pasos para reproducir, logs, screenshots

---

## 📄 Licencia

Este proyecto es **privado** y de uso exclusivo para EduExce SENA.

---

## 🎯 Roadmap

### ✅ Completado (v1.0)
- [x] Sistema de autenticación JWT
- [x] Gestión de usuarios por instituciones
- [x] Generación de preguntas con OpenAI
- [x] Sistema de niveles y progreso
- [x] Test de estilos de aprendizaje Kolb
- [x] Notificaciones push con Firebase
- [x] Dashboard administrativo
- [x] Deploy a EC2 con Docker

### 🚧 En Progreso (v1.1)
- [ ] Mejora de sistema de cache con Redis
- [ ] Optimización de queries de base de datos
- [ ] Tests E2E completos
- [ ] Documentación API con Swagger

### 📋 Planificado (v2.0)
- [ ] Sistema de gamificación avanzado
- [ ] Análisis predictivo con ML
- [ ] Reportes exportables (PDF/Excel)
- [ ] Integración con sistemas académicos externos
- [ ] Multi-tenancy mejorado

---

## 🙏 Agradecimientos

- **AdonisJS Team** por el excelente framework
- **OpenAI** por el API de generación de texto
- **Firebase** por el sistema de notificaciones
- **Supabase** por el hosting de PostgreSQL
- **Comunidad SENA** por el apoyo y feedback

---

**Desarrollado con ❤️ por el equipo Backend de EduExce SENA**

*Última actualización: Diciembre 3, 2025*
