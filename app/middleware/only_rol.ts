// app/middleware/only_rol.ts
import jwt from 'jsonwebtoken'
import type { HttpContext } from '@adonisjs/core/http'

const JWT_SECRET = process.env.JWT_SECRET || 'secret123'

export function onlyRol({ rol }: { rol: 'administrador' | 'estudiante' }) {
  return async function ({ request, response }: HttpContext, next: () => Promise<void>) {
    const authHeader = request.header('Authorization')
    if (!authHeader) return response.unauthorized({ error: 'Token requerido' })

    try {
      const token = authHeader.replace('Bearer ', '').trim()
      const payload = jwt.verify(token, JWT_SECRET) as any

      if (payload.rol !== rol) return response.forbidden({ error: 'No autorizado' })

      // deja el payload disponible para los controladores
      ;(request as any).authUsuario = payload
      await next()
    } catch {
      return response.unauthorized({ error: 'Token inválido' })
    }
  }
}
