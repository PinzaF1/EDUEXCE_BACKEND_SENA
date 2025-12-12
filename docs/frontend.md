# 🌐 Información Técnica - Proyecto Frontend Web EduExce

Documentación técnica completa del panel administrativo web para instituciones educativas del SENA.

---

## 📋 1. INFORMACIÓN GENERAL DEL PROYECTO

### 1.1 Datos Básicos
- ✅ **Nombre completo del proyecto**: EduExce - Panel Administrativo Web
- ✅ **Versión actual**: 0.0.0 (en desarrollo)
- ✅ **Tipo de aplicación**:
  - ✅ **Admin Panel (Dashboard administrativo)** - Panel web exclusivo para instituciones educativas
- ✅ **Fecha de última versión**: 10 de diciembre de 2025
- ✅ **Autores/Desarrolladores**:
  - Equipo de desarrollo SENA
  - Proyecto de formación tecnológica

### 1.2 Propósito
- ✅ **Problema que resuelve**: 
  ```
  Panel administrativo web para colegios e instituciones educativas del SENA que permite:
  - Monitoreo del rendimiento académico de estudiantes
  - Gestión de estudiantes y usuarios del sistema
  - Seguimiento de áreas ICFES (Matemáticas, Lectura Crítica, Ciencias, etc.)
  - Notificaciones automáticas sobre estudiantes en riesgo o áreas críticas
  - Métricas y reportes de progreso institucional
  - Gestión del banco de preguntas
  - Análisis de datos para toma de decisiones educativas
  ```

- ✅ **Usuarios objetivo**: 
  - ✅ **Administradores del sistema** (Rol principal)
  - ✅ **Coordinadores académicos**
  - ✅ **Directivos de instituciones educativas**
  - ❌ ~~Estudiantes~~ (solo usan la app móvil)

### 1.3 URL de Despliegue
- ✅ **URL de producción**: No desplegado aún
- ✅ **URL de staging/desarrollo**: http://localhost:5174 (desarrollo local)
- ✅ **Servicio de hosting planificado**:
  - ✅ **Vercel** (configurado con vercel.json)
  - ✅ AWS S3 + CloudFront (scripts de deploy configurados)

---

## 🏗️ 2. ARQUITECTURA Y TECNOLOGÍAS

### 2.1 Framework Frontend Principal
- ✅ **Framework utilizado**:
  - ✅ **React** (v19.1.1)

### 2.2 Tipo de Renderizado
- ✅ **Método de renderizado**:
  - ✅ **SPA (Single Page Application - CSR)**

### 2.3 Lenguaje de Programación
- ✅ **Lenguaje principal**:
  - ✅ **TypeScript**
- ✅ **Versión**: TypeScript ~5.8.3

### 2.4 Build Tool
- ✅ **Herramienta de build**:
  - ✅ **Vite** (v7.1.2)

### 2.5 Patrón Arquitectónico
- ✅ **Arquitectura implementada**:
  - ✅ **Component-Based Architecture** (React)

---

## 🛠️ 3. DEPENDENCIAS Y LIBRERÍAS

### 3.1 Gestión de Estado Global
- ✅ **Librería de estado**:
  - ✅ **Context API (React)** + hooks personalizados (useAuth)

### 3.2 Sistema de Routing
- ✅ **Librería de routing**:
  - ✅ **React Router** (v7.8.1)

### 3.3 Cliente HTTP / Fetching
- ✅ **Librería para APIs**:
  - ✅ **Fetch API (nativo)** con cliente personalizado

### 3.4 Framework de UI/CSS
- ✅ **Framework de estilos**:
  - ✅ **Tailwind CSS** (v3.4.17)

### 3.5 Gráficos y Visualización de Datos
- ✅ **Librería de charts**:
  - ✅ **Recharts** (v3.2.0)

### 3.6 Manejo de Formularios
- ✅ **Librería de formularios**:
  - ✅ **Manejo manual (useState)** - React hooks nativos

### 3.7 Autenticación
- ✅ **Sistema de autenticación**:
  - ✅ **JWT manual** con localStorage
- ✅ **Almacenamiento de sesión**:
  - ✅ **localStorage**

### 3.8 Tablas de Datos
- ✅ **Librería de tablas**:
  - ✅ **Componente personalizado** (implementación propia)

### 3.9 Notificaciones/Toasts
- ✅ **Librería de notificaciones**:
  - ✅ **SweetAlert2** (v11.23.0)

