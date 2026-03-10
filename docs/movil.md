📱 Manual Técnico - Proyecto Móvil EduExceDocumento de Información Técnica Completa📋 1. INFORMACIÓN GENERAL DEL PROYECTO1.1 Datos Básicos•[x] Nombre completo del proyecto: EduExce - Plataforma Educativa Móvil•[x] Versión actual: 1.0.0•[x] Plataforma(s):•[x] Android•[ ] iOS•[ ] Ambas•[x] Fecha de última versión: 2025-12-04•[x] Autores/Desarrolladores:•Package: com.example.zavira_movil•Desarrolladores: Equipo EduExce1.2 Propósito•[x] Problema que resuelve:Proporcionar a los estudiantes una plataforma interactiva y efectiva para 
prepararse para el examen ICFES, con preguntas generadas por IA alimentada 
con información oficial del ICFES, sistema de gamificación con vidas, retos 
1vs1, y análisis detallado del progreso académico.•[x] Usuarios objetivo:•[x] Estudiantes (Preparación ICFES)•[ ] Administradores•[ ] Docentes•[ ] Otros: ___________🏗️ 2. ARQUITECTURA Y TECNOLOGÍAS2.1 Framework Principal•[x] Framework utilizado:•[ ] React Native•[ ] Flutter•[x] Java/Kotlin (Android nativo)•[ ] Swift (iOS nativo)•[ ] Ionic•[ ] Otro: ___________•[x] Versión del framework: Android SDK 362.2 Lenguaje de Programación•[x] Lenguaje principal:•[ ] JavaScript•[ ] TypeScript•[ ] Dart•[ ] Kotlin•[ ] Swift•[x] Java•[ ] Otro: ___________•[x] Versión del lenguaje: Java 112.3 Patrón Arquitectónico•[x] Arquitectura implementada:•[ ] MVVM (Model-View-ViewModel)•[ ] MVC (Model-View-Controller)•[ ] Clean Architecture•[ ] Redux Pattern•[ ] BLoC (Business Logic Component)•[x] Arquitectura personalizada con patrones:•🏛️ Singleton - RetrofitClient, Sincronizadores•🏭 Factory - Adaptadores y ViewHolders•👀 Observer - BroadcastReceivers para actualizaciones en tiempo real•🎯 Repository - Capa de abstracción de datos•🔌 Interceptor - Manejo de headers, auth y logging2.4 SDK y Requisitos MínimosPara Android:•[x] Android SDK mínimo: API 24 (Android 7.0 Nougat)•[x] Android SDK objetivo: API 36 (Android 14+)•[x] compileSdk: 36Para iOS:•[ ] No aplica🛠️ 3. DEPENDENCIAS Y LIBRERÍAS3.1 Gestión de Estado•[x] Gestión de estado:•💾 SharedPreferences - Persistencia local•📢 LocalBroadcastManager - Comunicación entre componentes•🔄 Sincronización bidireccional con backend•⏰ Handler & Runnable - Actualizaciones en tiempo real3.2 Navegación•[x] Sistema de navegación:•Navegación nativa Android con Intents•Activity-based navigation•Fragment navigation con FragmentManager•ViewPager2 para navegación de tabs3.3 Cliente HTTP•[x] Librería para APIs:•[x] Retrofit 2.9.0•[x] Gson (Converter)•[x] OkHttp 4.12.0•[x] OkHttp Logging Interceptor 4.11.0•[x] Versión: Retrofit 2.9.03.4 Autenticación•[x] Método de autenticación:•[x] JWT (JSON Web Tokens)•[ ] OAuth 2.0•[ ] Firebase Auth•[ ] Otro: ___________•[x] Almacenamiento de tokens:•[x] SharedPreferences con TokenManager•Almacenamiento seguro de tokens JWT•Manejo automático de sesiones expiradas (401)3.5 Notificaciones Push•[x] Servicio utilizado:•[x] Firebase Cloud Messaging (FCM)•[ ] OneSignal•[ ] AWS SNS•[ ] Otro: ___________•[x] Librería: Firebase BOM 34.5.0•[x] Versión: 34.5.0•[x] Implementación: MyFirebaseMessagingService•[x] Features:•Notificaciones de retos 1vs1•Indicador de retos pendientes con badge•Manejo de notificaciones en foreground y background3.6 Base de Datos Local•[x] ¿Usa almacenamiento local?: Sí•[x] Tecnología:•[x] SharedPreferences•Almacenamiento de:•Tokens JWT•Progreso del usuario•Vidas por nivel•Timestamps de recarga•Configuraciones de usuario3.7 UI/Componentes•[x] Framework de UI:•[x] Material Design 3•[x] Material Components 1.13.0-alpha05•[x] View Binding•[x] RecyclerView & CardView•[x] ConstraintLayout•[x] SwipeRefreshLayout•[x] Componentes personalizados3.8 Otras Librerías ImportantesDependencias principales (build.gradle.kts):dependencies {
    // Firebase BoM (Bill of Materials)
    implementation(platform("com.google.firebase:firebase-bom:34.5.0"))
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.google.firebase:firebase-analytics")
    
    // Networking - Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Material Design
    implementation("com.google.android.material:material:1.13.0-alpha05")

    // AndroidX
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")

    // Image Loading - Glide
    implementation("com.github.bumptech.glide:glide:4.16.0")
    annotationProcessor("com.github.bumptech.glide:compiler:4.16.0")

    // UI Components
    implementation("com.github.lzyzsd:circleprogress:1.2.1")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}📦 4. INSTALACIÓN Y CONFIGURACIÓN4.1 Requisitos Previos•[x] JDK: Versión 11+•[x] Gradle: Versión 8.13 (Gradle Wrapper)•[x] Android Studio: Hedgehog (2023.1.1) o superior•[x] Android SDK: API 24+ (mínimo), API 36 (target)•[x] Firebase Console: Cuenta activa para FCM4.2 Pasos de Instalación# 1. Clonar repositorio
