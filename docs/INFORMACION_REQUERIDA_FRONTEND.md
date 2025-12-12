# 🌐 Información Requerida - Proyecto Frontend Web EduExce

Este documento lista toda la información necesaria del proyecto frontend web para completar el **Manual Técnico**.

---

## 📋 1. INFORMACIÓN GENERAL DEL PROYECTO

### 1.1 Datos Básicos
- [ ] **Nombre completo del proyecto**: EduExce Admin Panel / Dashboard Web
- [ ] **Versión actual**: 
- [ ] **Tipo de aplicación**:
  - [x] **Admin Panel (Dashboard administrativo)** - Panel web para instituciones educativas
- [ ] **Fecha de última versión**: 
- [ ] **Autores/Desarrolladores**:
  - Nombre 1:
  - Nombre 2:
  - Nombre 3:

### 1.2 Propósito
- [x] **Problema que resuelve**: 
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

- [x] **Usuarios objetivo**: 
  - [x] **Administradores del sistema** (Rol principal)
  - [x] **Coordinadores académicos**
  - [x] **Directivos de instituciones educativas**
  - [ ] ~~Estudiantes~~ (solo usan la app móvil)
  - [ ] ~~Docentes~~
  - [ ] ~~Invitados/Público~~

### 1.3 URL de Despliegue
- [ ] **URL de producción**: 
- [ ] **URL de staging/desarrollo**: 
- [ ] **Servicio de hosting**:
  - [ ] Vercel
  - [ ] Netlify
  - [ ] AWS (S3 + CloudFront)
  - [ ] Heroku
  - [ ] Firebase Hosting
  - [ ] Otro: ___________

---

## 🏗️ 2. ARQUITECTURA Y TECNOLOGÍAS

### 2.1 Framework Frontend Principal
- [ ] **Framework utilizado**:
  - [ ] React
  - [ ] Next.js (React con SSR/SSG)
  - [ ] Vue.js
  - [ ] Nuxt.js (Vue con SSR/SSG)
  - [ ] Angular
  - [ ] Svelte / SvelteKit
  - [ ] Otro: ___________

- [ ] **Versión del framework**: 

### 2.2 Tipo de Renderizado
- [ ] **Método de renderizado**:
  - [ ] SPA (Single Page Application - CSR)
  - [ ] SSR (Server-Side Rendering)
  - [ ] SSG (Static Site Generation)
  - [ ] ISR (Incremental Static Regeneration)
  - [ ] Híbrido (mixto)

### 2.3 Lenguaje de Programación
- [ ] **Lenguaje principal**:
  - [ ] JavaScript (ES6+)
  - [ ] TypeScript
  - [ ] Otro: ___________

- [ ] **Versión**: (ej: TypeScript 5.x, ES2022)

### 2.4 Build Tool
- [ ] **Herramienta de build**:
  - [ ] Vite
  - [ ] Webpack
  - [ ] Turbopack (Next.js 13+)
  - [ ] Rollup
  - [ ] esbuild
  - [ ] Parcel
  - [ ] Otra: ___________

- [ ] **Versión**: 

### 2.5 Patrón Arquitectónico
- [ ] **Arquitectura implementada**:
  - [ ] Component-Based Architecture
  - [ ] Atomic Design
  - [ ] Feature-Sliced Design
  - [ ] Flux (Redux)
  - [ ] MVVM
  - [ ] Clean Architecture
  - [ ] Otra: ___________

---

## 🛠️ 3. DEPENDENCIAS Y LIBRERÍAS

### 3.1 Gestión de Estado Global
- [ ] **Librería de estado**:
  - [ ] Redux / Redux Toolkit
  - [ ] MobX
  - [ ] Zustand
  - [ ] Recoil
  - [ ] Jotai
  - [ ] Context API (React)
  - [ ] Pinia (Vue)
  - [ ] NgRx (Angular)
  - [ ] Ninguna (props drilling)
  - [ ] Otra: ___________

- [ ] **Versión**: 

### 3.2 Sistema de Routing
- [ ] **Librería de routing**:
  - [ ] React Router
  - [ ] Next.js App Router
  - [ ] Next.js Pages Router
  - [ ] Vue Router
  - [ ] TanStack Router
  - [ ] Angular Router
  - [ ] Otra: ___________

