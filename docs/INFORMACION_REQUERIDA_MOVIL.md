# 📱 Información Requerida - Proyecto Móvil EduExce

Este documento lista toda la información necesaria del proyecto móvil para completar el **Manual Técnico**.

---

## 📋 1. INFORMACIÓN GENERAL DEL PROYECTO

### 1.1 Datos Básicos
- [ ] **Nombre completo del proyecto**: 
- [ ] **Versión actual**: 
- [ ] **Plataforma(s)**: 
  - [ ] Android
  - [ ] iOS
  - [ ] Ambas
- [ ] **Fecha de última versión**: 
- [ ] **Autores/Desarrolladores**:
  - Nombre 1:
  - Nombre 2:
  - Nombre 3:

### 1.2 Propósito
- [ ] **Problema que resuelve**: 
  ```
  Descripción del problema principal que aborda la aplicación móvil
  ```

- [ ] **Usuarios objetivo**: 
  - [ ] Estudiantes
  - [ ] Administradores
  - [ ] Docentes
  - [ ] Otros: ___________

---

## 🏗️ 2. ARQUITECTURA Y TECNOLOGÍAS

### 2.1 Framework Principal
- [ ] **Framework utilizado**:
  - [ ] React Native
  - [ ] Flutter
  - [ ] Kotlin (Android nativo)
  - [ ] Swift (iOS nativo)
  - [ ] Ionic
  - [ ] Otro: ___________

- [ ] **Versión del framework**: 

### 2.2 Lenguaje de Programación
- [ ] **Lenguaje principal**:
  - [ ] JavaScript
  - [ ] TypeScript
  - [ ] Dart
  - [ ] Kotlin
  - [ ] Swift
  - [ ] Otro: ___________

- [ ] **Versión del lenguaje**: 

### 2.3 Patrón Arquitectónico
- [ ] **Arquitectura implementada**:
  - [ ] MVVM (Model-View-ViewModel)
  - [ ] MVC (Model-View-Controller)
  - [ ] Clean Architecture
  - [ ] Redux Pattern
  - [ ] BLoC (Business Logic Component)
  - [ ] Otra: ___________

### 2.4 SDK y Requisitos Mínimos
**Para Android:**
- [ ] Android SDK mínimo: (ej: API 21 / Android 5.0)
- [ ] Android SDK objetivo: (ej: API 34 / Android 14)

**Para iOS:**
- [ ] Versión mínima de iOS: (ej: iOS 13.0)
- [ ] Versión objetivo: (ej: iOS 17.0)

---

## 🛠️ 3. DEPENDENCIAS Y LIBRERÍAS

### 3.1 Gestión de Estado
- [ ] **Librería de estado global**:
  - [ ] Redux / Redux Toolkit
  - [ ] MobX
  - [ ] Provider (Flutter)
  - [ ] Bloc (Flutter)
  - [ ] Context API (React Native)
  - [ ] Zustand
  - [ ] Otra: ___________

### 3.2 Navegación
- [ ] **Sistema de navegación**:
  - [ ] React Navigation
  - [ ] Navigator (Flutter)
  - [ ] React Native Navigation
  - [ ] Otra: ___________
- [ ] **Versión**: 

### 3.3 Cliente HTTP
- [ ] **Librería para APIs**:
  - [ ] Axios
  - [ ] Dio (Flutter)
  - [ ] Fetch API
  - [ ] Retrofit (Kotlin)
  - [ ] Otra: ___________
- [ ] **Versión**: 

### 3.4 Autenticación
- [ ] **Método de autenticación**:
  - [ ] JWT (JSON Web Tokens)
  - [ ] OAuth 2.0
  - [ ] Firebase Auth
  - [ ] Otro: ___________
- [ ] **Almacenamiento de tokens**:
  - [ ] AsyncStorage (React Native)
  - [ ] SecureStore (Expo)
  - [ ] SharedPreferences (Android)
  - [ ] Keychain (iOS)
  - [ ] Secure Storage (Flutter)

### 3.5 Notificaciones Push
- [ ] **Servicio utilizado**:
  - [ ] Firebase Cloud Messaging (FCM)
  - [ ] OneSignal
  - [ ] AWS SNS
  - [ ] Otro: ___________
- [ ] **Librería**: 
- [ ] **Versión**: 

