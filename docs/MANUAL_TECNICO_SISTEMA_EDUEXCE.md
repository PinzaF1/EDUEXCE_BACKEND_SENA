# Manual Técnico para Proyectos de Software

## Sistema de Gestión Educativa EduExce SENA

**Fecha:** 10 de diciembre de 2025

---

## HOJA DE CONTROL

| Campo | Valor |
|-------|--------|
| **Empresa / Organización** | SENA - Servicio Nacional de Aprendizaje |
| **Proyecto** | Sistema de Gestión Educativa EduExce |
| **Entregable** | Manual técnico |
| **Autores** | [Nombres del equipo de desarrollo] |
| **Versión/Edición** | 1.0 | **Fecha Versión** | 10/12/2025 |
| **Aprobado por** | [Instructor/Tutor] | **Fecha Aprobación** | [dd/mm/aaaa] |
| | | **Nº Total de Páginas** | [Número total] |

---

## REGISTRO DE CAMBIOS

| Versión | Causa del Cambio | Responsable del Cambio | Fecha del Cambio |
|---------|------------------|------------------------|------------------|
| 1.0 | Creación inicial del manual | Equipo de desarrollo | 10/12/2025 |
| | | | |
| | | | |

---

## CONTENIDO

1. [Introducción](#introducción)
2. [Objetivo](#1-objetivo)
3. [Descripción General del Proyecto](#2-descripción-general-del-proyecto)
4. [Arquitectura del sistema](#3-arquitectura-del-sistema)
5. [Herramientas utilizadas para el desarrollo](#4-herramientas-utilizadas-para-el-desarrollo)
6. [Instalación y configuración](#5-instalación-y-configuración)
7. [Base de datos](#6-base-de-datos)
8. [Desarrollo del Software](#7-desarrollo-del-software)
9. [Funcionalidades del software](#8-funcionalidades-del-software)
10. [Interfases del sistema](#9-interfases-del-sistema)
11. [Bibliografía](#10-bibliografía)

---

# Introducción

## Propósito del manual
Este documento constituye el manual técnico del Sistema de Gestión Educativa EduExce SENA, proporcionando una guía completa para la instalación, configuración, desarrollo y mantenimiento del sistema. Incluye especificaciones técnicas, arquitectura del sistema y detalles de implementación.

## Audiencia objetivo
Este manual está dirigido a:
- Desarrolladores de software
- Administradores de sistemas
- Personal técnico de TI
- Arquitectos de software
- Ingenieros DevOps

## Estructura del documento
El documento está organizado en 10 secciones principales que cubren desde la descripción general del proyecto hasta los detalles técnicos de implementación, instalación y configuración del sistema completo.

---

# 1. Objetivo

Proporcionar la documentación técnica completa del Sistema de Gestión Educativa EduExce SENA, describiendo la arquitectura, tecnologías, procesos de instalación y configuración necesarios para el despliegue, mantenimiento y desarrollo del sistema que incluye:

- Backend API (AdonisJS)
- Panel Web Administrativo (Framework Frontend)
- Aplicación Móvil Multiplataforma

El objetivo es facilitar la comprensión técnica del sistema para desarrolladores y administradores, asegurando la correcta implementación, mantenimiento y escalabilidad de la plataforma educativa.

---

# 2. Descripción General del Proyecto

## Problema que resuelve

El Sistema EduExce aborda la necesidad de mejorar el rendimiento académico de estudiantes en las áreas del examen ICFES mediante una plataforma tecnológica integral que proporciona:

- **Generación inteligente de preguntas** utilizando IA (OpenAI GPT-4o-mini)
- **Seguimiento personalizado** del progreso académico por estudiante
- **Análisis de estilos de aprendizaje** mediante test de Kolb
- **Notificaciones automáticas** de alertas académicas
- **Métricas institucionales** para toma de decisiones educativas

## Características principales

### Backend API
- API REST construida con AdonisJS v6
- Autenticación JWT con roles (Administrador/Estudiante)
- Integración con OpenAI para generación de preguntas
- Sistema de notificaciones push (Firebase FCM)
- Base de datos PostgreSQL con Supabase

### Panel Web Administrativo
- Dashboard para instituciones educativas
- Gestión de estudiantes y métricas de rendimiento
- Reportes y análisis por áreas ICFES
- Sistema de alertas automáticas
- Seguimiento institucional en tiempo real

### Aplicación Móvil
- Sesiones de estudio interactivas
- Test de estilos de aprendizaje (Kolb)
- Sistema de retos y gamificación
- Rankings y progreso personal
- Notificaciones push personalizadas

## Flujos de trabajo principales

1. **Flujo de Sesión de Estudio:**
   Estudiante → App Móvil → Backend API → OpenAI → Generación de Preguntas → Respuestas → Análisis → Métricas

2. **Flujo de Seguimiento Administrativo:**
   Administrador → Panel Web → Backend API → Base de Datos → Reportes → Alertas Automáticas

3. **Flujo de Notificaciones:**
   Sistema de Cron → Análisis de Datos → Detección de Alertas → Firebase FCM → App Móvil

---

# 3. Arquitectura del sistema

## Patrón Arquitectónico: Cliente-Servidor con Microservicios

El sistema implementa una **arquitectura de capas distribuida** con los siguientes componentes:

### Arquitectura General
```
┌─────────────────────┐    ┌─────────────────────┐
│   APP MÓVIL         │    │   PANEL WEB ADMIN   │
│  (Estudiantes)      │    │   (Instituciones)   │
└──────────┬──────────┘    └──────────┬──────────┘
           │ HTTPS (JWT)              │ HTTPS (JWT)
           └──────────┬─────────────────┘
                      ▼
           ┌─────────────────────┐
           │   NGINX PROXY       │
           │   (SSL/TLS)         │
           └──────────┬──────────┘
                      ▼
           ┌─────────────────────┐
           │   BACKEND API       │
           │   (AdonisJS v6)     │
           └──────────┬──────────┘
                      ▼
    ┌──────────────────┬──────────────────┐
    ▼                  ▼                  ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │   Redis     │ │  Servicios  │
│ (Supabase)  │ │  (Cache)    │ │ Externos    │
└─────────────┘ └─────────────┘ └─────────────┘
                                │ • OpenAI    │
                                │ • Firebase  │
                                │ • SMTP      │
                                └─────────────┘
```

### Capas del Sistema

**1. Capa de Presentación:**
- Aplicación Móvil (Frontend nativo/multiplataforma)
- Panel Web Administrativo (SPA/SSR)

**2. Capa de Servicios:**
- API Gateway (Nginx con reverse proxy)
- Backend API (AdonisJS con servicios especializados)

**3. Capa de Lógica de Negocio:**
- 23 servicios especializados (AuthService, IAService, NotificacionesService, etc.)
- Middlewares de seguridad y auditoría

**4. Capa de Datos:**
- Base de datos principal (PostgreSQL)
- Cache (Redis)
- Almacenamiento de archivos

**5. Capa de Integración:**
- APIs externas (OpenAI, Firebase, SMTP)

### Patrones Implementados
- **MVC (Model-View-Controller)** en el backend
- **Repository Pattern** para acceso a datos
- **Service Layer** para lógica de negocio
- **Observer Pattern** para notificaciones
- **Strategy Pattern** para generación de preguntas (IA + local)

---

# 4. Herramientas utilizadas para el desarrollo

## Backend (AdonisJS)

### Lenguajes y Framework Principal
- **Node.js:** v20.x (Runtime JavaScript)
- **TypeScript:** v5.x (Tipado estático)
- **AdonisJS:** v6.18.0 (Framework backend)

### Base de Datos y ORM
- **PostgreSQL:** v14+ (Base de datos relacional)
- **Lucid ORM:** v21.8.0 (ORM de AdonisJS)
- **Redis:** v7.x (Cache y pub/sub)
- **ioredis:** v5.8.2 (Cliente Redis)

### Autenticación y Seguridad
- **JSON Web Token (JWT):** v9.0.2
- **bcrypt:** v6.0.0 (Hash de contraseñas)
- **argon2:** v0.41.1 (Hash alternativo)

### Inteligencia Artificial y APIs Externas
- **OpenAI SDK:** v6.8.1 (Generación de preguntas)
- **axios:** v1.12.2 (Cliente HTTP)

### Notificaciones y Comunicación
- **Firebase Admin SDK:** v13.5.0
- **nodemailer:** v7.0.6 (Emails)

### Herramientas de Desarrollo
- **ESLint:** v9.26.0 (Linter)
- **Prettier:** v3.5.3 (Formateador)
- **Japa:** v4.2.0 (Testing framework)
- **hot-hook:** v0.4.0 (Hot reload)

## Frontend Web (Panel Admin)

### Framework y Lenguajes
- **[Framework]:** [React/Next.js/Vue/Angular - Especificar según implementación]
- **TypeScript/JavaScript:** [Versión]
- **Build Tool:** [Vite/Webpack/Turbopack - Especificar]

### Librerías de UI y Estilos
- **[UI Framework]:** [Material-UI/Tailwind/Ant Design - Especificar]
- **[Charts Library]:** [Chart.js/Recharts - Especificar]

### Gestión de Estado y HTTP
- **[State Management]:** [Redux/Zustand/Context API - Especificar]
- **[HTTP Client]:** [Axios/Fetch/TanStack Query - Especificar]

## Aplicación Móvil

### Framework Principal
- **[Mobile Framework]:** [React Native/Flutter/Nativo - Especificar]
- **[Language]:** [TypeScript/Dart/Kotlin/Swift - Especificar]

### Navegación y Estado
- **[Navigation]:** [React Navigation/Flutter Navigation - Especificar]
- **[State Management]:** [Redux/Provider/Bloc - Especificar]

### SDKs y Servicios
- **Firebase SDK:** [Versión] (Push notifications)
- **[HTTP Client]:** [Axios/Dio - Especificar]

## DevOps y Deployment

### Contenedorización
- **Docker:** v24+ (Contenedores)
- **Docker Compose:** v2.20+ (Orquestación)

### Servidor Web y Proxy
- **Nginx:** [Versión] (Reverse proxy y SSL)
- **PM2:** [Versión] (Process manager)

### Servicios en la Nube
- **AWS EC2:** t2.micro/t3.small (Servidor de aplicación)
- **Supabase:** (PostgreSQL como servicio)
- **Vercel/Netlify:** (Deploy del frontend)

### Control de Versiones
- **Git:** (Control de versiones)
- **GitHub:** (Repositorio remoto)

---

# 5. Instalación y configuración

## Requisitos del Sistema

### Servidores (Hardware)

**Servidor de Producción (AWS EC2):**
- **CPU:** 2 vCPUs (t3.small recomendado)
- **RAM:** 4 GB mínimo, 8 GB recomendado
- **Almacenamiento:** 30 GB SSD (EBS)
- **Tipo:** Virtualizado (AWS EC2)
- **Red:** 1 Gbps

**Servidor de Desarrollo (Local):**
- **CPU:** 4 cores mínimo
- **RAM:** 8 GB mínimo
- **Almacenamiento:** 20 GB libres
- **Tipo:** Físico o virtualizado

### Software (Sistemas Operativos)

**Servidor de Producción:**
- **OS:** Ubuntu 22.04 LTS o 20.04 LTS
- **Node.js:** v20.x LTS
- **Docker:** v24.0+
- **Docker Compose:** v2.20+
- **Nginx:** v1.18+

**Desarrollo Local:**
- **OS:** Windows 10+, macOS 12+, Ubuntu 20.04+
- **Node.js:** v20.x LTS
- **Git:** v2.30+

### Dependencias (Backend)

**Base de Datos:**
- **PostgreSQL:** v14+ o Supabase Cloud
- **Redis:** v7.x (local o Docker)

**APIs Externas:**
- **OpenAI API Key** (para generación de preguntas)
- **Firebase Project** (para push notifications)
- **SMTP Service** (Brevo, Mailtrap, etc.)

### Navegadores Compatibles (Panel Web)
- **Chrome:** v100+
- **Firefox:** v95+
- **Safari:** v15+
- **Edge:** v100+

### SDKs Móviles
- **Android SDK:** API 21+ (Android 5.0+)
- **iOS:** v13.0+ (si aplica)

## Instalación del Entorno

### 1. Backend (AdonisJS)

```bash
# Clonar repositorio
git clone https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA.git
cd EDUEXCE_BACKEND_SENA

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales necesarias

# Configurar Firebase Admin SDK
cp config/firebase-admin-sdk.example.json config/firebase-admin-sdk.json
# Agregar credenciales de Firebase

# Ejecutar migraciones
node ace migration:run

# Ejecutar seeders
node ace db:seed

# Iniciar en desarrollo
npm run dev
```

### 2. Panel Web Administrativo

```bash
# [Comandos específicos según framework implementado]
git clone [URL_REPO_FRONTEND]
cd [nombre-proyecto-frontend]
npm install
cp .env.example .env.local
# Configurar variables de entorno
npm run dev
```

### 3. Aplicación Móvil

```bash
# [Comandos específicos según framework implementado]
git clone [URL_REPO_MOVIL]
cd [nombre-proyecto-movil]
npm install  # o flutter pub get
# Configurar Firebase (google-services.json, GoogleService-Info.plist)
npm run android  # o npm run ios
```

### 4. Deployment con Docker

```bash
# En el servidor de producción
git clone https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA.git
cd EDUEXCE_BACKEND_SENA

# Configurar variables de producción
cp .env.production.example .env.production

# Construir y ejecutar con Docker Compose
docker-compose up -d

# Verificar estado de contenedores
docker-compose ps
```

## Configuración de Servicios

### Variables de Entorno Críticas

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/eduexce
REDIS_CONNECTION=redis://localhost:6379

# APIs externas
OPENAI_API_KEY=sk-...
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=eduexce-sena

# Servidor
PORT=3333
HOST=0.0.0.0
APP_KEY=clave_segura_64_caracteres
NODE_ENV=production

# CORS
CORS_ORIGIN=https://admin.eduexce.com
```

### Configuración de Nginx

```nginx
server {
    listen 443 ssl;
    server_name eduexce-backend.ddns.net;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

# 6. Base de datos

## Modelo Relacional (PostgreSQL)

El sistema utiliza una base de datos **relacional PostgreSQL** con las siguientes características:

### Estructura de Tablas Principales

**Usuarios y Autenticación:**
- `usuarios` - Información de estudiantes y administradores
- `instituciones` - Datos de colegios y centros educativos
- `sesiones` - Sesiones de autenticación activas

**Sistema Educativo:**
- `sesiones` - Sesiones de estudio completadas
- `sesiones_detalles` - Respuestas detalladas por pregunta
- `banco_preguntas` - Repositorio de preguntas por área
- `progreso_nivels` - Progreso académico por estudiante

**Test de Kolb:**
- `pregunta_estilo_aprendizajes` - Preguntas del test de Kolb
- `estilos_aprendizajes` - Tipos de estilos identificados
- `kolb_resultados` - Resultados individuales del test

**Notificaciones:**
- `notificaciones` - Notificaciones del sistema
- `fcm_tokens` - Tokens de dispositivos móviles
- `notifications_sent` - Historial de notificaciones enviadas

**Gamificación:**
- `retos` - Retos entre estudiantes

### Diccionario de Datos (Tablas Principales)

#### Tabla: usuarios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER (PK) | Identificador único |
| nombre_completo | VARCHAR(255) | Nombre completo del usuario |
| email | VARCHAR(255) | Correo electrónico único |
| password | VARCHAR(255) | Contraseña hasheada |
| rol | ENUM | 'admin' o 'estudiante' |
| institucion_id | INTEGER (FK) | Referencia a instituciones |
| last_seen | TIMESTAMP | Última actividad |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

#### Tabla: sesiones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER (PK) | Identificador único |
| usuario_id | INTEGER (FK) | Referencia al estudiante |
| area_icfes | VARCHAR(100) | Área evaluada (matemáticas, lectura_critica, etc.) |
| preguntas_total | INTEGER | Total de preguntas en la sesión |
| preguntas_correctas | INTEGER | Preguntas respondidas correctamente |
| tiempo_total | INTEGER | Tiempo en segundos |
| finalizada | BOOLEAN | Estado de finalización |
| preguntas_generadas | JSON | Preguntas generadas por IA |
| detalle_resumen | JSON | Resumen detallado de resultados |
| created_at | TIMESTAMP | Fecha de inicio |

#### Tabla: banco_preguntas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER (PK) | Identificador único |
| area_icfes | VARCHAR(100) | Área ICFES correspondiente |
| pregunta | TEXT | Texto de la pregunta |
| opcion_a | VARCHAR(500) | Opción A |
| opcion_b | VARCHAR(500) | Opción B |
| opcion_c | VARCHAR(500) | Opción C |
| opcion_d | VARCHAR(500) | Opción D |
| respuesta_correcta | CHAR(1) | Letra de la respuesta correcta |
| nivel_dificultad | INTEGER | Nivel 1-5 |
| activa | BOOLEAN | Si la pregunta está activa |

### Relaciones Principales

```sql
-- Relación usuarios - instituciones (N:1)
usuarios.institucion_id → instituciones.id

-- Relación sesiones - usuarios (N:1)
sesiones.usuario_id → usuarios.id

-- Relación sesiones_detalles - sesiones (N:1)
sesiones_detalles.sesion_id → sesiones.id

-- Relación kolb_resultados - usuarios (N:1)
kolb_resultados.usuario_id → usuarios.id

-- Relación fcm_tokens - usuarios (N:1)
fcm_tokens.usuario_id → usuarios.id
```

### Diagrama de Base de Datos

```
┌─────────────────┐    ┌─────────────────┐
│   instituciones │    │    usuarios     │
│                 │    │                 │
│ • id (PK)       │◄───┤ • id (PK)       │
│ • nombre        │    │ • institucion_id│
│ • codigo_dane   │    │ • nombre        │
│ • activa        │    │ • email         │
└─────────────────┘    │ • rol           │
                       └─────────┬───────┘
                                 │
                       ┌─────────▼───────┐
                       │    sesiones     │
                       │                 │
                       │ • id (PK)       │
                       │ • usuario_id(FK)│
                       │ • area_icfes    │
                       │ • preguntas_gen │
                       └─────────┬───────┘
                                 │
                       ┌─────────▼───────┐
                       │sesiones_detalles│
                       │                 │
                       │ • id (PK)       │
                       │ • sesion_id(FK) │
                       │ • pregunta      │
                       │ • respuesta     │
                       └─────────────────┘
```

---

# 7. Desarrollo del Software

## Estructura de Carpetas del Sistema

### Backend (AdonisJS)
```
EDUEXCE_BACKEND_SENA/
├── app/
│   ├── controller/           # Controladores HTTP (6 archivos)
│   │   ├── admin_controller.ts
│   │   ├── auth_controller.ts
│   │   ├── movil_controller.ts
│   │   └── ...
│   ├── services/            # Capa de lógica de negocio (23 servicios)
│   │   ├── auth_service.ts
│   │   ├── ia_openai_service.ts
│   │   ├── notificaciones_service.ts
│   │   └── ...
│   ├── models/             # Modelos de datos (13 modelos)
│   │   ├── usuario.ts
│   │   ├── sesione.ts
│   │   ├── banco_pregunta.ts
│   │   └── ...
│   ├── middleware/         # Middlewares HTTP (5 archivos)
│   │   ├── audit_logger_middleware.ts
│   │   ├── only_rol.ts
│   │   └── ...
│   └── exceptions/         # Manejo de errores
│       └── handler.ts
├── config/                 # Configuración del sistema
│   ├── app.ts
│   ├── database.ts
│   ├── cors.ts
│   └── firebase-admin-sdk.json
├── database/
│   ├── migrations/         # Migraciones de BD (18 archivos)
│   └── seeders/           # Datos iniciales
├── start/                 # Inicialización del sistema
│   ├── routes.ts          # Definición de rutas
│   ├── kernel.ts          # Registro de middlewares
│   └── cron.ts           # Tareas programadas
└── tests/                # Suite de pruebas
```

### Panel Web Administrativo
```
[nombre-proyecto-frontend]/
├── src/                  # Código fuente principal
│   ├── components/       # Componentes reutilizables
│   │   ├── ui/          # Componentes base de UI
│   │   ├── forms/       # Formularios
│   │   ├── charts/      # Gráficos y visualizaciones
│   │   └── layout/      # Componentes de layout
│   ├── pages/           # Páginas/rutas de la aplicación
│   │   ├── dashboard/   # Dashboard administrativo
│   │   ├── students/    # Gestión de estudiantes
│   │   ├── reports/     # Reportes y análisis
│   │   └── settings/    # Configuración
│   ├── services/        # Servicios para APIs
│   │   ├── api.ts      # Cliente HTTP configurado
│   │   └── auth.ts     # Servicios de autenticación
│   ├── store/          # Gestión de estado global
│   ├── hooks/          # Custom hooks (React)
│   ├── utils/          # Utilidades y helpers
│   └── types/          # Tipos TypeScript
├── public/             # Archivos estáticos
└── [archivos-config]   # package.json, tsconfig, etc.
```

### Aplicación Móvil
```
[nombre-proyecto-movil]/
├── src/                # Código fuente principal
│   ├── screens/        # Pantallas de la aplicación
│   │   ├── auth/      # Autenticación (login, registro)
│   │   ├── home/      # Dashboard del estudiante
│   │   ├── sessions/  # Sesiones de estudio
│   │   ├── kolb/      # Test de estilos de aprendizaje
│   │   ├── challenges/# Retos y gamificación
│   │   └── profile/   # Perfil del usuario
│   ├── components/    # Componentes reutilizables
│   ├── services/      # Servicios para APIs
│   ├── navigation/    # Configuración de navegación
│   ├── store/         # Estado global de la app
│   └── utils/         # Utilidades y constantes
├── assets/            # Imágenes, fuentes, iconos
└── [platform-specific] # android/, ios/ (si aplica)
```

## Estándares de Codificación

### Backend (TypeScript)
- **Nomenclatura:** PascalCase para clases, camelCase para variables/funciones
- **Archivos:** snake_case para archivos de servicio, PascalCase para modelos
- **Imports:** Usar path aliases (#controllers, #services, #models)
- **Validación:** Usar VineJS para validación de inputs
- **Error Handling:** Manejo centralizado en exception handler

### Frontend
- **Componentes:** PascalCase para nombres de componentes
- **Props/State:** camelCase para propiedades y estado
- **Funciones:** camelCase con verbos descriptivos
- **Constantes:** UPPER_SNAKE_CASE para constantes globales
- **Archivos:** kebab-case para archivos de componentes

### Móvil
- **Screens:** PascalCase terminado en "Screen"
- **Components:** PascalCase descriptivos
- **Services:** camelCase con sufijo "Service"
- **Utils:** camelCase con propósito claro

## Buenas Prácticas Implementadas

### Seguridad
- Validación de inputs en todos los endpoints
- Sanitización de datos antes de almacenar
- Tokens JWT con expiración configurable
- Middleware de autenticación y autorización
- CORS configurado para dominios específicos

### Performance
- Paginación en listados grandes
- Cache con Redis para consultas frecuentes
- Optimización de queries SQL
- Lazy loading en componentes frontend
- Compresión de imágenes y assets

### Mantenibilidad
- Separación de responsabilidades (Controller → Service → Model)
- Inyección de dependencias
- Logging estructurado con Pino
- Documentación inline con JSDoc/TSDoc
- Testing unitario y de integración

## Repositorios

### URLs de los Repositorios
- **Backend:** https://github.com/PinzaF1/EDUEXCE_BACKEND_SENA
- **Frontend Web:** [URL del repositorio frontend]
- **Aplicación Móvil:** [URL del repositorio móvil]

### Estructura de Branches
- **main/master:** Código de producción estable
- **develop:** Rama de desarrollo principal
- **feature/\*:** Ramas para nuevas funcionalidades
- **fix/\*:** Ramas para corrección de bugs
- **hotfix/\*:** Correcciones urgentes para producción

### Archivo .gitignore Principal
```
node_modules/
build/
dist/
.env*
!.env.example
*.log
.DS_Store
config/firebase-admin-sdk.json
```

---

# 8. Funcionalidades del software

## Módulos del Sistema

### Backend API (AdonisJS)

#### Módulo de Autenticación
- **Login JWT:** Autenticación con email y contraseña
- **Registro:** Creación de cuentas para estudiantes
- **Recuperación:** Reset de contraseña vía email
- **Roles:** Control de acceso Admin/Estudiante
- **Middleware:** Protección de rutas por rol

#### Módulo de Inteligencia Artificial
- **Generación de Preguntas:** Integración con OpenAI GPT-4o-mini
- **Fallback Local:** Banco de preguntas de respaldo
- **Personalización:** Adaptación según estilo de aprendizaje Kolb
- **Timeout Configurable:** 20 segundos por request de IA

#### Módulo de Sesiones de Estudio
- **Creación de Sesiones:** Generación dinámica por área ICFES
- **Seguimiento de Progreso:** Registro de respuestas y tiempos
- **Análisis de Resultados:** Cálculo de métricas de rendimiento
- **Historial Completo:** Almacenamiento de todas las sesiones

#### Módulo de Notificaciones
- **Firebase FCM:** Envío de push notifications
- **Detección Automática:** Alertas por bajo rendimiento
- **Programación:** Notificaciones diferidas
- **Segmentación:** Por institución, área o estudiante individual

### Panel Web Administrativo

#### Dashboard Principal
- **Métricas Institucionales:** Estadísticas generales de rendimiento
- **Gráficos Interactivos:** Visualización de datos por área ICFES
- **Alertas en Tiempo Real:** Estudiantes en riesgo académico
- **KPIs Educativos:** Indicadores clave de performance

#### Gestión de Estudiantes
- **CRUD Completo:** Crear, leer, actualizar, eliminar estudiantes
- **Seguimiento Individual:** Perfil detallado con historial académico
- **Filtros Avanzados:** Por área débil, nivel de rendimiento, estado
- **Exportación:** Reportes en Excel/CSV

#### Seguimiento por Áreas ICFES
- **Matemáticas:** Dashboard específico con métricas detalladas
- **Lectura Crítica:** Análisis de comprensión lectora
- **Ciencias Naturales:** Seguimiento en biología, química, física
- **Ciencias Sociales:** Métricas de historia, geografía, filosofía
- **Inglés:** Niveles de competencia en lengua extranjera

#### Reportes y Análisis
- **Reportes Personalizados:** Generación por fechas y filtros
- **Análisis Comparativo:** Entre estudiantes, grupos o períodos
- **Tendencias Temporales:** Evolución del rendimiento
- **Exportación Múltiple:** PDF, Excel, CSV

### Aplicación Móvil

#### Sesiones de Estudio Interactivas
- **Selección de Área:** Elección entre 5 áreas ICFES
- **Preguntas Dinámicas:** Generadas por IA según nivel
- **Interfaz Intuitiva:** Navegación fluida entre preguntas
- **Resultados Inmediatos:** Feedback instantáneo y explicaciones

#### Test de Kolb (Estilos de Aprendizaje)
- **Evaluación Completa:** 40 preguntas estructuradas
- **Clasificación Automática:** Divergente, Asimilador, Convergente, Acomodador
- **Recomendaciones Personalizadas:** Estrategias de estudio adaptadas
- **Re-evaluación:** Posibilidad de repetir el test

#### Sistema de Gamificación
- **Retos Personales:** Objetivos individuales de mejora
- **Competencias:** Retos entre estudiantes de la misma institución
- **Rankings Dinámicos:** Posiciones por área y general
- **Logros y Badges:** Sistema de reconocimientos

#### Perfil y Progreso Personal
- **Dashboard Personal:** Resumen de actividad y rendimiento
- **Gráficos de Evolución:** Progreso temporal por área
- **Estadísticas Detalladas:** Tiempo de estudio, preguntas respondidas
- **Áreas de Mejora:** Identificación automática de debilidades

## Diagramas UML

### Diagrama de Casos de Uso - Sistema General

```
                    ┌─────────────────┐
                    │   ESTUDIANTE    │
                    └─────────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Realizar Test│    │   Estudiar  │    │ Ver Progreso│
│   de Kolb   │    │ con Sesiones│    │ y Rankings  │
└─────────────┘    └─────────────┘    └─────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Responder      │
                    │  Preguntas IA   │
                    └─────────────────┘

                    ┌─────────────────┐
                    │ ADMINISTRADOR   │
                    └─────────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Gestionar  │    │  Ver Métricas│    │   Enviar    │
│ Estudiantes │    │y Reportes   │    │Notificaciones│
└─────────────┘    └─────────────┘    └─────────────┘
```

### Diagrama de Clases - Módulos Principales

```
┌─────────────────────┐
│     Usuario         │
├─────────────────────┤
│ - id: number        │
│ - email: string     │
│ - rol: string       │
│ - institucion_id    │
├─────────────────────┤
│ + login()           │
│ + logout()          │
│ + resetPassword()   │
└─────────┬───────────┘
          │ 1..*
          │
          ▼ 1
┌─────────────────────┐
│     Sesion          │
├─────────────────────┤
│ - id: number        │
│ - usuario_id: number│
│ - area_icfes: string│
│ - preguntas_total   │
│ - correctas: number │
├─────────────────────┤
│ + iniciar()         │
│ + finalizar()       │
│ + calcularScore()   │
└─────────────────────┘

┌─────────────────────┐
│   IAService         │
├─────────────────────┤
│ - openaiClient      │
│ - timeout: number   │
├─────────────────────┤
│ + generarPreguntas()│
│ + consultarIA()     │
│ + fallbackLocal()   │
└─────────────────────┘
```

---

# 9. Interfases del sistema

## Diseño de Interfaz Gráfica (UI/UX)

### Panel Web Administrativo

#### Paleta de Colores
- **Color Primario:** #[Color institucional SENA]
- **Color Secundario:** #[Color complementario]
- **Color de Éxito:** #10B981 (Verde)
- **Color de Advertencia:** #F59E0B (Amarillo)
- **Color de Error:** #EF4444 (Rojo)
- **Color de Información:** #3B82F6 (Azul)

#### Layout Principal
- **Tipo:** Sidebar fijo + área de contenido
- **Navegación:** Sidebar vertical colapsable
- **Header:** Breadcrumbs + perfil de usuario + notificaciones
- **Responsive:** Adaptativo con menú hamburguesa en móvil

#### Pantallas Principales

**1. Login Administrativo**
- Formulario centrado con validación
- Logo institucional
- Recuperación de contraseña
- Redirección automática según rol

**2. Dashboard Principal**
- Cards con métricas clave (estudiantes activos, sesiones, alertas)
- Gráficos de rendimiento por área ICFES
- Lista de alertas recientes
- Accesos rápidos a funciones principales

**3. Gestión de Estudiantes**
- Tabla paginada con filtros avanzados
- Barra de búsqueda en tiempo real
- Botones de acción (ver, editar, eliminar)
- Modal para creación/edición de estudiante

**4. Seguimiento Individual**
- Perfil completo del estudiante
- Gráficos de evolución temporal
- Historial de sesiones en tabla
- Métricas por área ICFES

**5. Reportes y Analytics**
- Dashboard con múltiples gráficos
- Filtros por fecha, institución, área
- Botones de exportación
- Visualizaciones interactivas

### Aplicación Móvil

#### Sistema de Diseño
- **Framework UI:** [Material Design/Cupertino/Custom]
- **Navegación:** Tab-based con stack navigation
- **Tipografía:** [Fuente principal del sistema]
- **Iconografía:** Icons consistentes por funcionalidad

#### Pantallas Principales

**1. Splash Screen**
- Logo animado de EduExce
- Carga de configuración inicial
- Verificación de conectividad

**2. Autenticación**
- Login con email/contraseña
- Registro para nuevos estudiantes
- Recuperación de contraseña
- Validación en tiempo real

**3. Dashboard Estudiante**
- Resumen de progreso con gráficos circulares
- Acceso rápido a nueva sesión
- Retos disponibles
- Posición en ranking

**4. Sesión de Estudio**
- Selección de área ICFES
- Interfaz de pregunta con 4 opciones
- Temporizador y progreso
- Resultados inmediatos con explicaciones

**5. Test de Kolb**
- Introducción explicativa
- Preguntas con escala de valores
- Barra de progreso
- Resultado con tipo de aprendizaje

**6. Perfil y Estadísticas**
- Información personal editable
- Gráficos de rendimiento por área
- Historial de sesiones
- Configuración de notificaciones

## Navegación entre Pantallas

### Panel Web - Flujo Administrativo
```
Login → Dashboard → [Estudiantes / Reportes / Notificaciones / Configuración]
  │
  └─→ Gestión de Estudiantes → Ver Detalle → Editar/Eliminar
  └─→ Reportes → Filtrar → Exportar
  └─→ Notificaciones → Crear → Enviar
```

### App Móvil - Flujo del Estudiante
```
Splash → Login/Registro → Dashboard Principal
  │
  ├─→ Nueva Sesión → Seleccionar Área → Preguntas → Resultados
  ├─→ Test de Kolb → Preguntas → Resultado → Recomendaciones
  ├─→ Retos → Ver Disponibles → Participar → Ver Resultado
  ├─→ Rankings → General/Institución/Área
  └─→ Perfil → Editar Info → Ver Estadísticas → Configuración
```

### Responsive Design

**Breakpoints del Panel Web:**
- **Móvil:** < 768px (Sidebar colapsado, layout apilado)
- **Tablet:** 768px - 1024px (Sidebar adaptativo)
- **Desktop:** > 1024px (Sidebar fijo, layout completo)

**Adaptación Móvil:**
- Menú hamburguesa en lugar de sidebar
- Tablas con scroll horizontal
- Cards apilados verticalmente
- Formularios de una columna

---

# 10. Bibliografía

## Documentación Oficial de Frameworks

1. **AdonisJS Documentation**  
   URL: https://docs.adonisjs.com/guides/introduction  
   Consultado: 2025  
   *Framework principal del backend, guías de instalación, configuración y desarrollo.*

2. **OpenAI API Documentation**  
   URL: https://platform.openai.com/docs  
   Consultado: 2025  
   *Documentación oficial para integración con GPT-4o-mini y generación de preguntas.*

3. **Firebase Admin SDK Documentation**  
   URL: https://firebase.google.com/docs/admin/setup  
   Consultado: 2025  
   *Guía para implementación de notificaciones push y autenticación.*

4. **PostgreSQL Documentation**  
   URL: https://www.postgresql.org/docs/  
   Consultado: 2025  
   *Base de datos relacional, configuración y optimización.*

5. **Redis Documentation**  
   URL: https://redis.io/documentation  
   Consultado: 2025  
   *Sistema de cache y pub/sub para notificaciones en tiempo real.*

## Tecnologías Frontend

6. **[Framework Frontend] Documentation**  
   URL: [URL específica según implementación]  
   Consultado: 2025  
   *Documentación del framework frontend utilizado (React, Vue, Angular, etc.)*

7. **Chart.js Documentation**  
   URL: https://www.chartjs.org/docs/  
   Consultado: 2025  
   *Librería para visualización de datos y gráficos en el panel administrativo.*

## Tecnologías Móviles

8. **[Mobile Framework] Documentation**  
   URL: [URL específica según implementación]  
   Consultado: 2025  
   *Documentación del framework móvil (React Native, Flutter, etc.)*

9. **Firebase Cloud Messaging**  
   URL: https://firebase.google.com/docs/cloud-messaging  
   Consultado: 2025  
   *Implementación de notificaciones push multiplataforma.*

## DevOps y Deployment

10. **Docker Documentation**  
    URL: https://docs.docker.com/  
    Consultado: 2025  
    *Contenedorización y deployment de la aplicación.*

11. **Nginx Documentation**  
    URL: https://nginx.org/en/docs/  
    Consultado: 2025  
    *Configuración de reverse proxy y SSL/TLS.*

12. **AWS EC2 User Guide**  
    URL: https://docs.aws.amazon.com/ec2/  
    Consultado: 2025  
    *Despliegue en servidor cloud de Amazon Web Services.*

## Metodologías y Estándares

13. **TypeScript Handbook**  
    URL: https://www.typescriptlang.org/docs/  
    Consultado: 2025  
    *Guía de tipado estático para JavaScript utilizado en todo el proyecto.*

14. **JWT (JSON Web Tokens) Specification**  
    URL: https://tools.ietf.org/html/rfc7519  
    Consultado: 2025  
    *Estándar para autenticación y autorización en APIs.*

15. **REST API Design Guidelines**  
    URL: https://restfulapi.net/  
    Consultado: 2025  
    *Mejores prácticas para diseño de APIs RESTful.*

## Recursos Educativos

16. **Test de Kolb - Estilos de Aprendizaje**  
    Kolb, D. A. (1984). *Experiential Learning: Experience as the Source of Learning and Development*  
    *Base teórica para la implementación del test de estilos de aprendizaje.*

17. **ICFES - Instituto Colombiano para la Evaluación de la Educación**  
    URL: https://www.icfes.gov.co/  
    Consultado: 2025  
    *Estructura y áreas evaluadas en las pruebas Saber 11.*

---

**Fin del Manual Técnico**

*Este documento fue generado el 10 de diciembre de 2025 para el Sistema de Gestión Educativa EduExce SENA.*