- [ ] **Versión**: 

### 3.3 Cliente HTTP / Fetching
- [ ] **Librería para APIs**:
  - [ ] Axios
  - [ ] Fetch API (nativo)
  - [ ] TanStack Query (React Query)
  - [ ] SWR (Next.js)
  - [ ] Apollo Client (GraphQL)
  - [ ] tRPC
  - [ ] Otra: ___________

- [ ] **Versión**: 

### 3.4 Framework de UI/CSS
- [ ] **Framework de estilos**:
  - [ ] Tailwind CSS
  - [ ] Material-UI (MUI)
  - [ ] Ant Design
  - [ ] Chakra UI
  - [ ] Bootstrap
  - [ ] Mantine
  - [ ] shadcn/ui
  - [ ] CSS Modules
  - [ ] Styled Components
  - [ ] Emotion
  - [ ] SASS/SCSS
  - [ ] CSS-in-JS
  - [ ] Otro: ___________

- [ ] **Versión**: 

### 3.5 Gráficos y Visualización de Datos
- [ ] **Librería de charts**:
  - [ ] Chart.js
  - [ ] Recharts
  - [ ] Victory Charts
  - [ ] D3.js
  - [ ] ApexCharts
  - [ ] Nivo
  - [ ] Highcharts
  - [ ] Ninguna
  - [ ] Otra: ___________

### 3.6 Manejo de Formularios
- [ ] **Librería de formularios**:
  - [ ] React Hook Form
  - [ ] Formik
  - [ ] React Final Form
  - [ ] Manejo manual (useState)
  - [ ] Vuelidate (Vue)
  - [ ] Otra: ___________

- [ ] **Validación de schemas**:
  - [ ] Zod
  - [ ] Yup
  - [ ] Joi
  - [ ] class-validator
  - [ ] Otra: ___________

### 3.7 Autenticación
- [ ] **Sistema de autenticación**:
  - [ ] JWT manual
  - [ ] NextAuth.js
  - [ ] Auth0
  - [ ] Firebase Auth
  - [ ] Clerk
  - [ ] Supabase Auth
  - [ ] Otra: ___________

- [ ] **Almacenamiento de sesión**:
  - [ ] localStorage
  - [ ] sessionStorage
  - [ ] Cookies (httpOnly)
  - [ ] Estado global (Redux/Zustand)

### 3.8 Tablas de Datos
- [ ] **Librería de tablas**:
  - [ ] TanStack Table (React Table)
  - [ ] AG Grid
  - [ ] MUI DataGrid
  - [ ] Ant Design Table
  - [ ] Componente personalizado
  - [ ] Ninguna
  - [ ] Otra: ___________

### 3.9 Notificaciones/Toasts
- [ ] **Librería de notificaciones**:
  - [ ] react-toastify
  - [ ] react-hot-toast
  - [ ] Sonner
  - [ ] notistack
  - [ ] Componente personalizado
  - [ ] Otra: ___________

### 3.10 Otras Librerías Importantes
Lista de dependencias clave (copia del `package.json`):

```json
// Pegar aquí las dependencias principales
{
  "dependencies": {
    
  },
  "devDependencies": {
    
  }
}
```

---

## 📦 4. INSTALACIÓN Y CONFIGURACIÓN

### 4.1 Requisitos Previos
- [ ] **Node.js**: Versión: _______
- [ ] **npm / yarn / pnpm / bun**: Versión: _______
- [ ] **Git**: Para clonar el repositorio

### 4.2 Pasos de Instalación
Proporciona los comandos exactos:

```bash
# 1. Clonar repositorio
git clone [URL_DEL_REPO]

# 2. Entrar al directorio
cd nombre-del-proyecto

# 3. Instalar dependencias
npm install
# o
pnpm install
# o
yarn install

# 4. Copiar variables de entorno
cp .env.example .env.local

# 5. Configurar variables de entorno (editar .env.local)

# 6. Ejecutar en desarrollo
npm run dev
```

### 4.3 Variables de Entorno
Proporciona un ejemplo del archivo `.env` (sin valores sensibles):