### 3.6 Base de Datos Local
- [ ] **¿Usa almacenamiento local?**: Sí / No
- [ ] **Tecnología**:
  - [ ] SQLite
  - [ ] Realm
  - [ ] AsyncStorage
  - [ ] Hive (Flutter)
  - [ ] WatermelonDB
  - [ ] Otra: ___________

### 3.7 UI/Componentes
- [ ] **Framework de UI**:
  - [ ] React Native Paper
  - [ ] Native Base
  - [ ] Material Design (Flutter)
  - [ ] UI Kitten
  - [ ] Componentes nativos personalizados
  - [ ] Otro: ___________

### 3.8 Otras Librerías Importantes
Lista de dependencias clave (copia del `package.json` o `pubspec.yaml`):

```json
// Pegar aquí las dependencias principales
{
  "dependencies": {
    
  }
}
```

---

## 📦 4. INSTALACIÓN Y CONFIGURACIÓN

### 4.1 Requisitos Previos
- [ ] **Node.js**: Versión: _______
- [ ] **npm/yarn/pnpm**: Versión: _______
- [ ] **Java JDK** (para Android): Versión: _______
- [ ] **Android Studio**: Versión: _______
- [ ] **Xcode** (para iOS): Versión: _______
- [ ] **Flutter SDK** (si aplica): Versión: _______
- [ ] **Expo CLI** (si aplica): Versión: _______

### 4.2 Pasos de Instalación
Proporciona los comandos exactos:

```bash
# 1. Clonar repositorio
git clone [URL_DEL_REPO]

# 2. Entrar al directorio
cd nombre-del-proyecto

# 3. Instalar dependencias
npm install  # o flutter pub get

# 4. Instalar pods de iOS (si aplica)
cd ios && pod install && cd ..

# 5. Ejecutar en desarrollo
npm run android  # o npm run ios
```

### 4.3 Configuración de Firebase
- [ ] **¿Requiere configuración de Firebase?**: Sí / No
- [ ] **Archivos necesarios**:
  - [ ] `google-services.json` (Android) - Ubicación: _______
  - [ ] `GoogleService-Info.plist` (iOS) - Ubicación: _______

### 4.4 Variables de Entorno
Proporciona un ejemplo del archivo `.env` (sin valores sensibles):

```env
API_URL=https://eduexce-backend.ddns.net
API_TIMEOUT=20000
ENVIRONMENT=development
```

### 4.5 Permisos Requeridos
Lista de permisos que solicita la app:

**Android (`AndroidManifest.xml`):**
- [ ] INTERNET
- [ ] CAMERA
- [ ] WRITE_EXTERNAL_STORAGE
- [ ] READ_EXTERNAL_STORAGE
- [ ] ACCESS_NETWORK_STATE
- [ ] POST_NOTIFICATIONS
- [ ] Otros: ___________

**iOS (`Info.plist`):**
- [ ] NSCameraUsageDescription
- [ ] NSPhotoLibraryUsageDescription
- [ ] NSLocationWhenInUseUsageDescription
- [ ] Otros: ___________

---

## 📁 5. ESTRUCTURA DEL PROYECTO

### 5.1 Árbol de Carpetas
Proporciona la estructura completa (usa `tree` o screenshot):

```
Ejemplo:
/src
  /screens
    - LoginScreen.tsx
    - HomeScreen.tsx
    - ProfileScreen.tsx
  /components
    - Button.tsx
    - Card.tsx
  /services
    - api.ts
    - authService.ts
  /store
    - store.ts
    - slices/
  /navigation
    - AppNavigator.tsx
  /utils
    - constants.ts
    - helpers.ts
  /assets
    - images/
    - fonts/
  /models
    - User.ts
    - Session.ts
```

### 5.2 Archivos de Configuración Principales
Lista los archivos de config y su propósito:

- [ ] `package.json` / `pubspec.yaml`
- [ ] `app.json` (Expo/React Native)
- [ ] `tsconfig.json`
- [ ] `babel.config.js`
- [ ] `metro.config.js`
- [ ] Otros: ___________

---

## 🎯 6. FUNCIONALIDADES DEL SOFTWARE

### 6.1 Módulos Principales
Marca y describe cada módulo implementado:

#### Autenticación
- [ ] **Login con email/contraseña**
- [ ] **Registro de nuevos usuarios**
- [ ] **Recuperación de contraseña**
- [ ] **Cierre de sesión**
- [ ] **Verificación de cuenta**

