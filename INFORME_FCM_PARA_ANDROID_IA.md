# 📋 CONTEXTO COMPLETO DEL BACKEND PARA INTEGRACIÓN FCM

## 1️⃣ ESTRUCTURA DEL PROYECTO

### Carpeta `app/`

```
app/
├── controller/
│   ├── admin_controller.ts       ✅ Controlador para módulo web admin
│   ├── auth_controller.ts        ✅ Login y recuperación de contraseña
│   ├── movil_controller.ts       ✅ **CONTROLADOR MÓVIL PRINCIPAL**
│   └── registro_controller.ts    ✅ Registro de instituciones
│
├── services/
│   ├── auth_service.ts
│   ├── dashboard_admin_service.ts
│   ├── estudiantes_service.ts
│   ├── ia_service.ts
│   ├── kolb_service.ts
│   ├── logros_service.ts
│   ├── notificaciones_service.ts           ✅ Notificaciones periódicas (mensual)
│   ├── notificaciones_realtime_service.ts  ✅ **SISTEMA TIEMPO REAL CON REDIS**
│   ├── perfil_service.ts
│   ├── progreso_service.ts
│   ├── ranking_service.ts
│   ├── recuperacion_service.ts
│   ├── redis_service.ts                    ✅ **REDIS PUB/SUB**
│   ├── registro_service.ts
│   ├── retos_service.ts
│   ├── seguimiento_admin_service.ts
│   └── sesiones_service.ts
│
└── models/
    ├── banco_pregunta.ts
    ├── estilos_aprendizaje.ts
    ├── institucione.ts
    ├── kolb_resultado.ts
    ├── notificacione.ts           ✅ **MODELO DE NOTIFICACIONES**
    ├── pregunta_estilo_aprendizaje.ts
    ├── progreso_nivel.ts
    ├── reto.ts
    ├── sesione.ts
    ├── sesiones_detalle.ts
    └── usuario.ts                 ✅ **MODELO DE USUARIO/ESTUDIANTE**
```

---

## 2️⃣ SISTEMA DE NOTIFICACIONES ACTUAL

### ✅ YA IMPLEMENTADO - Sistema completo con Redis Pub/Sub

#### **A. Servicio de Notificaciones Realtime**

**Archivo:** `app/services/notificaciones_realtime_service.ts`

**Funcionalidades:**
- ✅ Detecta áreas críticas automáticamente
- ✅ Detecta estudiantes que necesitan atención urgente  
- ✅ **Notifica puntajes bajos inmediatamente** (< 40%)
- ✅ Detecta inactividad de estudiantes (> 30 días)
- ✅ Publica notificaciones vía Redis Pub/Sub
- ✅ Evita spam con sistema anti-duplicados

**Métodos clave:**
```typescript
// Notifica INMEDIATAMENTE cuando estudiante saca puntaje bajo
async notificarPuntajeBajoInmediato(
  id_usuario: number, 
  area: string, 
  puntaje: number, 
  id_institucion: number
)

// Detecta áreas donde muchos estudiantes tienen dificultad
async detectarAreasCriticas(id_institucion: number)

// Detecta estudiantes con rendimiento crítico
async detectarEstudiantesAlerta(id_institucion: number)

// Detecta inactividad
async detectarInactividad(id_institucion: number)
```

#### **B. Redis Pub/Sub Configurado**

**Archivo:** `app/services/redis_service.ts`

**Funciones:**
```typescript
export function publishNotificacion(id_institucion: number, notificacion: any)
export function subscribeNotificaciones(id_institucion: number, callback: Function)
```

✅ **Sistema ya funcional para web admin en tiempo real**

#### **C. Tabla de Notificaciones en BD**

**Modelo:** `app/models/notificacione.ts`

```typescript
{
  id_notificacion: number (PK)
  id_institucion: number
  id_usuario_destino: number  // ID del estudiante afectado
  tipo: 'inactividad' | 'puntaje_bajo' | 'progreso_lento' | etc
  payload: any  // JSON con datos completos
  leida: boolean
  createdAt: DateTime
}
```