```env
# API Backend
NEXT_PUBLIC_API_URL=https://eduexce-backend.ddns.net
NEXT_PUBLIC_API_TIMEOUT=20000

# Firebase (si aplica)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Autenticación
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Otros
NEXT_PUBLIC_ENV=development
```

### 4.4 Scripts Disponibles
Lista los comandos npm principales:

```json
{
  "scripts": {
    "dev": "______",
    "build": "______",
    "start": "______",
    "lint": "______",
    "test": "______"
  }
}
```

---

## 📁 5. ESTRUCTURA DEL PROYECTO

### 5.1 Árbol de Carpetas
Proporciona la estructura completa (usa `tree` o screenshot):

```
Ejemplo para Next.js App Router:
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── estudiante/
│   │   └── layout.tsx
│   ├── api/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── forms/
│   ├── charts/
│   └── layout/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
├── store/
│   └── store.ts
├── types/
│   └── index.ts
├── styles/
│   └── globals.css
├── public/
│   ├── images/
│   └── icons/
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

O para React tradicional:

```
/src
  /pages
  /components
  /services
  /store
  /hooks
  /utils
  /assets
  /types
```

### 5.2 Archivos de Configuración Principales
Lista los archivos de config y su propósito:

- [ ] `package.json` - Dependencias y scripts
- [ ] `next.config.js` / `vite.config.js` - Config del framework
- [ ] `tsconfig.json` - Config de TypeScript
- [ ] `tailwind.config.js` - Config de Tailwind (si aplica)
- [ ] `.eslintrc.json` - Config de ESLint
- [ ] `.prettierrc` - Config de Prettier
- [ ] `postcss.config.js` - Config de PostCSS
- [ ] Otros: ___________

---

## 🎯 6. FUNCIONALIDADES DEL SOFTWARE

### 6.1 Tipo de Aplicación
- [x] **Admin/Dashboard**: Panel administrativo exclusivo para colegios e instituciones
- [ ] ~~Portal de Estudiantes~~ (esto es exclusivo de la app móvil)

> **IMPORTANTE:** Los estudiantes NO usan la aplicación web. Ellos consumen los endpoints desde la **aplicación móvil** donde realizan sesiones de estudio, test de Kolb, retos, rankings, etc.

---

### 6.2 MÓDULOS DEL PANEL ADMINISTRATIVO

#### Autenticación y Seguridad
- [ ] **Login para administradores**
- [ ] **Recuperación de contraseña**
- [ ] **Verificación de roles (solo Admin)**
- [ ] **Cierre de sesión**
- [ ] **Control de permisos por rol**

#### Dashboard Principal
- [ ] **Resumen de estadísticas generales de la institución**
- [ ] **Gráficos de rendimiento académico**
- [ ] **Métricas por áreas ICFES** (Matemáticas, Lectura Crítica, Ciencias Naturales, Ciencias Sociales, Inglés)
- [ ] **Alertas automáticas de estudiantes en riesgo**
- [ ] **Notificaciones de áreas críticas**
- [ ] **Estudiantes activos/inactivos**
- [ ] **Progreso institucional en tiempo real**
- [ ] **Indicadores clave (KPIs) educativos**

#### Gestión de Estudiantes
- [ ] **Listar todos los estudiantes de la institución**
- [ ] **Crear nuevo estudiante**
- [ ] **Editar información de estudiante**
- [ ] **Eliminar/Desactivar estudiante**
- [ ] **Ver perfil completo del estudiante**
- [ ] **Historial académico del estudiante**
- [ ] **Filtros avanzados** (por área débil, nivel, estado, etc.)
- [ ] **Búsqueda por nombre, documento, código**
- [ ] **Paginación de resultados**
- [ ] **Exportar listado a Excel/CSV**

#### Gestión de Usuarios Administrativos
- [ ] **Listar administradores**
- [ ] **Crear nuevo administrador**
- [ ] **Editar permisos de administrador**
- [ ] **Desactivar administrador**
- [ ] **Asignar roles y permisos**

#### Gestión de Instituciones
- [ ] **Listar instituciones**
- [ ] **Crear institución**
- [ ] **Editar institución**
- [ ] **Eliminar institución**
- [ ] **Asignar usuarios a institución**

#### Seguimiento de Sesiones de Estudio
- [ ] **Ver todas las sesiones realizadas por estudiantes**
- [ ] **Filtrar por fecha/estudiante/área ICFES**
- [ ] **Ver detalles completos de cada sesión**
- [ ] **Preguntas respondidas (correctas/incorrectas)**
- [ ] **Tiempo invertido por sesión**
- [ ] **Estadísticas de rendimiento por sesión**
- [ ] **Identificar patrones de estudio**

#### Banco de Preguntas
- [ ] **Listar preguntas**
- [ ] **Crear pregunta manualmente**
- [ ] **Editar pregunta**
- [ ] **Eliminar pregunta**
- [ ] **Categorizar por área/nivel**
- [ ] **Importar preguntas (CSV/Excel)**

#### Seguimiento por Áreas ICFES
- [ ] **Dashboard de Matemáticas**
- [ ] **Dashboard de Lectura Crítica**
- [ ] **Dashboard de Ciencias Naturales**
- [ ] **Dashboard de Ciencias Sociales**
- [ ] **Dashboard de Inglés**
- [ ] **Comparativa entre áreas**
- [ ] **Identificación de áreas débiles institucionales**
- [ ] **Tendencias de mejora por área**
- [ ] **Estudiantes destacados por área**
- [ ] **Estudiantes con dificultades por área**

#### Reportes y Análisis Avanzados
- [ ] **Reporte de rendimiento individual por estudiante**
- [ ] **Reporte general de la institución**
- [ ] **Reporte de áreas críticas (alertas automáticas)**
- [ ] **Reporte de progreso mensual/trimestral**
- [ ] **Análisis comparativo entre grupos/cursos**
- [ ] **Gráficos de tendencias temporales**
- [ ] **Exportar reportes a PDF**
- [ ] **Exportar datos a Excel/CSV**
- [ ] **Reportes personalizados por fecha**

#### Seguimiento Detallado de Estudiantes
- [ ] **Ver progreso individual de cada estudiante**
- [ ] **Estudiantes en riesgo académico** (alertas rojas)
- [ ] **Estudiantes con bajo rendimiento** (alertas amarillas)
- [ ] **Historial completo de actividad**
- [ ] **Sesiones completadas y pendientes**
- [ ] **Áreas fuertes y débiles del estudiante**
- [ ] **Recomendaciones automáticas generadas por IA**
- [ ] **Evolución del rendimiento en el tiempo**
- [ ] **Comparación con el promedio institucional**

#### Gestión de Notificaciones (a Estudiantes)
- [ ] **Ver historial de notificaciones enviadas**
- [ ] **Notificaciones automáticas del sistema** (áreas críticas, inactividad)
- [ ] **Enviar notificación manual push a estudiantes**
- [ ] **Notificaciones masivas por grupo/institución**
- [ ] **Programar notificaciones futuras**
- [ ] **Configurar reglas de notificaciones automáticas**
- [ ] **Ver estadísticas de notificaciones** (entregadas, leídas)
- [ ] **Notificaciones sobre estudiantes en riesgo**
- [ ] **Alertas de rendimiento bajo en áreas específicas**

#### Métricas y Estadísticas Avanzadas
- [ ] **Dashboard de métricas institucionales**
- [ ] **Gráficos de rendimiento general**
- [ ] **Estadísticas por período (semanal, mensual, trimestral)**
- [ ] **Tasa de éxito por área ICFES**
- [ ] **Promedio institucional vs nacional**
- [ ] **Estudiantes activos vs inactivos**
- [ ] **Tiempo promedio de estudio**
- [ ] **Preguntas más falladas por área**
- [ ] **Evolución histórica del rendimiento**

#### Configuración del Sistema
- [ ] **Configurar parámetros generales del sistema**
- [ ] **Gestionar roles y permisos de administradores**
- [ ] **Configurar umbral de alertas** (ej: <60% = riesgo)
- [ ] **Configurar integración con OpenAI/IA**
- [ ] **Configurar notificaciones automáticas**
- [ ] **Configurar SMTP/Email**
- [ ] **Gestionar configuración de Firebase (push)**
- [ ] **Ajustes de privacidad y seguridad**

---

### 6.3 ❌ FUNCIONALIDADES NO INCLUIDAS EN LA WEB

> **IMPORTANTE:** Las siguientes funcionalidades son **exclusivas de la aplicación móvil** y NO están en el panel web administrativo:

- ❌ **Sesiones de estudio interactivas** (los estudiantes las hacen desde la app móvil)
- ❌ **Test de Kolb** (solo se realiza en la app móvil)
- ❌ **Retos entre estudiantes** (solo en móvil)
- ❌ **Rankings en vivo** (se consumen desde móvil)
- ❌ **Perfil de estudiante editable** (el estudiante lo edita desde móvil)
- ❌ **Notificaciones del estudiante** (recibidas en móvil)
- ❌ **Responder preguntas en tiempo real** (solo móvil)

**El panel web es SOLO para visualización, gestión y análisis de datos por parte de administradores.**

---

### 6.4 Funcionalidades Transversales del Panel Admin
- [ ] **Modo oscuro / Tema claro**
- [ ] **Internacionalización (i18n)** - Idiomas: _______
- [ ] **Responsive design** (móvil, tablet, desktop)
- [ ] **Accesibilidad (a11y)** - Estándares: _______
- [ ] **PWA (Progressive Web App)**
- [ ] **Búsqueda global**
- [ ] **Shortcuts de teclado**

---

## 🎨 7. INTERFAZ DE USUARIO (UI/UX)

### 7.1 Screenshots de Pantallas Principales
**Por favor, proporciona screenshots de las siguientes vistas del panel administrativo:**

1. **Login de Administrador**
2. **Dashboard Principal** (con métricas generales, gráficos, alertas)
3. **Gestión de Estudiantes** (tabla con listado)
4. **Perfil de Estudiante** (vista detallada individual)
5. **Seguimiento por Áreas ICFES** (gráficos por materia)
6. **Reportes y Analytics** (gráficos de tendencias)
7. **Estudiantes en Riesgo** (alertas y notificaciones)
8. **Gestión de Instituciones** (si aplica)
9. **Historial de Sesiones** (tabla de sesiones completadas)
10. **Banco de Preguntas** (CRUD de preguntas)
11. **Notificaciones** (gestión de notificaciones push)
12. **Configuración del Sistema**

### 7.2 Diseño Visual
- [ ] **Paleta de colores**:
  - Color primario: #______
  - Color secundario: #______
  - Color de acento: #______
  - Color de fondo: #______
  - Color de texto: #______
  - Colores de estado:
    - Success: #______
    - Error: #______
    - Warning: #______
    - Info: #______

- [ ] **Tipografía**:
  - Fuente principal: _______
  - Fuente secundaria: _______
  - Fuente monoespaciada (código): _______

- [ ] **Sistema de diseño**:
  - [ ] Material Design
  - [ ] Fluent Design (Microsoft)
  - [ ] Apple Human Interface Guidelines
  - [ ] Diseño personalizado
  - [ ] Otro: ___________

### 7.3 Layout y Estructura
- [ ] **Tipo de layout**:
  - [ ] Sidebar fijo + contenido
  - [ ] Top navbar + contenido
  - [ ] Sidebar colapsable
  - [ ] Layout adaptativo (cambia según resolución)

- [ ] **Navegación principal**:
  - [ ] Sidebar vertical
  - [ ] Navbar horizontal
  - [ ] Menú hamburguesa (móvil)
  - [ ] Breadcrumbs

### 7.4 Responsive Design
- [ ] **Breakpoints utilizados**:
  - Mobile: < ___ px
  - Tablet: ___ - ___ px
  - Desktop: > ___ px

- [ ] **¿Funciona bien en móviles?**: Sí / No
- [ ] **¿Tiene versión mobile-first?**: Sí / No

### 7.5 Accesibilidad
- [ ] **Estándares implementados**:
  - [ ] WCAG 2.1 AA
  - [ ] WCAG 2.1 AAA
  - [ ] Section 508
  - [ ] Ninguno aún

- [ ] **Características de accesibilidad**:
  - [ ] Navegación por teclado
  - [ ] Screen reader compatible
  - [ ] Alto contraste
  - [ ] Textos alternativos en imágenes
  - [ ] ARIA labels

---

## 🧪 8. TESTING

### 8.1 Tests Implementados
- [ ] **¿Tiene tests unitarios?**: Sí / No
- [ ] **Framework de testing**:
  - [ ] Jest
  - [ ] Vitest
  - [ ] Mocha
  - [ ] Jasmine
  - [ ] Otro: ___________

- [ ] **¿Tiene tests de componentes?**: Sí / No
- [ ] **Librería de testing de componentes**:
  - [ ] React Testing Library
  - [ ] Vue Test Utils
  - [ ] Enzyme
  - [ ] Otra: ___________

- [ ] **¿Tiene tests de integración?**: Sí / No

- [ ] **¿Tiene tests E2E?**: Sí / No
- [ ] **Framework E2E**:
  - [ ] Cypress
  - [ ] Playwright
  - [ ] Puppeteer
  - [ ] Selenium
  - [ ] Otro: ___________

### 8.2 Cobertura de Código
- [ ] **Porcentaje de cobertura**: ____%

### 8.3 Linting y Formateo
- [ ] **ESLint**: Sí / No - Config: _______
- [ ] **Prettier**: Sí / No
- [ ] **Husky (pre-commit hooks)**: Sí / No

---

## 🚀 9. BUILD Y DEPLOYMENT

### 9.1 Proceso de Build
```bash
# Comando de build para producción
npm run build