### 3.10 Otras Librerías Importantes

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.74.0",
    "cors": "^2.8.5",
    "framer-motion": "^12.23.12",
    "lucide-react": "^0.542.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-icons": "^5.5.0",
    "react-router-dom": "^7.8.1",
    "recharts": "^3.2.0",
    "sweetalert2": "^11.23.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.33.0",
    "@types/node": "^24.10.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.0",
    "autoprefixer": "^10.4.21",
    "cypress": "^15.6.0",
    "eslint": "^9.33.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.3.0",
    "postcss": "^8.5.6",
    "rimraf": "^6.1.2",
    "rollup-plugin-visualizer": "^6.0.5",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.39.1",
    "vite": "^7.1.2",
    "vite-plugin-compression": "^0.5.1"
  }
}
```

---

## 📦 4. INSTALACIÓN Y CONFIGURACIÓN

### 4.1 Requisitos Previos
- ✅ **Node.js**: Versión 18+ (recomendado)
- ✅ **npm / pnpm**: Para gestión de dependencias
- ✅ **Git**: Para clonar el repositorio

### 4.2 Pasos de Instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/PinzaF1/ZAVIRA_SENA_FRONTEND.git

# 2. Entrar al directorio
cd ZAVIRA_SENA_FRONTEND

# 3. Instalar dependencias
npm install

# 4. Copiar variables de entorno
cp .env.example .env

# 5. Configurar variables de entorno (editar .env)

# 6. Ejecutar en desarrollo
npm run dev
```

### 4.3 Variables de Entorno

```env
# API Backend
VITE_API_URL=/api

# Entorno
VITE_ENV=production

# NOTAS:
# - NO subas archivos .env a Git
# - En desarrollo local usa /api (se redirige via vite proxy)
# - En producción (Vercel) usa /api (se redirige via vercel.json)
# - El backend está en https://eduexce-backend.ddns.net
```

### 4.4 Scripts Disponibles

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:prod": "tsc -b && vite build --mode production",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "cypress run",
    "test:open": "cypress open"
  }
}
```

---

## 📁 5. ESTRUCTURA DEL PROYECTO

### 5.1 Árbol de Carpetas

```
ZAVIRA_SENA_FRONTEND/
├── public/
│   ├── eduexce-logo.svg
│   ├── zavira-logo.svg
│   └── _redirects
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── PasswordRequest.tsx
│   │   │   ├── PasswordReset.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── Notifications.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Students.tsx
│   │   │   └── Tracking.tsx
│   │   ├── landing/
│   │   │   └── Landing.tsx
│   │   └── shared/
│   │       ├── Islas.tsx
│   │       ├── ProgresoPorArea.tsx
│   │       └── RendimientoPorArea.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── api.ts
│   │   ├── areas.ts
│   │   ├── constants.ts
│   │   └── storage.ts
│   ├── assets/
│   │   └── images/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── cypress/
│   └── e2e/
├── scripts/
│   ├── fix-env.js
│   └── validate-env.js
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── eslint.config.js
└── vercel.json
```

### 5.2 Archivos de Configuración Principales

- ✅ `package.json` - Dependencias y scripts
- ✅ `vite.config.ts` - Configuración de Vite con proxy y optimizaciones
- ✅ `tsconfig.json` - Configuración de TypeScript
- ✅ `tailwind.config.js` - Configuración de Tailwind CSS
- ✅ `eslint.config.js` - Configuración de ESLint
- ✅ `postcss.config.js` - Configuración de PostCSS
- ✅ `vercel.json` - Configuración para deployment en Vercel

---

## 🎯 6. FUNCIONALIDADES DEL SOFTWARE

### 6.1 Tipo de Aplicación
- ✅ **Admin/Dashboard**: Panel administrativo exclusivo para colegios e instituciones

> **IMPORTANTE:** Los estudiantes NO usan la aplicación web. Ellos consumen los endpoints desde la **aplicación móvil** donde realizan sesiones de estudio, test de Kolb, retos, rankings, etc.

---

### 6.2 MÓDULOS DEL PANEL ADMINISTRATIVO

#### Autenticación y Seguridad
- ✅ **Login para administradores**
- ✅ **Recuperación de contraseña**
- ✅ **Verificación de roles (solo Admin)**
- ✅ **Cierre de sesión**
- ✅ **Control de permisos por rol**

#### Dashboard Principal (Home.tsx)
- ✅ **Resumen de estadísticas generales de la institución**
- ✅ **Gráficos de rendimiento académico**
- ✅ **Métricas por áreas ICFES**
- ✅ **Alertas automáticas de estudiantes en riesgo**
- ✅ **Notificaciones de áreas críticas**
- ✅ **Estudiantes activos/inactivos**

#### Gestión de Estudiantes (Students.tsx)
- ✅ **Listar todos los estudiantes de la institución**
- ✅ **Crear nuevo estudiante**
- ✅ **Editar información de estudiante**
- ✅ **Eliminar/Desactivar estudiante**
- ✅ **Ver perfil completo del estudiante**
- ✅ **Filtros avanzados**
- ✅ **Búsqueda por nombre, documento, código**
- ✅ **Exportar listado a Excel/CSV**

#### Seguimiento de Estudiantes (Tracking.tsx)
- ✅ **Ver progreso individual de cada estudiante**
- ✅ **Estudiantes en riesgo académico**
- ✅ **Historial completo de actividad**
- ✅ **Áreas fuertes y débiles del estudiante**
- ✅ **Evolución del rendimiento en el tiempo**

#### Gestión de Notificaciones (Notifications.tsx)
- ✅ **Ver historial de notificaciones enviadas**
- ✅ **Enviar notificación manual push a estudiantes**
- ✅ **Notificaciones masivas por grupo/institución**
- ✅ **Configurar reglas de notificaciones automáticas**

#### Perfil de Usuario (Profile.tsx)
- ✅ **Ver perfil del administrador**
- ✅ **Editar información personal**
- ✅ **Cambiar contraseña**

#### Configuración del Sistema (Settings.tsx)
- ✅ **Configurar parámetros generales del sistema**
- ✅ **Gestionar roles y permisos**
- ✅ **Configurar umbral de alertas**
- ✅ **Ajustes de privacidad y seguridad**

---

## 🧪 8. TESTING

### 8.1 Tests Implementados
- ✅ **¿Tiene tests E2E?**: Sí
- ✅ **Framework E2E**:
  - ✅ **Cypress** (v15.6.0)

### 8.2 Linting y Formateo
- ✅ **ESLint**: Sí - Config: typescript-eslint
- ❌ **Prettier**: No configurado
- ❌ **Husky (pre-commit hooks)**: No configurado

---

## 🚀 9. BUILD Y DEPLOYMENT

### 9.1 Proceso de Build
```bash
# Comando de build para producción
npm run build:prod