git clone https://github.com/tu-usuario/EDUEXCE_MOVIL_MOVIL.git

# 2. Entrar al directorio
cd EDUEXCE_MOVIL_MOVIL

# 3. Abrir en Android Studio
# File → Open → Seleccionar carpeta del proyecto

# 4. Sync Gradle (automático o manual)
# Click en "Sync Now" cuando aparezca la notificación

# 5. Configurar Firebase (ver sección 4.3)

# 6. Ejecutar en dispositivo/emulador
# Click en Run ▶️ o Shift + F104.3 Configuración de Firebase•[x] ¿Requiere configuración de Firebase?: Sí•[x] Archivos necesarios:•[x] google-services.json (Android) - Ubicación: app/google-services.json•[ ] GoogleService-Info.plist (iOS) - No aplicaPasos para configurar Firebase:1.Ir a Firebase Console2.Crear/seleccionar proyecto3.Agregar app Android con package name: com.example.zavira_movil4.Descargar google-services.json5.Colocar en la carpeta app/6.Verificar que build.gradle.kts tiene el plugin: id("com.google.gms.google-services")4.4 Variables de Entorno / ConfiguraciónConfiguración de Backend URL:Editar en app/src/main/java/com/example/zavira_movil/remote/RetrofitClient.java:// PRODUCCIÓN
private static final String BASE_URL = "https://eduexce-backend.ddns.net/";

// DESARROLLO (Emulador Android)
// private static final String BASE_URL = "http://10.0.2.2:3333/";