# Salida del build
# ¿Dónde se generan los archivos?
# Ejemplo: /dist, /.next, /build
```

- [ ] **Carpeta de output**: _______
- [ ] **Tamaño del bundle (aproximado)**: _____ MB

### 9.2 Optimizaciones de Build
- [ ] **Code splitting**: Sí / No
- [ ] **Tree shaking**: Sí / No
- [ ] **Lazy loading de componentes**: Sí / No
- [ ] **Image optimization**: Sí / No
- [ ] **Minificación**: Sí / No
- [ ] **Compresión (gzip/brotli)**: Sí / No

### 9.3 Despliegue
- [ ] **Plataforma de hosting**: (Vercel, Netlify, etc.)
- [ ] **URL de producción**: 
- [ ] **¿Usa CI/CD?**: Sí / No
- [ ] **Herramienta CI/CD**:
  - [ ] GitHub Actions
  - [ ] GitLab CI
  - [ ] Vercel (auto-deploy)
  - [ ] Netlify (auto-deploy)
  - [ ] Jenkins
  - [ ] CircleCI
  - [ ] Otra: ___________

### 9.4 Variables de Entorno en Producción
- [ ] **¿Cómo se gestionan las variables en producción?**
  - [ ] Panel de hosting (Vercel/Netlify)
  - [ ] Archivo .env.production
  - [ ] Secrets de GitHub
  - [ ] Otro: ___________

---

## 📊 10. INTEGRACIÓN CON BACKEND

### 10.1 Configuración de API
- [ ] **URL del backend**: https://eduexce-backend.ddns.net
- [ ] **Método de autenticación**: 
  - [ ] JWT Bearer Token
  - [ ] Session Cookies
  - [ ] OAuth
  - [ ] Otro: ___________

- [ ] **Timeout de requests**: _____ ms
- [ ] **Retry policy**: Sí / No - Reintentos: _____

### 10.2 Endpoints Consumidos
Lista los principales endpoints que consume el panel web administrativo:

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
GET    /api/admin/estudiantes/riesgo      (Estudiantes en riesgo)
GET    /api/admin/estudiantes/:id/progreso (Progreso individual)
```