# Salida del build
# Carpeta: /dist
```

- ✅ **Carpeta de output**: `dist/`

### 9.2 Optimizaciones de Build
- ✅ **Code splitting**: Sí (manual chunks configurados)
- ✅ **Tree shaking**: Sí
- ✅ **Lazy loading de componentes**: No implementado aún
- ✅ **Image optimization**: No implementado
- ✅ **Minificación**: Sí (esbuild)
- ✅ **Compresión (gzip/brotli)**: Sí

### 9.3 Despliegue
- ✅ **Plataforma de hosting**: Vercel (configurado) / AWS S3+CloudFront
- ❌ **URL de producción**: No desplegado aún
- ✅ **¿Usa CI/CD?**: Scripts configurados para AWS deployment

### 9.4 Variables de Entorno en Producción
- ✅ **¿Cómo se gestionan las variables en producción?**
  - ✅ **Panel de hosting (Vercel)** / AWS deployment scripts

---

## 📊 10. INTEGRACIÓN CON BACKEND

### 10.1 Configuración de API
- ✅ **URL del backend**: https://eduexce-backend.ddns.net
- ✅ **Método de autenticación**: 
  - ✅ **JWT Bearer Token**
- ✅ **Timeout de requests**: Configurado en cliente API

### 10.2 Endpoints Consumidos

**Autenticación (Admin):**
```
POST   /api/auth/login                    (Login de administradores)
POST   /api/auth/recuperar-password       (Recuperación de contraseña)
GET    /api/auth/verificar                (Verificar sesión activa)
POST   /api/auth/logout                   (Cerrar sesión)
```

**Dashboard y Métricas:**
```
GET    /api/admin/dashboard               (Métricas generales del dashboard)
GET    /api/admin/estadisticas            (Estadísticas institucionales)
GET    /api/admin/metricas-areas          (Métricas por área ICFES)
GET    /api/admin/alertas                 (Alertas de estudiantes en riesgo)
```

**Gestión de Estudiantes:**
```
GET    /api/admin/estudiantes             (Listar todos los estudiantes)
GET    /api/admin/estudiantes/:id         (Ver detalle de estudiante)
POST   /api/admin/estudiantes             (Crear estudiante)
PUT    /api/admin/estudiantes/:id         (Actualizar estudiante)
DELETE /api/admin/estudiantes/:id         (Eliminar estudiante)
POST   /api/admin/estudiantes/importar    (Importar estudiantes desde Excel)
```

**Notificaciones:**
```
GET    /api/admin/notificaciones          (Historial de notificaciones)
POST   /api/admin/notificaciones/enviar   (Enviar notificación push)
POST   /api/admin/notificaciones/masiva   (Enviar notificación masiva)
```

### 10.3 Manejo de Estados HTTP
- ✅ **¿Maneja errores 401 (no autorizado)?**: Sí - Redirección a login
- ✅ **¿Maneja errores 403 (prohibido)?**: Sí - Mensaje de error
- ✅ **¿Maneja errores 404 (no encontrado)?**: Sí
- ✅ **¿Maneja errores 500 (error del servidor)?**: Sí
- ✅ **¿Muestra mensajes de error al usuario?**: Sí (SweetAlert2)

### 10.4 Interceptores/Middleware HTTP
- ✅ **¿Usa interceptores?**: Sí
- ✅ **Funcionalidad de los interceptores**:
  - ✅ **Agregar token automáticamente**
  - ✅ **Manejo global de errores**
  - ✅ **Logging de requests** (desarrollo)

---

## 🔒 11. SEGURIDAD

### 11.1 Autenticación y Autorización
- ✅ **¿Verifica roles del usuario?**: Sí
- ✅ **¿Protege rutas privadas?**: Sí (ProtectedRoute component)
- ✅ **¿Implementa guards/middleware de ruta?**: Sí

### 11.2 Almacenamiento
- ✅ **¿Dónde almacena el token?**:
  - ✅ **localStorage**

### 11.3 Validación de Inputs
- ✅ **¿Valida inputs del usuario?**: Sí
- ✅ **¿Sanitiza datos antes de enviar?**: Sí

---

## 📈 12. PERFORMANCE

### 12.2 Optimizaciones Implementadas
- ✅ **Code splitting por rutas**: Sí (configurado en Vite)
- ✅ **Compresión gzip/brotli**: Sí
- ❌ **Lazy loading de componentes**: No implementado aún
- ❌ **Memoization (React.memo, useMemo)**: No implementado aún

---

## 📚 14. DOCUMENTACIÓN

### 14.1 README del Proyecto
- ✅ **¿Tiene README completo?**: Sí
- ✅ **Incluye**:
  - ✅ **Descripción del proyecto**
  - ✅ **Instrucciones de instalación**
  - ✅ **Comandos disponibles**
  - ✅ **Guía de desarrollo**
  - ✅ **Guía de despliegue**

---

## 🌍 15. COMPATIBILIDAD DE NAVEGADORES

### 15.1 Navegadores Soportados
- ✅ **Chrome**: Versión moderna (ES2022)
- ✅ **Firefox**: Versión moderna
- ✅ **Safari**: Versión moderna
- ✅ **Edge**: Versión moderna
- ❌ **Internet Explorer**: No soportado

---

## ✅ 16. INFORMACIÓN COMPLEMENTARIA

### 16.1 Repositorio
- ✅ **URL del repositorio**: https://github.com/PinzaF1/ZAVIRA_SENA_FRONTEND
- ✅ **Branch principal**: main
- ✅ **Branch de desarrollo**: develop
- ✅ **¿Es privado o público?**: Privado

### 16.3 Observaciones Adicionales

```
Características técnicas destacadas:

✅ Aplicación optimizada para instituciones educativas del SENA
✅ Panel administrativo exclusivo (los estudiantes usan app móvil)
✅ Integración completa con backend para gestión de datos
✅ Arquitectura basada en componentes React con TypeScript
✅ Sistema de autenticación JWT robusto
✅ Diseño responsive con Tailwind CSS
✅ Gráficos interactivos con Recharts para análisis de datos
✅ Sistema de notificaciones push para estudiantes
✅ Exportación de datos a Excel/CSV
✅ Proxy configurado para desarrollo local sin CORS
✅ Scripts de deployment para AWS S3 + CloudFront
✅ Testing E2E con Cypress
✅ Build optimizado con code splitting y compresión

Arquitectura de despliegue:
- Frontend: Vercel (SPA)
- Backend: AWS EC2 (https://eduexce-backend.ddns.net)
- Proxy: /api → backend (sin CORS)
- Base de datos: PostgreSQL (gestionada por backend)
```

---

**Fecha de completado**: 10 / 12 / 2025

**Completado por**: Sistema de análisis automático de código

---

Esta documentación técnica proporciona una visión completa del proyecto frontend EduExce, un panel administrativo web especializado para instituciones educativas del SENA.