// DESARROLLO (Dispositivo físico)
// private static final String BASE_URL = "http://192.168.X.X:3333/";Configuración de Timeouts:•Connection Timeout: 30 segundos•Read Timeout: 30 segundos•Write Timeout: 30 segundos4.5 Permisos RequeridosAndroid (AndroidManifest.xml):•[x] INTERNET - Comunicación con backend•[x] CAMERA - Subir foto de perfil•[x] POST_NOTIFICATIONS - Notificaciones push (Android 13+)•[x] VIBRATE - Vibración para notificaciones•[x] ACCESS_NETWORK_STATE - Verificar conectividad<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />📁 5. ESTRUCTURA DEL PROYECTO5.1 Árbol de Carpetasapp/src/main/java/com/example/zavira_movil/
│
├── 📱 Activities Principales
│   ├── MainActivity.java              # Splash/Launcher
│   ├── LoginActivity.java             # Autenticación
│   ├── InfoTestActivity.java          # Test de Kolb
│   ├── TestActivity.java              # Test académico
│   └── ResultActivity.java            # Resultados
│
├── 🏠 Home/
│   ├── HomeActivity.java              # Dashboard principal
│   ├── NotificationsActivity.java     # Historial de notificaciones
│   └── SplashActivity.java            # Pantalla de carga
│
├── 🎮 niveleshome/ (Sistema de Quiz)
│   ├── QuizActivity.java              # Ejecución de quiz
│   ├── MapaActivity.java              # Mapa de islas
│   ├── SubjectDetailActivity.java     # Detalle de materia
│   ├── SimulacroActivity.java         # Simulacros
│   ├── LivesManager.java              # ⭐ Sistema de vidas
│   ├── ProgressLockManager.java       # Control de desbloqueo
│   └── MapeadorArea.java              # Mapeo de áreas
│
├── 🏝️ HislaConocimiento/
│   ├── IslasActivity.java             # Vista de islas
│   └── IslaSimulacroActivity.java     # Simulacro de isla
│
├── 🏆 retos1vs1/
│   ├── RetosFragment.java             # Lista de retos
│   ├── CrearRetoActivity.java         # Crear nuevo reto
│   ├── LobbyEsperaActivity.java       # Sala de espera
│   ├── DetalleRetoActivity.java       # Detalle de reto
│   └── RetosPollingService.java       # Servicio de polling
│
├── 📊 progreso/
│   ├── FragmentHistorial.java         # Historial de sesiones
│   └── ProgresoFragment.java          # Vista de progreso
│
├── 📈 detalleprogreso/
│   └── FragmentDetalleSimulacro.java  # Análisis detallado
│
├── 👤 Perfil/
│   ├── ProfileActivity.java           # Perfil de usuario
│   ├── PerfilFragment.java            # Vista de perfil
│   ├── ConfiguracionFragment.java     # Configuración
│   └── Modelo3DRAActivity.java        # Vista 3D (AR)
│
├── 🔐 resetpassword/
│   └── ResetPasswordActivity.java     # Recuperación de contraseña
│
├── 🌐 remote/ (Networking)
│   ├── RetrofitClient.java            # Cliente HTTP singleton
│   └── ApiService.java                # Definición de endpoints
│
├── 💾 local/
│   └── TokenManager.java              # Gestión de tokens JWT
│
├── 🔔 notifications/
│   └── MyFirebaseMessagingService.java # Handler de FCM
│
├── 🔄 sincronizacion/
│   └── ProgresoSincronizador.java     # Sincronización de progreso
│
├── 📦 model/
│   ├── Usuario.java                   # Modelo de usuario
│   ├── Sesion.java                    # Modelo de sesión
│   ├── Pregunta.java                  # Modelo de pregunta
│   └── ... (otros modelos)
│
├── 🎨 adapter/
│   ├── PreguntasAdapter.java          # Adapter de preguntas
│   ├── QuizQuestionsAdapter.java      # Adapter de quiz
│   └── ... (otros adapters)
│
├── 🛠️ utils/
│   ├── ErrorHandler.java              # Manejo de errores
│   └── ... (utilidades)
│
├── 🔧 services/
│   └── SessionExpiredReceiver.java    # Receiver de sesión expirada
│
└── App.java                           # Application class5.2 Archivos de Configuración Principales•[x] build.gradle.kts - Configuración de Gradle (nivel raíz)•[x] app/build.gradle.kts - Configuración de la app•[x] settings.gradle.kts - Configuración de módulos•[x] gradle.properties - Properties de Gradle•[x] gradle-wrapper.properties - Versión de Gradle (8.13)•[x] AndroidManifest.xml - Manifest de la aplicación•[x] google-services.json - Configuración de Firebase•[x] proguard-rules.pro - Reglas de ofuscación🎯 6. FUNCIONALIDADES DEL SOFTWARE6.1 Módulos Principales🔐 Autenticación•[x] Login con email/contraseña•Autenticación JWT con backend•Almacenamiento seguro de token•Redirección automática a Home•[x] Registro de nuevos usuarios (Via backend)•[x] Recuperación de contraseña•Flujo completo de reset password•Validación de código•[x] Cierre de sesión•Limpieza de tokens•Redirección a Login•[x] Manejo de sesión expirada•Detección automática de 401•Broadcast para cerrar sesión en todas las activities👤 Perfil de Usuario•[x] Ver perfil•Información personal completa•Datos institucionales•Foto de perfil•[x] Editar información personal•[x] Cambiar contraseña•[x] Subir foto de perfil•Integración con cámara•Carga y actualización•[x] Ver estadísticas personales•Progreso por materia•Nivel actual•Vidas disponibles🎮 Sesiones de Estudio (Quiz)•[x] Iniciar nueva sesión•Selección de área y nivel•Sistema de vidas (niveles 2+)•[x] Ver preguntas generadas por IA•Integración con OpenAI GPT-4o-mini•Alimentadas con información oficial ICFES•Fallback automático a banco local•[x] Responder preguntas•UI intuitiva con opciones múltiples•Temporizador por pregunta•Feedback inmediato•[x] Ver resultados de la sesión•Puntaje obtenido•Correctas vs incorrectas•Evolución de nivel•[x] Historial de sesiones•Lista completa de sesiones•Filtrado por fecha y materia•Actualización en tiempo real•[x] Análisis detallado por sesión•Preguntas marcadas vs correctas•Fortalezas identificadas•Áreas de mejora•Recomendaciones personalizadas🗺️ Mapa de Islas del Conocimiento•[x] 5 Islas temáticas•Matemáticas•Lectura Crítica•Ciencias Naturales•Sociales y Ciudadanas•Inglés•[x] Sistema de niveles•5 niveles por área + Examen Final•Desbloqueo progresivo•[x] Visualización de progreso•Indicador visual de nivel actual•Estados: bloqueado, disponible, completado⭐ Sistema de Vidas COMPLETO•[x] 3 vidas por nivel (niveles 2+)•[x] Recarga automática•5 minutos por vida•Actualización en tiempo real (cada segundo)•Timestamps inteligentes•[x] Recarga especial•Media vida al ver historial detallado•Una sola vez por intento•Flag de control anti-bugs•[x] UI/UX de vidas•Visualización de corazones•Diálogos informativos•Contador en tiempo real•Indicador de "Sin vidas"🎯 Test de Kolb (Estilos de Aprendizaje)•[x] Realizar test de Kolb•[x] Ver resultado del estilo de aprendizaje•[x] Ver recomendaciones personalizadas🔔 Notificaciones•[x] Recibir notificaciones push•Firebase Cloud Messaging (FCM)•Notificaciones de retos•Notificaciones de actualizaciones•[x] Ver historial de notificaciones•NotificationsActivity•Lista completa de notificaciones•[x] Indicador de retos pendientes•Badge numérico•Actualización en tiempo real•[x] Deep linking•Apertura directa desde notificación•Navegación a pantalla específica🏆 Retos 1vs1•[x] Ver retos disponibles•Retos recibidos•Retos enviados•Estados: Pendiente, Aceptado, Rechazado, Expirado•[x] Crear nuevo reto•Selección de oponente•Selección de área•Envío de invitación•[x] Aceptar/Rechazar retos•Diálogo de confirmación•Notificación al creador•[x] Lobby de espera•Espera de aceptación•Timeout automático•Indicador visual•[x] Participar en retos•Sistema de 5 preguntas fijas•Competencia en tiempo real•Puntuación comparativa•[x] Ver retos completados•Historial de resultados•Ganador/Perdedor•[x] Sistema de polling•Actualización cada 30 segundos•Servicio en background📈 Dashboard•[x] Ver resumen de progreso•Progreso por área•Nivel actual•Vidas disponibles•[x] Estadísticas•Sesiones completadas•Preguntas respondidas•Tasa de aciertos•[x] Indicadores visuales•CircleProgress bars•Íconos de estado•Colores por nivel⚙️ Configuración•[x] Configurar notificaciones•[x] Información de la app•[x] Cerrar sesión6.2 Funcionalidades Offline•[x] ¿Funciona sin conexión?: Parcialmente•[x] ¿Qué funcionalidades están disponibles offline?:•Ver perfil cacheado•Ver progreso local•Ver historial de sesiones (datos locales)•NO disponible offline:•Iniciar nuevas sesiones•Enviar respuestas•Crear/aceptar retos•Recibir notificaciones6.3 Sincronización•[x] ¿Sincroniza datos al recuperar conexión?: Sí•[x] ¿Qué datos se sincronizan?:•Progreso del usuario (niveles, vidas)•Perfil actualizado•Nuevas sesiones completadas•Estado de retos•Token FCM actualizado🎨 7. INTERFAZ DE USUARIO (UI/UX)7.1 Screenshots de Pantallas PrincipalesPor favor, adjuntar screenshots de:1.Splash Screen / Intro - MainActivity / SplashActivity2.Login / Registro - LoginActivity3.Home / Dashboard Principal - HomeActivity4.Mapa de Islas - MapaActivity5.Quiz en progreso - QuizActivity6.Resultados de Sesión - ResultActivity7.Historial Detallado - FragmentDetalleSimulacro8.Perfil de Usuario - ProfileActivity9.Retos 1vs1 - RetosFragment10.Lobby de Espera - LobbyEsperaActivity11.Notificaciones - NotificationsActivity12.Test de Kolb - InfoTestActivity13.Configuración - ConfiguracionFragment7.2 Diseño Visual•[x] Paleta de colores:•Color primario: Material Design (personalizado)•Color secundario: Acento Material•Color de fondo: Blanco/Gris claro•Color de texto: Negro/Gris oscuro•Colores de estado:•Verde: Correcto•Rojo: Incorrecto•Naranja: En progreso•Azul: Información•[x] Tipografía:•Fuente principal: Roboto (Android System)•Fuente secundaria: Material Design Typography•[x] Sistema de diseño:•[x] Material Design 3•[x] Components: Material Components 1.13.0-alpha05•[x] Diseño adaptativo•[x] Animaciones y transiciones7.3 NavegaciónFlujo de navegación principal:Splash (MainActivity)
  ↓