**Gestión de Instituciones:**
```
GET    /api/admin/instituciones           (Listar instituciones)
POST   /api/admin/instituciones           (Crear institución)
PUT    /api/admin/instituciones/:id       (Actualizar institución)
DELETE /api/admin/instituciones/:id       (Eliminar institución)
```

**Sesiones y Seguimiento:**
```
GET    /api/admin/sesiones                (Todas las sesiones)
GET    /api/admin/sesiones/:id            (Detalle de sesión)
GET    /api/admin/sesiones/estudiante/:id (Sesiones por estudiante)
GET    /api/admin/sesiones/estadisticas   (Stats de sesiones)
```

**Banco de Preguntas:**
```
GET    /api/admin/preguntas               (Listar preguntas)
POST   /api/admin/preguntas               (Crear pregunta)
PUT    /api/admin/preguntas/:id           (Actualizar pregunta)
DELETE /api/admin/preguntas/:id           (Eliminar pregunta)
POST   /api/admin/preguntas/importar      (Importar CSV/Excel)
```

**Notificaciones:**
```
GET    /api/admin/notificaciones          (Historial de notificaciones)
POST   /api/admin/notificaciones/enviar   (Enviar notificación push)
POST   /api/admin/notificaciones/masiva   (Enviar notificación masiva)
GET    /api/admin/notificaciones/stats    (Estadísticas de notificaciones)
```

