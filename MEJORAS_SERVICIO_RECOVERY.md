# 🔐 Mejoras y Alternativas - Servicio de Recuperación de Contraseña

## 📊 Estado Actual (31/10/2024)

### ✅ Implementado
- ✅ Recuperación Admin (JWT con link por email)
- ✅ Recuperación Estudiante Web (JWT con link por email)
- ✅ Recuperación Estudiante Móvil (OTP de 6 dígitos)
- ✅ Redis para caché con fallback a memoria
- ✅ SMTP configurado (Brevo/Mailtrap)
- ✅ Endpoints públicos sin autenticación

### ⚠️ Problema Actual
**Síntoma:** `POST /auth/recovery/admin/enviar` devuelve **404** en Docker
**Causa posible:** Desincronización entre build local y Docker

---

## 🔍 **ALTERNATIVA 1: Endpoints de Debug (IMPLEMENTADO)**

### Endpoints agregados:
```typescript
GET /health
GET /debug/rutas
```

### Uso:
```bash
# 1. Verificar que el servidor esté activo
curl https://tu-ngrok-url.ngrok-free.dev/health

# 2. Listar TODAS las rutas registradas
curl https://tu-ngrok-url.ngrok-free.dev/debug/rutas
```

### ¿Por qué es útil?
- Confirma que Docker está ejecutando el código actualizado
- Muestra si las rutas de recovery están registradas
- Verifica variables de entorno (SMTP, Redis)

---

## 🛡️ **ALTERNATIVA 2: Mejorar Seguridad con Rate Limiting**

### Problema:
Sin rate limiting, un atacante puede:
- Hacer fuerza bruta en los códigos OTP
- Saturar el sistema con solicitudes de recuperación
- Agotar el límite de emails de Brevo (300/día)

### Solución: Implementar Throttle Middleware

**Instalación:**
```bash
npm install @adonisjs/limiter
```

**Configuración:**
```typescript
// start/Routes/rol.ts
import { throttle } from '@adonisjs/limiter/services/limiter'

// Limitar recuperación a 3 intentos por IP cada 15 minutos
Route.post('auth/recovery/admin/enviar', (ctx) => new AuthController().enviarRecoveryAdmin(ctx))
  .use(throttle({ max: 3, duration: '15m' }))

Route.post('estudiante/recuperar/solicitar', (ctx) => new AuthController().solicitarCodigoEstudiante(ctx))
  .use(throttle({ max: 3, duration: '15m' }))

Route.post('estudiante/recuperar/verificar', (ctx) => new AuthController().verificarCodigoEstudiante(ctx))
  .use(throttle({ max: 5, duration: '5m' }))
```

**Beneficios:**
- ✅ Previene ataques de fuerza bruta
- ✅ Protege el límite de emails
- ✅ Mejora la seguridad general

---

## 🔒 **ALTERNATIVA 3: Validación más Estricta de Emails**

### Problema:
Actualmente solo validamos que el email no esté vacío.

### Solución: Usar VineJS (ya está en AdonisJS)

**Implementación:**
```typescript
// app/validators/recovery_validator.ts
import vine from '@vinejs/vine'

export const recoveryRequestValidator = vine.compile(
  vine.object({
    correo: vine.string().email().normalizeEmail()
  })
)

// En el controller
import { recoveryRequestValidator } from '#validators/recovery_validator'

public async enviarRecoveryAdmin({ request, response }: HttpContext) {
  const payload = await request.validateUsing(recoveryRequestValidator)
  const ok = await recuperacionService.enviarCodigoAdmin(payload.correo)
  // ...
}
```

**Beneficios:**
- ✅ Normaliza emails (convierte a minúsculas, trim automático)
- ✅ Valida formato correcto
- ✅ Devuelve errores claros al cliente

---

## 📧 **ALTERNATIVA 4: Sistema de Colas para Emails**

### Problema:
Los emails se envían de forma síncrona, bloqueando la respuesta HTTP.

### Solución: Usar Bull Queue + Redis

**Instalación:**
```bash
npm install bull @types/bull
```

**Implementación:**
```typescript
// app/services/email_queue_service.ts
import Queue from 'bull'
import { mailer } from '#services/recuperacion_service'

const emailQueue = new Queue('emails', process.env.REDIS_URL || 'redis://localhost:6379')

emailQueue.process(async (job) => {
  const { to, subject, text, html } = job.data
  await mailer().sendMail({ to, subject, text, html })
  console.log(`✅ Email enviado a: ${to}`)
})

export async function queueEmail(emailData: any) {
  await emailQueue.add(emailData, {
    attempts: 3, // Reintentar 3 veces si falla
    backoff: { type: 'exponential', delay: 5000 }
  })
}

// En recuperacion_service.ts
await queueEmail({
  to: correo,
  subject: 'Recuperación de acceso',
  html: `...`
})
```

**Beneficios:**
- ✅ Respuesta HTTP instantánea (no espera el email)
- ✅ Reintentos automáticos si falla SMTP
- ✅ Dashboard de monitoreo con Bull Board
- ✅ Escala mejor con alto tráfico