Login (LoginActivity)
  ↓
Home (HomeActivity) → [4 Tabs en ViewPager]
  ├── Tab 1: Inicio (Dashboard)
  ├── Tab 2: Retos (RetosFragment)
  ├── Tab 3: Progreso (Historial)
  └── Tab 4: Perfil (PerfilFragment)

Desde Home:
  → Mapa de Islas (MapaActivity)
     → Quiz (QuizActivity)
        → Resultado (ResultActivity)
           → Detalle (FragmentDetalleSimulacro)
  
  → Crear Reto (CrearRetoActivity)
     → Lobby (LobbyEsperaActivity)
        → Quiz Reto (QuizActivity)
  
  → Notificaciones (NotificationsActivity)
  
  → Test de Kolb (InfoTestActivity → TestActivity)7.4 Responsive/Adaptabilidad•[x] ¿Se adapta a diferentes tamaños de pantalla?: Sí•ConstraintLayout para layouts flexibles•Dimensiones en dp y sp•Recursos alternativos para diferentes densidades•[x] Orientaciones soportadas:•[x] Vertical (Portrait) - Principal•[ ] Horizontal (Landscape) - Limitado•[ ] Ambas - Algunas pantallas🧪 8. TESTING8.1 Tests Implementados•[x] ¿Tiene tests unitarios?: Sí•[x] Framework de testing:•[x] JUnit 4.13.2•[x] AndroidX Test Core 1.4.0•[x] ¿Tiene tests de integración?: Sí•[x] Framework:•[x] AndroidX Test (Instrumentation)•[x] Espresso 3.5.1•[x] ¿Tiene tests E2E?: Limitado8.2 Estructura de Testsdependencies {
    // Unit tests
    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.test:core:1.4.0")
    testImplementation("androidx.test.ext:junit:1.1.3")
    
    // Android Instrumentation tests
    androidTestImplementation("androidx.test.ext:junit:1.1.3")
    androidTestImplementation("androidx.test:runner:1.4.0")
    androidTestImplementation("androidx.test:rules:1.4.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.4.0")
    androidTestUtil("androidx.test:orchestrator:1.4.0")
}8.3 Cobertura de Código•[ ] Porcentaje de cobertura: Por definir📱 9. BUILD Y DEPLOYMENT9.1 Configuración de BuildAndroid:•[x] Build types: Debug / Release•[x] Versión de Gradle: 8.13•[x] Comandos de build:# Build Debug APK
.\gradlew.bat assembleDebug