**Reportes:**
```
GET    /api/admin/reportes/rendimiento    (Reporte de rendimiento)
GET    /api/admin/reportes/areas          (Reporte por áreas ICFES)
GET    /api/admin/reportes/exportar       (Exportar a Excel/PDF)
GET    /api/admin/reportes/institucional  (Reporte institucional)
```

**Usuarios Admin:**
```
GET    /api/admin/usuarios                (Listar administradores)
POST   /api/admin/usuarios                (Crear administrador)
PUT    /api/admin/usuarios/:id            (Actualizar admin)
DELETE /api/admin/usuarios/:id            (Eliminar admin)
```

> **Nota:** Los endpoints de sesiones interactivas, test de Kolb, retos, rankings en tiempo real, etc., son consumidos ÚNICAMENTE por la aplicación móvil, no por el panel web.

### 10.3 Manejo de Estados HTTP
- [ ] **¿Maneja errores 401 (no autorizado)?**: Sí / No - Acción: _______
- [ ] **¿Maneja errores 403 (prohibido)?**: Sí / No - Acción: _______
- [ ] **¿Maneja errores 404 (no encontrado)?**: Sí / No
- [ ] **¿Maneja errores 500 (error del servidor)?**: Sí / No
- [ ] **¿Muestra mensajes de error al usuario?**: Sí / No

