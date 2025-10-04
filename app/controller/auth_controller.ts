import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '../services/auth_service.js'
import RecuperacionService from '../services/recuperacion_service.js'

const authService = new AuthService()
const recuperacionService = new RecuperacionService()

class AuthController {
  // EP-02: Login Admin
  public async loginAdministrador({ request, response }: HttpContext) {
    try {
      const correo = String(request.input('correo') || '').trim().toLowerCase()
      const password = String(request.input('password') || '')
      if (!correo || !password) return response.badRequest({ error: 'Correo y contraseña son obligatorios' })

      const resultado = await authService.loginAdministrador(correo, password)
      if (!resultado) return response.unauthorized({ error: 'Credenciales inválidas' })
      return response.ok(resultado)
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error en el login' })
    }
  }

  // EP-09 (móvil): Login Estudiante
  public async loginEstudiante({ request, response }: HttpContext) {
    try {
      const numero_documento = String(request.input('numero_documento') || '').trim()
      const password = String(request.input('password') || '')
      if (!numero_documento || !password) {
        return response.badRequest({ error: 'Documento y contraseña son obligatorios' })
      }

      const resultado = await authService.loginEstudiante(numero_documento, password)
      if (!resultado) return response.unauthorized({ error: 'Credenciales inválidas' })
      return response.ok(resultado)
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error en el login' })
    }
  }

  // EP-02: Recuperación ADMIN
  public async enviarRecoveryAdmin({ request, response }: HttpContext) {
    const ok = await recuperacionService.enviarCodigoAdmin(String(request.input('correo') || ''))
    return ok ? response.ok({ ok: true }) : response.notFound({ error: 'Correo no registrado' })
  }
  public async restablecerAdmin({ request, response }: HttpContext) {
    const token = String(request.input('token') || '')
    const nueva = String(request.input('nueva') || '')
    const ok = await recuperacionService.restablecerAdmin(token, nueva)
    return ok ? response.ok({ ok: true }) : response.badRequest({ error: 'Token inválido' })
  }

  // EP-09 (móvil): Recuperación ESTUDIANTE
  public async enviarRecoveryEstudiante({ request, response }: HttpContext) {
    const ok = await recuperacionService.enviarCodigoEstudiante(String(request.input('correo') || ''))
    return ok ? response.ok({ ok: true }) : response.notFound({ error: 'Correo no registrado' })
  }
  public async restablecerEstudiante({ request, response }: HttpContext) {
    const token = String(request.input('token') || '')
    const nueva = String(request.input('nueva') || '')
    const ok = await recuperacionService.restablecerEstudiante(token, nueva)
    return ok ? response.ok({ ok: true }) : response.badRequest({ error: 'Token inválido' })
  }
}
export default AuthController