# Build Release APK
.\gradlew.bat assembleRelease

# Build Release Bundle (AAB)
.\gradlew.bat bundleRelease

# Clean + Build
.\gradlew.bat clean build

# Install Debug en dispositivo
.\gradlew.bat installDebugScripts personalizados:•[x] compile.ps1 - Script de compilación PowerShell•[x] compile.sh - Script de compilación Bash (Linux/Mac)9.2 Configuración de Firma (Release)Para generar APK firmado:# 1. Generar keystore (primera vez)
keytool -genkey -v -keystore keystore/release.jks `
  -alias release_alias `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000

# 2. Configurar en build.gradle.kts
signingConfigs {
    release {
        storeFile file("keystore/release.jks")
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias "release_alias"
        keyPassword System.getenv("KEY_PASSWORD")
    }
}

# 3. Build release firmado
.\gradlew.bat assembleRelease⚠️ IMPORTANTE:•No subir keystore/release.jks al repositorio•Usar variables de entorno para contraseñas•Guardar keystore en lugar seguro9.3 Despliegue•[ ] ¿Está publicada en tiendas?•[ ] Google Play Store - Link: _______•[ ] Apple App Store - No aplica•[ ] Distribución interna/Testing•[ ] ¿Usa CI/CD?: No implementado actualmente•[ ] Posibles herramientas:•[ ] GitHub Actions•[ ] GitLab CI•[ ] Bitrise•[ ] Fastlane9.4 VersionadoConvención:•versionCode: Número incremental (1, 2, 3...)•versionName: Semantic Versioning (1.0.0, 1.1.0, 2.0.0...)Actual:•versionCode: 1•versionName: "1.0"📊 10. INTEGRACIÓN CON BACKEND10.1 API Connection•[x] URL del backend: https://eduexce-backend.ddns.net/•[x] Autenticación: JWT Bearer Token•[x] Timeout de requests: 30000 ms (30 segundos)•[x] Headers comunes:Authorization: Bearer {token}
Content-Type: application/json
Request-ID: {uuid} (para debugging)10.2 Endpoints PrincipalesVer documento completo: docs/interfaces_principales.mdResumen de endpoints críticos:AutenticaciónPOST   /auth/login              - Login de usuario
POST   /auth/forgot             - Recuperar contraseña
POST   /auth/reset              - Resetear contraseñaUsuario/PerfilGET    /estudiante/perfil       - Obtener perfil del estudiante
PUT    /estudiante/perfil       - Actualizar perfil
POST   /estudiante/foto         - Subir foto de perfilSesiones/QuizPOST   /movil/sesion            - Crear nueva sesión de quiz
POST   /movil/sesion/{id}/respuesta - Enviar respuesta
POST   /movil/sesion/{id}/cerrar    - Finalizar sesión
GET    /movil/sesion/{id}/detalle   - Obtener análisis detalladoProgreso/SincronizaciónGET    /movil/sincronizacion/progreso - Obtener progreso del usuario
POST   /movil/sincronizacion/vidas    - Actualizar vidas consumidas
GET    /quizz/progreso                - Estadísticas generalesRetos 1vs1GET    /movil/retos?tipo=recibidos    - Obtener retos recibidos
GET    /movil/retos?tipo=enviados     - Obtener retos enviados
POST   /movil/retos                   - Crear nuevo reto
POST   /movil/retos/{id}/aceptar      - Aceptar reto
POST   /movil/retos/{id}/rechazar     - Rechazar reto
GET    /movil/retos/{id}              - Detalle de retoNotificaciones FCMPOST   /movil/fcm/token         - Registrar token FCM
POST   /movil/token             - Actualizar tokenTest de KolbGET    /kolb/resultado          - Obtener resultado del test
POST   /kolb/guardar            - Guardar resultado del test10.3 Manejo de ErroresCódigos de respuesta:•200/201: Éxito•400: Bad Request (validación)•401: No autorizado (sesión expirada)•403: Prohibido•404: No encontrado•422: Error de validación•500: Error interno del servidorEstrategias implementadas:•✅ Interceptor de sesión expirada (401) → Broadcast → Logout automático•✅ Manejo centralizado de errores con ErrorHandler•✅ Mensajes de error amigables al usuario•✅ Logging detallado con OkHttp Interceptor•✅ Retry automático en algunos casos (polling de retos)•✅ Timeout configurado (30s)10.4 Request-ID para DebuggingCada request incluye un header único:Request-ID: {UUID aleatorio}Permite rastrear requests específicos en logs de backend y móvil.🔒 11. SEGURIDAD11.1 Almacenamiento Seguro•[x] ¿Encripta datos sensibles localmente?: Parcial•SharedPreferences (no encriptado por defecto)•Recomendación: Implementar EncryptedSharedPreferences•[x] ¿Usa almacenamiento seguro para tokens?: Sí•TokenManager con SharedPreferences•Limpieza automática en logout•Verificación de expiración11.2 Comunicación•[x] ¿Usa HTTPS exclusivamente?: Sí•Backend: https://eduexce-backend.ddns.net/•Firebase: Comunicación segura•[x] ¿Implementa certificate pinning?: No•Recomendación: Implementar para producción•[x] Configuración de seguridad:•usesCleartextTraffic="true" (solo para desarrollo)•Cambiar a false en producción11.3 Validación•[x] ¿Valida inputs del usuario?: Sí•Validación de campos de formulario•Sanitización básica•Validación de formato (email, etc.)•[x] ¿Sanitiza datos antes de enviar al backend?: Sí•Gson maneja la serialización•Validación de tipos11.4 Mejoras Recomendadas•[ ] Implementar EncryptedSharedPreferences para tokens•[ ] Implementar Certificate Pinning•[ ] Ofuscación con ProGuard/R8 en release•[ ] Deshabilitar logs en producción•[ ] Implementar root detection•[ ] Validación adicional de integridad de APK📚 12. DOCUMENTACIÓN ADICIONAL12.1 README del Proyecto•[x] ¿Tiene README completo?: Sí•[x] Incluye:•[x] Descripción del proyecto•[x] Características principales•[x] Instrucciones de instalación•[x] Tecnologías utilizadas•[x] Arquitectura del proyecto•[x] Guía de uso•[x] Sistema de vidas (documentado)•[x] Troubleshooting básico12.2 Comentarios en Código•[x] ¿El código está bien comentado?: Sí•Comentarios explicativos en clases principales•JavaDoc en métodos importantes•TODOs marcados para mejoras futuras12.3 Changelog•[x] ¿Mantiene un CHANGELOG?: Sí•Archivo: CHANGELOG.md•Formato: Keep a Changelog•Versión actual: 1.0.0 (2025-12-04)12.4 Documentación Técnica AdicionalDocumentos relevantes en el proyecto:1.Sistema de Vidas:•SISTEMA_VIDAS_ANALISIS_FINAL.md•CORRECCIONES_VIDAS_IMPLEMENTADAS.md2.Notificaciones:•MEJORAS_UX_NOTIFICACIONES_COMPLETO.md•FIX_NOTIFICACIONES_FCM.md•PROBLEMAS_COMUNES_FCM.md3.Integración con IA:•RESUMEN_INTEGRACION_IA_OPENAI.md•DIAGNOSTICO_IA_VS_BANCO_PREGUNTAS.md•CONFIRMACION_RESOLUCION_IA.md4.Backend:•BACKEND_AWS_CONFIGURADO.md•VERIFICACION_INTEGRACION_BACKEND.md•docs/interfaces_principales.md5.Guías:•GUIA_COMPILACION_TESTING.md•GUIA_GENERAR_APK.md•GUIA_TESTING_HISTORIAL.md6.Fixes y Correcciones:•ARCHIVOS_CORREGIDOS_FINAL.md•RESUMEN_CAMBIOS_FINALES.md•COMMIT_FINAL.md✅ 13. INFORMACIÓN COMPLEMENTARIA13.1 Repositorio•[x] URL del repositorio: https://github.com/pinzaf1/EDUEXCE_MOVIL_MOVIL•[x] Branch principal: main / master•[x] Branch de desarrollo: develop (si existe)13.2 Contacto•[ ] Email del equipo: _______•[ ] Instructor/Tutor: _______•[x] Package de la app: com.example.zavira_movil13.3 Información de la AppDatos del Manifest:<application
    android:name=".App"
    android:label="@string/app_name"
    android:icon="@drawable/iconoeduexce"
    android:roundIcon="@drawable/robot"
    android:theme="@style/Theme.ZAVIRA_MOVIL"
    android:allowBackup="true"
    android:usesCleartextTraffic="true">13.4 Deep LinksConfiguración de Deep Link (QR Code):<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    
    <data
        android:scheme="https"
        android:host="pinzaf1.github.io"
        android:pathPrefix="/EDUEXCE_MOVIL_MOVIL" />
