# Manual de Usuario para Proyectos Software

## Sistema de Gestión Educativa EduExce SENA

**Fecha:** 11 de diciembre de 2025

---

## HOJA DE CONTROL

| Campo | Valor |
|-------|--------|
| **Empresa / Organización** | SENA - Servicio Nacional de Aprendizaje |
| **Proyecto** | Sistema de Gestión Educativa EduExce |
| **Entregable** | Manual de Usuario |
| **Autores** | [Nombres del equipo de desarrollo] |
| **Versión/Edición** | 1.0 | **Fecha Versión** | 11/12/2025 |
| **Aprobado por** | [Instructor/Tutor] | **Fecha Aprobación** | [dd/mm/aaaa] |
| | | **Nº Total de Páginas** | [Número total] |

---

## REGISTRO DE CAMBIOS

| Versión | Causa del Cambio | Responsable del Cambio | Fecha del Cambio |
|---------|------------------|------------------------|------------------|
| 1.0 | Creación inicial del manual | Equipo de desarrollo | 11/12/2025 |
| | | | |
| | | | |

---

## Contenido

1. [Introducción](#1-introducción)
2. [Requisitos Previos para usar el Sistema](#2-requisitos-previos-para-usar-el-sistema)
3. [Instalación y Configuración](#3-instalación-y-configuración)
4. [Funcionalidades](#4-funcionalidades)
5. [Solución de Problemas](#5-solución-de-problemas)
6. [Datos de Contacto](#6-datos-de-contacto)
7. [Glosario](#7-glosario)

---

# 1. Introducción

El Sistema de Gestión Educativa EduExce SENA es una plataforma tecnológica integral diseñada para mejorar el rendimiento académico de estudiantes en las áreas del examen ICFES. El sistema consta de tres módulos principales:

## Módulos del Sistema

### Panel Web Administrativo
Dashboard web para instituciones educativas que permite a administradores y coordinadores académicos gestionar estudiantes, monitorear métricas de rendimiento, generar reportes por áreas ICFES y enviar notificaciones automáticas de seguimiento académico.

### Aplicación Móvil para Estudiantes
Aplicación nativa/multiplataforma donde los estudiantes realizan sesiones de estudio interactivas con preguntas generadas por inteligencia artificial, completan test de estilos de aprendizaje (Kolb), participan en retos gamificados y consultan su progreso personal.

### Backend API
Sistema backend robusto construido en AdonisJS que gestiona la lógica de negocio, integración con OpenAI para generación de preguntas, notificaciones push via Firebase, y almacenamiento seguro de datos académicos.

## Funcionalidades Principales

- **Generación inteligente de preguntas** por área ICFES usando IA
- **Seguimiento personalizado** del progreso académico
- **Test de estilos de aprendizaje** (Kolb) con recomendaciones
- **Sistema de notificaciones automáticas** para alertas académicas
- **Dashboards con métricas** institucionales y personales
- **Reportes detallados** por área, estudiante e institución
- **Gamificación** con retos y rankings entre estudiantes

---

# 2. Requisitos Previos para usar el Sistema

## Requerimientos de Hardware

### Para Panel Web Administrativo
**Mínimos:**
- **CPU:** Procesador dual-core 2.0 GHz
- **RAM:** 4 GB
- **Almacenamiento:** 1 GB de espacio libre
- **Conexión a Internet:** Banda ancha estable (mínimo 5 Mbps)

**Recomendados:**
- **CPU:** Procesador quad-core 2.5 GHz o superior
- **RAM:** 8 GB o superior
- **Almacenamiento:** 2 GB de espacio libre
- **Conexión a Internet:** Banda ancha estable (10 Mbps o superior)

### Para Aplicación Móvil
**Android:**
- **Versión mínima:** Android 5.0 (API 21)
- **RAM:** 2 GB mínimo, 4 GB recomendado
- **Almacenamiento:** 500 MB de espacio libre
- **Conexión:** WiFi o datos móviles estables

**iOS (si aplica):**
- **Versión mínima:** iOS 13.0
- **Dispositivo:** iPhone 6s o superior
- **RAM:** 2 GB mínimo
- **Almacenamiento:** 500 MB de espacio libre

## Requerimientos de Software

### Sistemas Operativos Compatibles
**Para Panel Web:**
- Windows 10 o superior
- macOS 10.15 (Catalina) o superior
- Ubuntu 20.04 o distribuciones Linux equivalentes

**Para Aplicación Móvil:**
- Android 5.0 (API 21) o superior
- iOS 13.0 o superior (si aplica)

### Navegadores Compatibles (Panel Web)
- **Google Chrome:** Versión 100 o superior (Recomendado)
- **Mozilla Firefox:** Versión 95 o superior
- **Microsoft Edge:** Versión 100 o superior
- **Safari:** Versión 15 o superior (macOS)

## Links de Acceso al Sistema

### Panel Web Administrativo
**URL de Producción:** [URL del panel web administrativo]
**URL de Desarrollo/Pruebas:** [URL de staging]

### Aplicación Móvil
**Android:** [Google Play Store - Link de descarga]
**iOS:** [App Store - Link de descarga] (si aplica)
**APK Directo:** [Link de descarga directa] (si aplica)

## Permisos Según Rol de Usuario

### Administrador (Panel Web)
- Acceso completo al panel administrativo
- Gestión de estudiantes (crear, editar, eliminar)
- Visualización de métricas y reportes institucionales
- Envío de notificaciones push a estudiantes
- Configuración del sistema
- Gestión de otros administradores

### Coordinador Académico (Panel Web)
- Acceso a reportes y métricas de su institución
- Visualización del progreso de estudiantes
- Envío de notificaciones a estudiantes de su institución
- Exportación de reportes

### Estudiante (Aplicación Móvil)
- Realización de sesiones de estudio
- Acceso al test de Kolb
- Participación en retos y competencias
- Consulta de progreso personal y rankings
- Recepción de notificaciones push
- Edición de perfil personal

---

# 3. Instalación y Configuración

## Panel Web Administrativo

### Acceso al Sistema
1. **Abrir navegador web compatible** (Google Chrome recomendado)
2. **Navegar a la URL:** [URL del panel administrativo]
3. **Verificar conexión segura:** El navegador debe mostrar el ícono de candado (HTTPS)

### Primera Configuración
1. **Solicitar credenciales** al administrador del sistema
2. **Ingresar con usuario y contraseña** proporcionados
3. **Cambiar contraseña inicial** en el primer acceso
4. **Configurar información del perfil** administrativo

### Configuración del Navegador
1. **Habilitar JavaScript:** Requerido para el funcionamiento del sistema
2. **Permitir cookies:** Necesarias para mantener la sesión activa
3. **Actualizar navegador:** Mantener siempre la versión más reciente

## Aplicación Móvil

### Descarga e Instalación

#### Android
1. **Abrir Google Play Store**
2. **Buscar:** "EduExce SENA"
3. **Seleccionar** la aplicación oficial
4. **Presionar "Instalar"** y esperar descarga completa
5. **Abrir aplicación** desde el menú de aplicaciones

#### Instalación Manual (APK)
1. **Descargar APK** desde el link oficial proporcionado
2. **Habilitar "Fuentes desconocidas"** en Configuración > Seguridad
3. **Localizar archivo APK** descargado
4. **Presionar sobre el archivo** e instalar

### Primera Configuración
1. **Abrir aplicación** EduExce
2. **Permitir permisos** solicitados (notificaciones, almacenamiento)
3. **Crear cuenta nueva** o iniciar sesión con credenciales existentes
4. **Completar perfil** con información académica
5. **Realizar test de conectividad** inicial

### Configuración de Notificaciones
1. **Acceder a Configuración** dentro de la app
2. **Habilitar notificaciones push**
3. **Seleccionar tipos de notificaciones** deseadas
4. **Configurar horarios** de notificaciones (opcional)

---

# 4. Funcionalidades

## Panel Web Administrativo

### Autenticación y Acceso

#### Iniciar Sesión
1. **Ingresar a la URL:** [URL del panel]
2. **Introducir email** en el campo correspondiente
3. **Introducir contraseña** en el campo de contraseña
4. **Presionar botón "Iniciar Sesión"**
5. **Sistema redirige** al dashboard principal

**Rol requerido:** Administrador o Coordinador Académico

#### Recuperar Contraseña
1. **En pantalla de login,** hacer clic en "¿Olvidaste tu contraseña?"
2. **Introducir email** registrado en el sistema
3. **Presionar "Enviar"** para recibir email de recuperación
4. **Revisar bandeja de entrada** y seguir instrucciones del correo
5. **Crear nueva contraseña** siguiendo el enlace recibido

### Dashboard Principal

#### Visualización de Métricas Generales
1. **Acceder al Dashboard** (pantalla principal tras login)
2. **Revisar cards de métricas:**
   - Total de estudiantes activos
   - Sesiones completadas hoy/semana
   - Promedio de rendimiento institucional
   - Alertas académicas pendientes
3. **Interpretar gráficos** de rendimiento por área ICFES
4. **Revisar lista de alertas recientes** en panel lateral

**Información mostrada:**
- Estadísticas en tiempo real
- Gráficos interactivos por área
- Comparativas temporales
- Estudiantes destacados y en riesgo

#### Filtros y Períodos de Tiempo
1. **Seleccionar filtro temporal** (hoy, semana, mes, trimestre, personalizado)
2. **Aplicar filtros** por institución (si administra múltiples)
3. **Exportar datos** usando botón "Exportar Reporte"

### Gestión de Estudiantes

#### Listar Estudiantes
1. **Navegar a "Estudiantes"** en el menú lateral
2. **Visualizar tabla completa** de estudiantes registrados
3. **Utilizar barra de búsqueda** para localizar estudiante específico
4. **Aplicar filtros avanzados:**
   - Por institución
   - Por rendimiento (alto, medio, bajo)
   - Por área débil identificada
   - Por estado (activo, inactivo)

**Información mostrada por estudiante:**
- Nombre completo y email
- Institución académica
- Última actividad
- Promedio general
- Área más débil
- Estado de cuenta

#### Crear Nuevo Estudiante
1. **Presionar botón "+ Nuevo Estudiante"**
2. **Completar formulario:**
   - Nombre completo
   - Email (único en el sistema)
   - Institución académica
   - Contraseña temporal
   - Información adicional (opcional)
3. **Presionar "Guardar"** para crear cuenta
4. **Sistema envía** email de bienvenida automático

**Rol requerido:** Administrador

#### Ver Perfil Detallado de Estudiante
1. **Hacer clic en nombre** del estudiante en la tabla
2. **Revisar información completa:**
   - Datos personales y académicos
   - Historial de sesiones completadas
   - Gráficos de progreso por área ICFES
   - Resultado del test de Kolb
   - Logros y badges obtenidos
3. **Navegar entre pestañas** para ver diferentes secciones

#### Editar Información de Estudiante
1. **Acceder al perfil** del estudiante
2. **Presionar botón "Editar"**
3. **Modificar campos** necesarios
4. **Guardar cambios** presionando "Actualizar"

#### Eliminar/Desactivar Estudiante
1. **Seleccionar estudiante** en la tabla
2. **Presionar botón "Acciones" > "Desactivar"**
3. **Confirmar acción** en modal de confirmación
4. **Estudiante queda inactivo** pero conserva historial

**Nota:** La eliminación completa solo está disponible para administradores principales.

### Seguimiento por Áreas ICFES

#### Dashboard de Matemáticas
1. **Navegar a "Áreas ICFES" > "Matemáticas"**
2. **Visualizar métricas específicas:**
   - Promedio institucional en matemáticas
   - Estudiantes con bajo rendimiento
   - Temas más difíciles identificados
   - Evolución temporal del área
3. **Revisar gráficos detallados** de progreso
4. **Identificar estudiantes** que requieren refuerzo

#### Dashboard por Área (Lectura Crítica, Ciencias, etc.)
1. **Seleccionar área específica** en menú "Áreas ICFES"
2. **Analizar métricas particulares** del área seleccionada
3. **Comparar rendimiento** entre diferentes áreas
4. **Generar reportes** específicos por área

#### Estudiantes en Riesgo por Área
1. **Acceder a sección "Alertas"** dentro del área
2. **Revisar lista de estudiantes** con rendimiento bajo (<60%)
3. **Ver recomendaciones automáticas** generadas por el sistema
4. **Tomar acciones correctivas** (notificaciones, seguimiento especial)

### Reportes y Análisis

#### Generar Reporte de Rendimiento
1. **Navegar a "Reportes"** en menú principal
2. **Seleccionar tipo de reporte:**
   - Rendimiento por estudiante
   - Rendimiento por área ICFES
   - Rendimiento institucional
   - Reporte comparativo
3. **Configurar parámetros:**
   - Rango de fechas
   - Estudiantes específicos (opcional)
   - Áreas a incluir
4. **Presionar "Generar Reporte"**
5. **Descargar en formato** PDF o Excel

#### Exportar Datos
1. **Seleccionar datos** a exportar (estudiantes, sesiones, métricas)
2. **Elegir formato** de exportación (Excel, CSV, PDF)
3. **Configurar filtros** si es necesario
4. **Presionar "Exportar"** y esperar descarga

### Gestión de Notificaciones

#### Enviar Notificación Manual
1. **Acceder a "Notificaciones" > "Enviar Nueva"**
2. **Completar formulario:**
   - Título de la notificación
   - Mensaje completo
   - Destinatarios (individual, por grupo, masiva)
   - Tipo de notificación (información, alerta, recordatorio)
3. **Previsualizar** notificación antes de enviar
4. **Presionar "Enviar Ahora"** o "Programar Envío"

#### Ver Historial de Notificaciones
1. **Navegar a "Notificaciones" > "Historial"**
2. **Revisar todas las notificaciones** enviadas
3. **Filtrar por:**
   - Fecha de envío
   - Tipo de notificación
   - Destinatario
   - Estado (entregada, pendiente, fallida)
4. **Ver estadísticas** de entrega y lectura

#### Configurar Notificaciones Automáticas
1. **Acceder a "Configuración" > "Notificaciones Automáticas"**
2. **Definir reglas:**
   - Rendimiento bajo (umbral configurable)
   - Inactividad prolongada (días sin sesiones)
   - Áreas críticas detectadas
3. **Configurar frecuencia** de evaluación
4. **Activar/desactivar** reglas según necesidad

## Aplicación Móvil para Estudiantes

### Registro e Inicio de Sesión

#### Crear Cuenta Nueva
1. **Abrir aplicación** EduExce
2. **Presionar "Registrarse"** en pantalla principal
3. **Completar formulario:**
   - Nombre completo
   - Email válido
   - Contraseña segura (mínimo 8 caracteres)
   - Confirmar contraseña
   - Seleccionar institución educativa
4. **Aceptar términos** y condiciones
5. **Presionar "Crear Cuenta"**
6. **Verificar email** recibido para activar cuenta

#### Iniciar Sesión
1. **Abrir aplicación** EduExce
2. **Introducir email** registrado
3. **Introducir contraseña**
4. **Presionar "Iniciar Sesión"**
5. **Aplicación redirige** al dashboard personal

#### Recuperar Contraseña
1. **En pantalla de login,** presionar "¿Olvidaste tu contraseña?"
2. **Introducir email** de la cuenta
3. **Revisar email** recibido con instrucciones
4. **Seguir enlace** para restablecer contraseña

### Dashboard Personal del Estudiante

#### Visualizar Progreso General
1. **Acceder al dashboard** (pantalla principal tras login)
2. **Revisar métricas personales:**
   - Sesiones completadas esta semana
   - Promedio general de rendimiento
   - Área más fuerte y más débil
   - Posición en ranking institucional
3. **Interpretar gráficos circulares** de progreso por área
4. **Revisar logros recientes** obtenidos

#### Ver Retos Disponibles
1. **Revisar sección "Retos Activos"** en dashboard
2. **Ver detalles** de cada reto disponible
3. **Presionar "Participar"** en reto de interés
4. **Seguir progreso** del reto en curso

### Sesiones de Estudio Interactivas

#### Iniciar Nueva Sesión
1. **Presionar botón "Nueva Sesión"** en dashboard
2. **Seleccionar área ICFES:**
   - Matemáticas
   - Lectura Crítica
   - Ciencias Naturales
   - Ciencias Sociales
   - Inglés
3. **Elegir nivel de dificultad** (básico, intermedio, avanzado)
4. **Confirmar selección** presionando "Comenzar"

#### Responder Preguntas
1. **Leer pregunta** generada por IA cuidadosamente
2. **Analizar las 4 opciones** de respuesta (A, B, C, D)
3. **Seleccionar respuesta** tocando la opción elegida
4. **Confirmar respuesta** presionando "Siguiente"
5. **Ver feedback inmediato** (correcto/incorrecto con explicación)
6. **Continuar** hasta completar la sesión

#### Ver Resultados de Sesión
1. **Al completar todas las preguntas,** revisar resumen final
2. **Analizar métricas:**
   - Preguntas correctas/total
   - Porcentaje de acierto
   - Tiempo promedio por pregunta
   - Áreas de fortaleza y mejora
3. **Revisar explicaciones** de respuestas incorrectas
4. **Guardar progreso** automáticamente

### Test de Estilos de Aprendizaje (Kolb)

#### Realizar Test de Kolb
1. **Acceder a "Test de Kolb"** desde menú principal
2. **Leer introducción** sobre estilos de aprendizaje
3. **Comenzar evaluación** presionando "Iniciar Test"
4. **Responder 40 preguntas** usando escala de valores (1-4)
5. **Completar todas las preguntas** sin saltar ninguna
6. **Finalizar test** presionando "Obtener Resultado"

#### Interpretar Resultado
1. **Revisar tipo de estilo** identificado:
   - Divergente (Observador Reflexivo)
   - Asimilador (Conceptualización Abstracta)
   - Convergente (Experimentación Activa)
   - Acomodador (Experiencia Concreta)
2. **Leer descripción detallada** del estilo personal
3. **Revisar recomendaciones** de estudio personalizadas
4. **Aplicar estrategias** sugeridas en futuras sesiones

#### Rehacer Test
1. **Acceder nuevamente** a "Test de Kolb"
2. **Presionar "Realizar Nuevo Test"**
3. **Confirmar** que desea reemplazar resultado anterior
4. **Completar nueva evaluación** siguiendo pasos anteriores

### Sistema de Retos y Gamificación

#### Ver Retos Disponibles
1. **Navegar a "Retos"** en menú principal
2. **Revisar lista** de retos activos:
   - Retos personales (mejorar promedio)
   - Retos institucionales (competir con compañeros)
   - Retos por área específica
3. **Ver detalles** de cada reto (duración, premio, participantes)

#### Participar en Reto
1. **Seleccionar reto** de interés
2. **Leer requisitos** y condiciones
3. **Presionar "Unirse al Reto"**
4. **Completar sesiones** según lo requerido
5. **Seguir progreso** en tiempo real

#### Ver Logros Obtenidos
1. **Acceder a "Logros"** en perfil personal
2. **Revisar badges** ganados:
   - Por consistencia (días consecutivos)
   - Por mejora (incremento en promedio)
   - Por áreas específicas (dominio en matemáticas)
3. **Compartir logros** con compañeros (opcional)

### Rankings y Competencias

#### Consultar Ranking General
1. **Navegar a "Rankings"** en menú principal
2. **Ver posición personal** en ranking institucional
3. **Revisar top 10** de estudiantes destacados
4. **Comparar promedio** con otros participantes

#### Ranking por Área ICFES
1. **Seleccionar área específica** en rankings
2. **Ver posición** en esa área particular
3. **Identificar fortalezas** comparativas
4. **Motivarse** para mejorar en áreas débiles

#### Comparar con Promedio Institucional
1. **Revisar sección "Mi Rendimiento vs Institución"**
2. **Analizar gráficos comparativos** por área
3. **Identificar oportunidades** de mejora
4. **Establecer metas** personales

### Perfil Personal y Configuración

#### Ver y Editar Perfil
1. **Acceder a "Perfil"** desde menú o avatar
2. **Revisar información actual:**
   - Datos personales
   - Institución académica
   - Estadísticas de uso
3. **Editar campos** permitidos
4. **Guardar cambios** presionando "Actualizar"

#### Configurar Notificaciones
1. **Acceder a "Configuración" > "Notificaciones"**
2. **Habilitar/deshabilitar** tipos de notificaciones:
   - Recordatorios de estudio
   - Alertas de retos
   - Logros obtenidos
   - Mensajes del administrador
3. **Configurar horarios** preferidos para notificaciones
4. **Guardar configuración**

#### Ver Estadísticas Personales
1. **Navegar a "Estadísticas"** en perfil
2. **Analizar métricas detalladas:**
   - Total de sesiones completadas
   - Tiempo total de estudio
   - Progreso por área ICFES
   - Evolución temporal del rendimiento
3. **Interpretar gráficos** de progreso
4. **Identificar patrones** de estudio

---

# 5. Solución de Problemas

## Panel Web Administrativo

### Problemas de Acceso y Autenticación

#### No puedo iniciar sesión / Credenciales incorrectas
**Síntomas:** Mensaje de error "Email o contraseña incorrectos"

**Soluciones:**
1. **Verificar email:** Confirmar que el email esté escrito correctamente
2. **Verificar contraseña:** Asegurar que no esté activado Bloq Mayús
3. **Usar recuperación:** Utilizar función "¿Olvidaste tu contraseña?"
4. **Limpiar cache:** Borrar cookies y cache del navegador
5. **Contactar administrador:** Si el problema persiste

#### Página no carga / Error de conexión
**Síntomas:** Página en blanco, error 500, o "No se puede establecer conexión"

**Soluciones:**
1. **Verificar conexión:** Comprobar conectividad a internet
2. **Actualizar página:** Presionar F5 o Ctrl+R
3. **Cambiar navegador:** Probar con Chrome, Firefox o Edge
4. **Desactivar extensiones:** Deshabilitar bloqueadores de anuncios
5. **Verificar URL:** Confirmar que la dirección sea correcta

#### Sesión se cierra automáticamente
**Síntomas:** Redireccionamiento constante a pantalla de login

**Soluciones:**
1. **Habilitar cookies:** Verificar que el navegador permita cookies
2. **Actualizar navegador:** Usar versión más reciente
3. **Evitar múltiples pestañas:** Usar solo una pestaña del sistema
4. **Contactar soporte:** Si el problema continúa

### Problemas con Datos y Reportes

#### Los datos no se actualizan / Información desactualizada
**Síntomas:** Métricas que no cambian o datos antiguos

**Soluciones:**
1. **Refrescar página:** Usar F5 para actualizar
2. **Esperar sincronización:** Los datos se actualizan cada 5-10 minutos
3. **Verificar filtros:** Revisar que los filtros de fecha sean correctos
4. **Limpiar cache:** Borrar cache del navegador

#### Error al generar reportes
**Síntomas:** Reporte no se descarga o aparece error

**Soluciones:**
1. **Verificar permisos:** Confirmar que tenga autorización para generar reportes
2. **Reducir rango:** Usar períodos de tiempo más pequeños
3. **Cambiar formato:** Probar Excel en lugar de PDF o viceversa
4. **Desactivar bloqueador:** Permitir descargas en el navegador

#### No aparecen todos los estudiantes
**Síntomas:** Lista incompleta de estudiantes

**Soluciones:**
1. **Revisar filtros:** Verificar que no haya filtros activos
2. **Cambiar paginación:** Navegar a páginas siguientes
3. **Usar búsqueda:** Buscar estudiante específico por nombre
4. **Verificar permisos:** Confirmar acceso a todos los estudiantes

### Problemas de Notificaciones

#### Las notificaciones no se envían
**Síntomas:** Estudiantes no reciben notificaciones push

**Soluciones:**
1. **Verificar conexión:** Los estudiantes deben tener internet activo
2. **Comprobar permisos:** Estudiantes deben haber habilitado notificaciones
3. **Revisar historial:** Verificar en "Historial de Notificaciones" el estado
4. **Contactar soporte técnico:** Si persiste el problema

## Aplicación Móvil para Estudiantes

### Problemas de Instalación y Configuración

#### No puedo descargar la aplicación
**Síntomas:** Error en Google Play Store o App Store

**Soluciones:**
1. **Verificar compatibilidad:** Confirmar versión de Android/iOS compatible
2. **Liberar espacio:** Eliminar aplicaciones para tener mínimo 500 MB libres
3. **Actualizar Play Store:** Verificar que la tienda esté actualizada
4. **Usar WiFi:** Cambiar de datos móviles a WiFi
5. **Descargar APK:** Usar instalación manual (solo Android)

#### La aplicación se cierra inesperadamente
**Síntomas:** App se cierra sola o aparece error "Lamentablemente, se detuvo"

**Soluciones:**
1. **Reiniciar aplicación:** Cerrar completamente y volver a abrir
2. **Reiniciar dispositivo:** Apagar y encender el teléfono
3. **Actualizar app:** Verificar actualizaciones en la tienda
4. **Liberar memoria:** Cerrar otras aplicaciones en segundo plano
5. **Reinstalar:** Desinstalar y volver a instalar la aplicación

#### No puedo crear cuenta / Error en registro
**Síntomas:** Formulario de registro no funciona

**Soluciones:**
1. **Verificar email:** Usar dirección de correo válida y única
2. **Contraseña segura:** Mínimo 8 caracteres con números y letras
3. **Conexión estable:** Asegurar buena conectividad a internet
4. **Seleccionar institución:** Verificar que la institución esté en la lista
5. **Contactar administrador:** Si la institución no aparece

### Problemas Durante Sesiones de Estudio

#### Las preguntas no cargan / Pantalla en blanco
**Síntomas:** Sesión no inicia o se queda cargando

**Soluciones:**
1. **Verificar internet:** Confirmar conexión WiFi o datos móviles estable
2. **Reintentar:** Cerrar sesión y volver a iniciar
3. **Cambiar área:** Probar con diferente área ICFES
4. **Esperar:** El sistema IA puede tardar hasta 30 segundos
5. **Usar modo offline:** Acceder a banco local de preguntas

#### Respuestas no se guardan / Progreso se pierde
**Síntomas:** Al salir de la app se pierde el avance

**Soluciones:**
1. **No salir de la app:** Completar sesión sin interrupciones
2. **Verificar conexión:** Mantener internet activo durante toda la sesión
3. **Finalizar correctamente:** Usar botón "Finalizar Sesión"
4. **Actualizar app:** Verificar última versión disponible

#### Notificaciones no llegan
**Síntomas:** No recibo alertas push del sistema

**Soluciones:**
1. **Habilitar permisos:** Ir a Configuración > Aplicaciones > EduExce > Permisos
2. **Verificar configuración:** Dentro de la app revisar configuración de notificaciones
3. **Revisar modo silencioso:** Desactivar "No molestar" en el dispositivo
4. **Reinstalar:** Desinstalar y reinstalar para restablecer permisos

### Problemas de Rendimiento

#### La aplicación va muy lenta
**Síntomas:** Respuesta lenta de la interfaz

**Soluciones:**
1. **Cerrar otras apps:** Liberar memoria RAM cerrando aplicaciones
2. **Reiniciar dispositivo:** Apagar y encender el teléfono
3. **Verificar almacenamiento:** Liberar espacio (mínimo 1 GB disponible)
4. **Actualizar sistema:** Instalar actualizaciones del sistema operativo

#### Error de sincronización
**Síntomas:** "Error al sincronizar datos" o datos desactualizados

**Soluciones:**
1. **Verificar internet:** Confirmar conexión estable
2. **Forzar sincronización:** Usar "Deslizar hacia abajo" para actualizar
3. **Cerrar y reabrir:** Reiniciar la aplicación completamente
4. **Verificar hora/fecha:** Confirmar que estén configuradas correctamente

---

# 6. Datos de Contacto

## Mesa de Ayuda Técnica

### Soporte para Panel Web Administrativo
**Email de soporte:** [email-soporte@eduexce.com]
**Horario de atención:** Lunes a Viernes, 8:00 AM - 6:00 PM
**Tiempo de respuesta:** Máximo 24 horas hábiles

### Soporte para Aplicación Móvil
**Email de soporte:** [soporte-movil@eduexce.com]
**Horario de atención:** Lunes a Viernes, 8:00 AM - 6:00 PM
**WhatsApp soporte:** [+57 XXX XXX XXXX]

## Contactos del Equipo de Desarrollo

### Administrador del Sistema
**Nombre:** [Nombre del administrador principal]
**Email:** [admin@eduexce.com]
**Teléfono:** [+57 XXX XXX XXXX]
**Responsabilidades:** 
- Gestión de usuarios y permisos
- Configuración del sistema
- Respaldo de datos

### Líder Técnico
**Nombre:** [Nombre del líder técnico]
**Email:** [tecnico@eduexce.com]
**Teléfono:** [+57 XXX XXX XXXX]
**Responsabilidades:**
- Problemas técnicos complejos
- Mantenimiento del servidor
- Actualizaciones del sistema

## Instructor/Tutor del Proyecto

### Supervisor Académico
**Nombre:** [Nombre del instructor SENA]
**Email:** [instructor@sena.edu.co]
**Institución:** SENA - [Centro de formación específico]
**Horario de consultas:** [Días y horas disponibles]

## Procedimiento para Solicitar Ayuda

### Para Problemas Técnicos Urgentes
1. **Documentar el problema:** Captura de pantalla + descripción detallada
2. **Incluir información:** Navegador/dispositivo, hora del error, pasos realizados
3. **Enviar email** a la dirección de soporte correspondiente
4. **Seguimiento:** Respuesta garantizada en máximo 4 horas hábiles

### Para Consultas Generales
1. **Consultar este manual** primero en sección "Solución de Problemas"
2. **Verificar FAQ** en el sistema (si está disponible)
3. **Contactar por email** con descripción clara de la consulta
4. **Tiempo de respuesta:** 24-48 horas hábiles

### Para Capacitación Adicional
**Solicitar capacitación grupal:** [capacitacion@eduexce.com]
**Modalidades disponibles:**
- Presencial en la institución
- Virtual por videoconferencia
- Tutoriales en video personalizados

---

# 7. Glosario

**API (Application Programming Interface):** Interfaz de programación que permite la comunicación entre diferentes componentes del software.

**Backend:** Parte del sistema que ejecuta la lógica de negocio y gestiona la base de datos, no visible para el usuario final.

**Dashboard:** Panel de control visual que muestra métricas, estadísticas y información relevante en formato gráfico.

**FCM (Firebase Cloud Messaging):** Servicio de Google para envío de notificaciones push a dispositivos móviles.

**Frontend:** Parte del sistema con la que interactúa directamente el usuario (interfaz gráfica).

**Gamificación:** Aplicación de elementos de juego (retos, puntos, rankings) en contextos no lúdicos para motivar la participación.

**ICFES:** Instituto Colombiano para la Evaluación de la Educación, entidad que desarrolla las pruebas Saber 11.

**IA (Inteligencia Artificial):** Tecnología que permite a las máquinas realizar tareas que tradicionalmente requieren inteligencia humana, como generar preguntas educativas.

**JWT (JSON Web Token):** Estándar de seguridad para transmitir información entre partes de forma segura mediante tokens.

**Kolb Test:** Evaluación psicológica que identifica estilos de aprendizaje basado en la teoría de David Kolb.

**Middleware:** Software que actúa como intermediario entre diferentes componentes del sistema.

**Notificaciones Push:** Mensajes enviados directamente a dispositivos móviles sin necesidad de abrir la aplicación.

**PostgreSQL:** Sistema de gestión de base de datos relacional utilizado para almacenar información del sistema.

**Responsive Design:** Diseño web que se adapta automáticamente a diferentes tamaños de pantalla (móvil, tablet, desktop).

**Saber 11:** Examen de estado colombiano que evalúa competencias en cinco áreas principales antes del ingreso a la educación superior.

**SENA:** Servicio Nacional de Aprendizaje, entidad pública colombiana de educación para el trabajo y desarrollo humano.

**Sesión de Estudio:** Período dedicado a responder preguntas generadas por IA en un área específica del conocimiento.

**UI/UX (User Interface/User Experience):** Diseño de interfaz de usuario y experiencia de usuario, enfocado en la usabilidad y satisfacción.

**URL:** Dirección web única que identifica un recurso en internet (Uniform Resource Locator).

---

**Fin del Manual de Usuario**

*Este documento fue generado el 11 de diciembre de 2025 para el Sistema de Gestión Educativa EduExce SENA.*