#### Perfil de Usuario
- [ ] **Ver perfil**
- [ ] **Editar información personal**
- [ ] **Cambiar contraseña**
- [ ] **Subir foto de perfil**
- [ ] **Ver estadísticas personales**

#### Sesiones de Estudio
- [ ] **Iniciar nueva sesión**
- [ ] **Ver preguntas generadas por IA**
- [ ] **Responder preguntas**
- [ ] **Ver resultados de la sesión**
- [ ] **Historial de sesiones**
- [ ] **Filtrar por materia/área**

#### Test de Kolb (Estilos de Aprendizaje)
- [ ] **Realizar test de Kolb**
- [ ] **Ver resultado del estilo de aprendizaje**
- [ ] **Ver recomendaciones personalizadas**

#### Notificaciones
- [ ] **Recibir notificaciones push**
- [ ] **Ver historial de notificaciones**
- [ ] **Marcar como leídas**
- [ ] **Configurar preferencias de notificaciones**

#### Retos
- [ ] **Ver retos disponibles**
- [ ] **Participar en retos**
- [ ] **Ver retos completados**
- [ ] **Invitar a otros estudiantes**

#### Rankings
- [ ] **Ver ranking general**
- [ ] **Ver ranking por institución**
- [ ] **Ver ranking por nivel**
- [ ] **Ver mi posición**

#### Dashboard
- [ ] **Ver resumen de progreso**
- [ ] **Gráficos de estadísticas**
- [ ] **Logros obtenidos**
- [ ] **Áreas de mejora**

#### Configuración
- [ ] **Cambiar tema (claro/oscuro)**
- [ ] **Configurar notificaciones**
- [ ] **Idioma**
- [ ] **Cerrar sesión**

### 6.2 Funcionalidades Offline
- [ ] **¿Funciona sin conexión?**: Sí / No
- [ ] **¿Qué funcionalidades están disponibles offline?**:
  - 
  - 

### 6.3 Sincronización
- [ ] **¿Sincroniza datos al recuperar conexión?**: Sí / No
- [ ] **¿Qué datos se sincronizan?**:
  - 
  - 

---

## 🎨 7. INTERFAZ DE USUARIO (UI/UX)

### 7.1 Screenshots de Pantallas Principales
**Por favor, proporciona screenshots de las siguientes pantallas:**

1. **Splash Screen / Intro**
2. **Login / Registro**
3. **Home / Dashboard Principal**
4. **Sesión de Estudio (en progreso)**
5. **Resultados de Sesión**
6. **Perfil de Usuario**
7. **Notificaciones**
8. **Rankings**
9. **Test de Kolb**
10. **Configuración**

### 7.2 Diseño Visual
- [ ] **Paleta de colores**:
  - Color primario: #______
  - Color secundario: #______
  - Color de acento: #______
  - Color de fondo: #______
  - Color de texto: #______

- [ ] **Tipografía**:
  - Fuente principal: _______
  - Fuente secundaria: _______

- [ ] **Sistema de diseño**:
  - [ ] Material Design (Android)
  - [ ] Cupertino (iOS)
  - [ ] Diseño personalizado
  - [ ] Otro: ___________

### 7.3 Navegación
Describe el flujo de navegación entre pantallas:

```
Ejemplo:
Splash → Login → Home → [Sesiones / Perfil / Rankings / Notificaciones]
```

O proporciona un diagrama de flujo de navegación.

### 7.4 Responsive/Adaptabilidad
- [ ] **¿Se adapta a diferentes tamaños de pantalla?**: Sí / No
- [ ] **Orientaciones soportadas**:
  - [ ] Vertical (Portrait)
  - [ ] Horizontal (Landscape)
  - [ ] Ambas

---

## 🧪 8. TESTING

### 8.1 Tests Implementados
- [ ] **¿Tiene tests unitarios?**: Sí / No
- [ ] **Framework de testing**:
  - [ ] Jest
  - [ ] Mocha
  - [ ] Flutter Test
  - [ ] Otro: ___________

- [ ] **¿Tiene tests de integración?**: Sí / No
- [ ] **Framework**:
  - [ ] Detox
  - [ ] Appium
  - [ ] Flutter Integration Tests
  - [ ] Otro: ___________