</intent-filter>Uso: Permite abrir la app desde un QR code o link web.13.5 Características DestacadasSistema de Vidas Completo:•⭐ Implementación robusta con timestamps•🔄 Recarga automática cada 5 minutos•🎁 Recarga especial por ver historial•🔒 Sistema anti-bugs con flags•📊 Actualización en tiempo realPreguntas con IA:•🤖 OpenAI GPT-4o-mini•📚 Alimentada con info oficial ICFES•🔄 Fallback automático a banco local•✅ Diagnóstico de origenRetos 1vs1:•🏆 Sistema completo de competencia•🔔 Notificaciones FCM•⏰ Polling cada 30 segundos•🎯 5 preguntas fijas por retoAnálisis Detallado:•📊 Estadísticas por sesión•💡 Recomendaciones personalizadas•📈 Análisis por subtemas•🔍 Identificación de fortalezas y debilidades13.6 ObservacionesPuntos importantes:1.Backend URL: El proyecto está configurado para usar https://eduexce-backend.ddns.net/ en producción. Para desarrollo local, cambiar en RetrofitClient.java.2.Firebase: Se requiere configuración de Firebase Console y archivo google-services.json para que las notificaciones funcionen.3.Versionado: El proyecto sigue Semantic Versioning. Incrementar versionCode y versionName antes de cada release.4.Logs: El logging está habilitado en debug. Asegurar que esté deshabilitado en producción.5.Keystore: No incluir el keystore de release en el repositorio. Usar variables de entorno para contraseñas.6.Tests: Ampliar cobertura de tests antes de producción.7.Seguridad: Implementar mejoras de seguridad recomendadas antes de release público.8.Compatibilidad: La app es compatible con Android 7.0 (API 24) en adelante, con target en Android 14 (API 36).📝 CHANGELOG RESUMIDO[1.0.0] - 2025-12-04Release Inicial de Producción✨ Agregado•Sistema completo de gamificación con Mapa de Islas•Sistema de vidas con recarga automática•Preguntas generadas por IA (OpenAI GPT-4o-mini)•Retos 1vs1 con notificaciones FCM•Análisis detallado de sesiones•Sincronización de progreso•Test de Kolb•Sistema de autenticación JWT•Perfil de usuario completo🔧 Configurado•Firebase Cloud Messaging•Retrofit + OkHttp•Material Design 3•Glide para imágenes•Sistema de interceptores🐛 Corregido•Bugs de sistema de vidas•Problemas de notificaciones FCM•Errores de compilación•Issues de sincronización🛠️ TROUBLESHOOTINGProblemas Comunes1. Error de compilación: META-INF conflictsSolución: Ya configurado en build.gradle.kts con packaging.resources2. Firebase no funciona / No llegan notificacionesVerificar:
- google-services.json en app/
- Plugin de Google Services en build.gradle.kts
- Token FCM registrado en backend
- Permisos de notificaciones concedidos3. Error 401 / Sesión expiradaEl sistema maneja automáticamente con SessionExpiredReceiver.
Si persiste, verificar:
- Token guardado correctamente
- Backend devolviendo token válido
- Tiempo de expiración del token4. No se pueden iniciar sesiones de quizVerificar:
- Conexión a internet
- Backend URL correcta en RetrofitClient
- Usuario tiene progreso sincronizado
- Sistema de vidas (si aplica)5. Vidas no se recarganVerificar:
- Timestamps guardados correctamente
- LivesManager funcionando
- Handler actualizando UI
- Sincronización con backend📞 SOPORTE Y CONTACTOPara issues técnicos:•Revisar documentación en /docs•Consultar CHANGELOG.md•Revisar archivos de corrección en el proyectoPara contribuir:•Ver CONTRIBUTING.md (si existe)•Seguir convenciones de código Java/Android•Crear Pull Requests con descripción detallada📄 LICENCIA[Especificar la licencia del proyecto]🎯 PRÓXIMOS PASOS / ROADMAPMejoras planificadas:•[ ] Implementar EncryptedSharedPreferences•[ ] Agregar Certificate Pinning•[ ] Mejorar cobertura de tests•[ ] Implementar CI/CD•[ ] Optimizar rendimiento•[ ] Agregar más animaciones•[ ] Modo oscuro completo•[ ] Soporte para tablets•[ ] Internacionalización (i18n)•[ ] Publicación en Google Play StoreFecha de completado: 2025-12-10Completado por: GitHub Copilot (AI Assistant)Versión del documento: 1.0Este documento contiene toda la información técnica necesaria para el Manual Técnico del proyecto móvil EduExce.Para información adicional sobre APIs, consultar: docs/interfaces_principales.md