✅ **Tabla existe y funciona** - Migración: `1757896002783_create_notificaciones_table.ts`

---

## 3️⃣ RUTAS Y CONTROLADORES

### **Archivo de rutas:** `start/Routes/rol.ts`

### **Rutas móvil existentes (todas con middleware de estudiante):**

```typescript
// Perfil y configuración
Route.get('estudiante/perfil', ...)
Route.put('movil/perfil/:id', ...)
Route.post('movil/password', ...)

// Test de Kolb
Route.get('kolb/preguntas', ...)
Route.post('kolb/enviar', ...)
Route.get('kolb/resultado', ...)

// Sesiones y simulacros
Route.post('quizz/iniciar', ...)
Route.post('quizz/cerrar', ...)
Route.post('movil/simulacro', ...)
Route.post('movil/simulacro/cerrar', ...)

// Progreso
Route.get('movil/progreso/resumen', ...)
Route.get('movil/progreso/materias', ...)
Route.get('movil/progreso/historial', ...)

// Retos 1vs1
Route.post('movil/retos', ...)
Route.post('movil/retos/:id_reto/aceptar', ...)
Route.post('movil/retos/ronda', ...)
Route.get('movil/retos/:id_reto/estado', ...)

// Logros y ranking
Route.get('movil/ranking', ...)
Route.get('movil/logros', ...)
Route.get('movil/logros/todos', ...)
```

✅ **Controlador móvil principal:** `app/controller/movil_controller.ts`

### ❌ **NO EXISTE aún:**
- Endpoint para registrar token FCM
- Servicio de notificaciones FCM

---

## 4️⃣ MODELO DE DATOS

### **A. Modelo Usuario/Estudiante**

**Archivo:** `app/models/usuario.ts`