- [ ] **¿Tiene tests E2E?**: Sí / No

### 8.2 Cobertura de Código
- [ ] **Porcentaje de cobertura**: ____%

---

## 📱 9. BUILD Y DEPLOYMENT

### 9.1 Configuración de Build
**Android:**
- [ ] **Build type**: Debug / Release
- [ ] **Versión de Gradle**: _______
- [ ] **Comando de build**: 
  ```bash
  npm run build:android
  # o
  flutter build apk
  ```

**iOS:**
- [ ] **Configuración de signing**
- [ ] **Comando de build**:
  ```bash
  npm run build:ios
  # o
  flutter build ios
  ```

### 9.2 Despliegue
- [ ] **¿Está publicada en tiendas?**
  - [ ] Google Play Store - Link: _______
  - [ ] Apple App Store - Link: _______
  - [ ] Distribución interna/TestFlight

- [ ] **¿Usa CI/CD?**: Sí / No
- [ ] **Herramienta**:
  - [ ] GitHub Actions
  - [ ] GitLab CI
  - [ ] Bitrise
  - [ ] Fastlane
  - [ ] Otra: ___________

---

## 📊 10. INTEGRACIÓN CON BACKEND

### 10.1 API Connection
- [ ] **URL del backend**: https://eduexce-backend.ddns.net
- [ ] **Autenticación**: JWT Bearer Token
- [ ] **Timeout de requests**: _____ ms

### 10.2 Endpoints Utilizados
Lista los principales endpoints que consume la app:

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/perfil
POST   /api/sesiones/iniciar
GET    /api/notificaciones
...
```

### 10.3 Manejo de Errores
- [ ] **¿Cómo maneja errores de red?**
- [ ] **¿Muestra mensajes de error al usuario?**
- [ ] **¿Implementa retry automático?**

---

## 🔒 11. SEGURIDAD

### 11.1 Almacenamiento Seguro
- [ ] **¿Encripta datos sensibles localmente?**: Sí / No
- [ ] **¿Usa almacenamiento seguro para tokens?**: Sí / No

### 11.2 Comunicación
- [ ] **¿Usa HTTPS exclusivamente?**: Sí / No
- [ ] **¿Implementa certificate pinning?**: Sí / No

### 11.3 Validación
- [ ] **¿Valida inputs del usuario?**: Sí / No
- [ ] **¿Sanitiza datos antes de enviar al backend?**: Sí / No

---

## 📚 12. DOCUMENTACIÓN ADICIONAL

### 12.1 README del Proyecto
- [ ] **¿Tiene README completo?**: Sí / No
- [ ] **Incluye**:
  - [ ] Descripción del proyecto
  - [ ] Instrucciones de instalación
  - [ ] Guía de uso
  - [ ] Troubleshooting

### 12.2 Comentarios en Código
- [ ] **¿El código está bien comentado?**: Sí / No
- [ ] **¿Usa JSDoc/TSDoc/Dartdoc?**: Sí / No

### 12.3 Changelog
- [ ] **¿Mantiene un CHANGELOG?**: Sí / No

---

## ✅ 13. INFORMACIÓN COMPLEMENTARIA

### 13.1 Repositorio
- [ ] **URL del repositorio**: 
- [ ] **Branch principal**: 
- [ ] **Branch de desarrollo**: 

### 13.2 Contacto
- [ ] **Email del equipo**: 
- [ ] **Instructor/Tutor**: 

### 13.3 Observaciones
Cualquier información adicional relevante:

```
Escribe aquí cualquier detalle importante que no se haya cubierto en las secciones anteriores.
```

---

## 📝 NOTAS FINALES

**Instrucciones para completar este documento:**

1. ✅ Marca cada checkbox con `[x]` cuando completes la información
2. 📄 Adjunta screenshots en una carpeta llamada `/screenshots`
3. 📋 Copia el contenido de `package.json` o `pubspec.yaml` en la sección 3.8
4. 🌳 Genera el árbol de carpetas con: `tree -L 3 -I 'node_modules|build|.git'`
5. 📸 Nombra los screenshots de forma descriptiva (ej: `01-login-screen.png`)

**Fecha de completado**: ___ / ___ / _____

**Completado por**: _________________

---

**Una vez completes este documento, podremos generar el Manual Técnico completo del proyecto móvil.**
