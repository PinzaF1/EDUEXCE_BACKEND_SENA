// app/middleware/audit_logger_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware de auditoría para registrar operaciones críticas
 * (DELETE, PUT, PATCH) con información del usuario autenticado
 */
export default class AuditLoggerMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const method = request.method()
    const operacionesCriticas = ['DELETE', 'PUT', 'PATCH']
    
    if (operacionesCriticas.includes(method)) {
      const auth = (request as any).authUsuario || {}
      const timestamp = new Date().toISOString()
      
      console.log('🔍 [AUDIT]', {
        timestamp,
        method,
        path: request.url(),
        usuario: {
          rol: auth.rol || 'no_autenticado',
          id_institucion: auth.id_institucion || null,
          id_usuario: auth.id_usuario || null,
        },
        params: request.params(),
        query: request.qs(),
        ip: request.ip(),
        userAgent: request.header('user-agent'),
      })
    }
    
    await next()
    
    // Log después de la respuesta para operaciones críticas
    if (operacionesCriticas.includes(method)) {
      const statusCode = response.response.statusCode
      const isSuccess = statusCode >= 200 && statusCode < 300
      const isUnauthorized = statusCode === 401 || statusCode === 403
      
      const logLevel = isUnauthorized ? '⚠️ [SECURITY]' : (isSuccess ? '✅ [AUDIT]' : '❌ [AUDIT]')
      
      console.log(logLevel, {
        timestamp: new Date().toISOString(),
        method,
        path: request.url(),
        status: statusCode,
        success: isSuccess,
        unauthorized: isUnauthorized,
      })
    }
  }
}