```typescript
{
  id_usuario: number (PK)
  id_institucion: number
  rol: 'administrador' | 'estudiante'
  
  // Datos personales
  tipo_documento: string
  numero_documento: string
  nombre: string
  apellido: string
  correo: string
  password_hash: string
  
  // Info estudiante
  grado?: string
  curso?: string
  jornada?: string
  telefono?: string
  direccion?: string
  foto_url?: string
  
  is_active: boolean
  last_login_at?: DateTime
  last_activity_at?: DateTime
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

### **B. Tabla/Modelo para FCM Tokens**

❌ **NO EXISTE** - Necesita crearse

**Estructura recomendada:**
```typescript
fcm_tokens {
  id_token: number (PK)
  id_usuario: number (FK)
  fcm_token: string (unique)
  device_id?: string
  platform: 'android' | 'ios'
  is_active: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## 5️⃣ CONFIGURACIÓN FIREBASE ACTUAL

### ✅ Archivo de credenciales existe

**Ubicación:** `config/firebase-admin-sdk.json`

```json
{
  "type": "service_account",
  "project_id": "eduexce-b1296",
  "private_key_id": "68d52f62dfe...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-fbsvc@eduexce-b1296.iam.gserviceaccount.com",
  ...
}
```

### ❌ Firebase Admin SDK NO está inicializado en el código

**Necesita crearse:**
- Servicio para inicializar Firebase Admin SDK
- Servicio para enviar notificaciones FCM
- Integración con sistema de detección de puntajes bajos

---

## 🎯 LO QUE NECESITA CREARSE

### ✅ **1. Inicialización de Firebase Admin SDK**

```typescript
// app/services/firebase_service.ts
import admin from 'firebase-admin'
import serviceAccount from '#config/firebase-admin-sdk.json'

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
})

export default admin
```

### ✅ **2. Servicio de Notificaciones FCM**

```typescript
// app/services/fcm_service.ts
class FcmService {
  async enviarNotificacionPorUsuario(id_usuario, titulo, cuerpo, data)
  async enviarNotificacionPorToken(fcmToken, titulo, cuerpo, data)
  async registrarToken(id_usuario, fcmToken, deviceId, platform)
  async desactivarToken(fcmToken)
  async obtenerTokensActivos(id_usuario)
}
```

### ✅ **3. Endpoint para registrar token FCM**

```typescript
// En movil_controller.ts
Route.post('movil/fcm-token', (ctx) => new MovilController().registrarFcmToken(ctx))
  .use(onlyRol({ rol: 'estudiante' }))

// Payload esperado:
{
  fcm_token: "string",
  device_id: "string",
  platform: "android" | "ios"
}
```

### ✅ **4. Integración con detección de puntajes bajos**

El código ya detecta puntajes bajos en:
- `app/services/notificaciones_realtime_service.ts`
- Método: `notificarPuntajeBajoInmediato()`

**Solo falta:** Agregar llamada a FCM cuando se detecte puntaje bajo.

### ✅ **5. Migración para tabla fcm_tokens**

```bash
node ace make:migration create_fcm_tokens_table
```

---

## 📊 RESUMEN EJECUTIVO

| Componente | Estado | Acción requerida |
|------------|--------|------------------|
| **Sistema de notificaciones BD** | ✅ Funcional | Ninguna |
| **Redis Pub/Sub** | ✅ Funcional | Ninguna |
| **Detección puntajes bajos** | ✅ Funcional | Solo agregar FCM |
| **Firebase credentials** | ✅ Existe | Ninguna |
| **Firebase Admin SDK init** | ❌ No existe | Crear servicio |
| **Servicio FCM** | ❌ No existe | Crear completo |
| **Endpoint registrar token** | ❌ No existe | Crear en MovilController |
| **Modelo/Tabla fcm_tokens** | ❌ No existe | Crear migración + modelo |
| **Integración completa** | ❌ No existe | Conectar todo |

---

## 🚀 IMPLEMENTACIÓN SUGERIDA

### **Orden de creación:**

1. **Migración:** Tabla `fcm_tokens`
2. **Modelo:** `FcmToken.ts`
3. **Servicio:** `firebase_service.ts` (inicialización)
4. **Servicio:** `fcm_service.ts` (envío de notificaciones)
5. **Controller:** Método `registrarFcmToken()` en `MovilController`
6. **Ruta:** `POST /movil/fcm-token`
7. **Integración:** Modificar `notificaciones_realtime_service.ts` para enviar también por FCM

---

## 🔗 INTEGRACIÓN CON CÓDIGO EXISTENTE

### **Hook en detección de puntaje bajo:**

```typescript
// En: app/services/notificaciones_realtime_service.ts
// Línea ~121: notificarPuntajeBajoInmediato()

// AGREGAR después de crear notificación en BD:
if (puntaje < 40) {
  // ... código existente ...
  
  // 🆕 AGREGAR: Enviar por FCM también
  const fcmService = new FcmService()
  await fcmService.enviarNotificacionPorUsuario(
    id_usuario,
    '📉 Puntaje bajo detectado',
    `Obtuviste ${puntaje}% en ${area}. ¡Sigue practicando!`,
    { tipo: 'puntaje_bajo', area, puntaje }
  )
}
```

---

## ✅ VENTAJAS DEL SISTEMA ACTUAL

1. ✅ **Ya detecta puntajes bajos automáticamente**
2. ✅ **Ya tiene sistema de notificaciones en BD**
3. ✅ **Ya usa Redis para tiempo real (web)**
4. ✅ **Arquitectura limpia y escalable**
5. ✅ **Firebase credentials ya configuradas**

**Solo falta:** Agregar capa de FCM para enviar a móviles 📱

---

## 📝 NOTAS IMPORTANTES

- El sistema ya funciona para web admin (SSE + Redis)
- La detección de puntajes bajos es instantánea
- Las notificaciones se guardan en BD con `id_usuario_destino`
- El payload tiene toda la info necesaria (area, puntaje, nombre, etc)
- El modelo Usuario NO tiene campo `fcm_token` - necesita tabla aparte

---

**¿Todo claro? Proceder con la implementación paso a paso.** 🚀