### 10.4 Interceptores/Middleware HTTP
- [ ] **¿Usa interceptores?**: Sí / No
- [ ] **Funcionalidad de los interceptores**:
  - [ ] Agregar token automáticamente
  - [ ] Refresh token automático
  - [ ] Logging de requests
  - [ ] Manejo global de errores
  - [ ] Otro: ___________

---

## 🔒 11. SEGURIDAD

### 11.1 Autenticación y Autorización
- [ ] **¿Verifica roles del usuario?**: Sí / No
- [ ] **¿Protege rutas privadas?**: Sí / No
- [ ] **¿Implementa guards/middleware de ruta?**: Sí / No

### 11.2 Almacenamiento
- [ ] **¿Dónde almacena el token?**:
  - [ ] localStorage
  - [ ] sessionStorage
  - [ ] Cookies httpOnly
  - [ ] Estado en memoria (Redux/Zustand)

### 11.3 Validación de Inputs
- [ ] **¿Valida inputs del usuario?**: Sí / No
- [ ] **¿Usa librería de validación?**: Zod / Yup / Joi / Otra
- [ ] **¿Sanitiza datos antes de enviar?**: Sí / No

### 11.4 Prevención de Vulnerabilidades
- [ ] **¿Previene XSS (Cross-Site Scripting)?**: Sí / No
- [ ] **¿Previene CSRF?**: Sí / No
- [ ] **¿Usa Content Security Policy (CSP)?**: Sí / No
- [ ] **¿Implementa rate limiting en el cliente?**: Sí / No

---

## 📈 12. PERFORMANCE

### 12.1 Métricas de Performance
- [ ] **Lighthouse Score** (si conoces):
  - Performance: _____ / 100
  - Accessibility: _____ / 100
  - Best Practices: _____ / 100
  - SEO: _____ / 100