---

## 🔐 **ALTERNATIVA 5: Autenticación de 2 Factores (2FA)**

### Implementación futura:
```typescript
// Flujo completo de 2FA
1. Usuario inicia sesión con contraseña
2. Sistema envía código OTP (6 dígitos) por email/SMS
3. Usuario ingresa código para completar login
4. Se genera token JWT solo si el código es válido

// Endpoints:
POST /auth/login          → Devuelve { requiresOTP: true }
POST /auth/verify-otp     → Devuelve { token: "..." }
```

**Beneficios:**
- ✅ Seguridad extra para cuentas admin
- ✅ Previene accesos no autorizados
- ✅ Compatible con el sistema OTP existente

---

## 📊 **ALTERNATIVA 6: Sistema de Auditoría**

### Implementación:
```typescript
// app/models/audit_log.ts
export default class AuditLog extends BaseModel {
  @column() declare action: 'recovery_request' | 'recovery_success' | 'login_attempt'
  @column() declare user_email: string
  @column() declare ip_address: string
  @column() declare user_agent: string
  @column() declare status: 'success' | 'failed'
  @column.dateTime() declare createdAt: DateTime
}

// En el controller
await AuditLog.create({
  action: 'recovery_request',
  user_email: correo,
  ip_address: request.ip(),
  user_agent: request.header('User-Agent'),
  status: ok ? 'success' : 'failed'
})
```

**Beneficios:**
- ✅ Historial completo de recuperaciones
- ✅ Detecta patrones sospechosos
- ✅ Cumple con normativas de seguridad

---

## 🐛 **SOLUCIÓN INMEDIATA AL 404**

### Pasos para tu compañero con Docker:

```bash
# 1. Ir al directorio del proyecto
cd /ruta/al/proyecto

# 2. Verificar que estás en main
git branch
# Si no: git checkout main

# 3. Traer cambios
git pull origin main

# 4. Verificar que el archivo .env.production existe
ls -la .env.production

# 5. Detener contenedores
docker-compose down

# 6. Limpiar imágenes viejas
docker image rm zavira-api:latest || true

# 7. Reconstruir SIN CACHÉ
docker-compose build --no-cache

# 8. Levantar contenedores
docker-compose up -d

# 9. Ver logs en tiempo real
docker-compose logs -f api

# 10. Verificar que el endpoint existe
curl https://tu-ngrok-url.ngrok-free.dev/debug/rutas
```

### Verificar que el endpoint funciona:
```bash
# Health check
curl https://gillian-semiluminous-blubberingly.ngrok-free.dev/health

# Debug rutas
curl https://gillian-semiluminous-blubberingly.ngrok-free.dev/debug/rutas | jq '.rutas_recovery'

# Test real de recuperación
curl -X POST https://gillian-semiluminous-blubberingly.ngrok-free.dev/auth/recovery/admin/enviar \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@ejemplo.com"}'
```

---

## 📈 **Roadmap de Mejoras Futuras**

### Prioridad Alta 🔴
1. ✅ Endpoint de debug (/debug/rutas) - **IMPLEMENTADO**
2. ✅ Logs detallados en controllers - **IMPLEMENTADO**
3. ⏳ Rate limiting (protección básica)
4. ⏳ Validación de emails con VineJS

### Prioridad Media 🟡
5. ⏳ Sistema de colas para emails (Bull)
6. ⏳ Dashboard de monitoreo (Bull Board)
7. ⏳ Sistema de auditoría

### Prioridad Baja 🟢
8. ⏳ Autenticación 2FA
9. ⏳ Templates HTML profesionales para emails
10. ⏳ Notificaciones por SMS (Twilio)

---

## 🧪 **Testing**

### Tests que deberías crear:
```typescript
// tests/functional/recovery.spec.ts
test('debe enviar email de recuperación admin', async ({ client }) => {
  const response = await client.post('/auth/recovery/admin/enviar')
    .json({ correo: 'admin@test.com' })
  
  response.assertStatus(200)
  response.assertBodyContains({ ok: true })
})

test('debe rechazar emails inválidos', async ({ client }) => {
  const response = await client.post('/auth/recovery/admin/enviar')
    .json({ correo: 'invalid-email' })
  
  response.assertStatus(400)
})

test('debe respetar rate limit', async ({ client }) => {
  // Hacer 4 solicitudes seguidas
  for (let i = 0; i < 4; i++) {
    await client.post('/auth/recovery/admin/enviar')
      .json({ correo: 'admin@test.com' })
  }
  
  // La 4ta debe fallar con 429 (Too Many Requests)
  const response = await client.post('/auth/recovery/admin/enviar')
    .json({ correo: 'admin@test.com' })
  
  response.assertStatus(429)
})
```

---

## 📚 **Recursos Útiles**

- [AdonisJS Throttle](https://docs.adonisjs.com/guides/limiter)
- [VineJS Validation](https://vinejs.dev/)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [Nodemailer Templates](https://nodemailer.com/message/)

---

**Última actualización:** 31/10/2024
**Autor:** AI Assistant
**Versión:** 1.0