### 12.2 Optimizaciones Implementadas
- [ ] **Lazy loading de imágenes**: Sí / No
- [ ] **Lazy loading de componentes**: Sí / No
- [ ] **Memoization (React.memo, useMemo)**: Sí / No
- [ ] **Virtual scrolling (para listas largas)**: Sí / No
- [ ] **Service Workers (PWA)**: Sí / No
- [ ] **Code splitting por rutas**: Sí / No

---

## 🌐 13. SEO (si aplica)

### 13.1 Optimización SEO
- [ ] **¿La app necesita SEO?**: Sí / No (los dashboards privados generalmente no)
- [ ] **¿Usa meta tags dinámicos?**: Sí / No
- [ ] **¿Genera sitemap.xml?**: Sí / No
- [ ] **¿Usa Open Graph tags?**: Sí / No
- [ ] **¿Implementa Schema.org markup?**: Sí / No

---

## 📚 14. DOCUMENTACIÓN

### 14.1 README del Proyecto
- [ ] **¿Tiene README completo?**: Sí / No
- [ ] **Incluye**:
  - [ ] Descripción del proyecto
  - [ ] Instrucciones de instalación
  - [ ] Comandos disponibles
  - [ ] Guía de desarrollo
  - [ ] Guía de despliegue
  - [ ] Troubleshooting

### 14.2 Documentación de Componentes
- [ ] **¿Usa Storybook?**: Sí / No
- [ ] **¿Documenta componentes con JSDoc/TSDoc?**: Sí / No

### 14.3 Changelog
- [ ] **¿Mantiene un CHANGELOG?**: Sí / No

---

## 🌍 15. COMPATIBILIDAD DE NAVEGADORES

### 15.1 Navegadores Soportados
- [ ] **Chrome**: Versión mínima: _______
- [ ] **Firefox**: Versión mínima: _______
- [ ] **Safari**: Versión mínima: _______
- [ ] **Edge**: Versión mínima: _______
- [ ] **Opera**: Sí / No
- [ ] **Internet Explorer**: ¿Soportado? (espero que no 😅)

### 15.2 Polyfills
- [ ] **¿Usa polyfills para navegadores antiguos?**: Sí / No
- [ ] **¿Cuáles?**: _______

---

## ✅ 16. INFORMACIÓN COMPLEMENTARIA

### 16.1 Repositorio
- [ ] **URL del repositorio**: 
- [ ] **Branch principal**: 
- [ ] **Branch de desarrollo**: 
- [ ] **¿Es privado o público?**: 

### 16.2 Equipo y Contacto
- [ ] **Email del equipo**: 
- [ ] **Instructor/Tutor**: 
- [ ] **Scrum Master / Lead**: 

### 16.3 Observaciones Adicionales
Cualquier información adicional relevante:

```
Escribe aquí cualquier detalle importante que no se haya cubierto en las secciones anteriores:
- Características únicas del proyecto
- Desafíos técnicos superados
- Tecnologías experimentales usadas
- Planes futuros de mejora
- etc.
```

---

## 📝 NOTAS FINALES

**Instrucciones para completar este documento:**

1. ✅ Marca cada checkbox con `[x]` cuando completes la información
2. 📄 Adjunta screenshots en una carpeta llamada `/screenshots-frontend`
3. 📋 Copia el contenido de `package.json` completo en la sección 3.10
4. 🌳 Genera el árbol de carpetas con: `tree -L 3 -I 'node_modules|.next|build|dist|.git'`
5. 📸 Nombra los screenshots de forma descriptiva:
   - `01-login-page.png`
   - `02-admin-dashboard.png`
   - `03-student-session.png`
   - etc.
6. 🔗 Si está desplegado, incluye el link de producción
7. 📊 Si tienes métricas de Lighthouse, adjúntalas

**Fecha de completado**: ___ / ___ / _____

**Completado por**: _________________

---

**Una vez completes este documento, podremos generar el Manual Técnico completo del proyecto frontend.**

**Nota:** Si el proyecto frontend tiene secciones tanto de Admin como de Estudiante en la misma app, marca ambas secciones. Si son aplicaciones separadas, especifícalo claramente.
