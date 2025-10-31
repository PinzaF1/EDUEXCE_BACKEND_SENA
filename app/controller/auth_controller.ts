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
    const numero_documento = String(request.input('numero_documento') || '').trim();
    const password = String(request.input('password') || '');
    
    console.log('Datos de entrada:', { numero_documento, password });

    // Verificación de datos
    if (!numero_documento || !password) {
      console.log('Error: Documento o contraseña faltantes');
      return response.badRequest({ error: 'Documento y contraseña son obligatorios' });
    }

    // Llamado al servicio de login
    const resultado = await authService.loginEstudiante(numero_documento, password);
    console.log('Resultado del login:', resultado);

    if (!resultado) {
      console.log('Error: Credenciales inválidas');
      return response.unauthorized({ error: 'Credenciales inválidas' });
    }

    // Retorna el resultado con el token
    return response.ok(resultado);
  } catch (e: any) {
    console.log('Error al intentar hacer login:', e.message || 'Error en el login');
    return response.badRequest({ error: e.message || 'Error en el login' });
  }
}


  // EP-02: Recuperación ADMIN
  public async enviarRecoveryAdmin({ request, response }: HttpContext) {
    try {
      const correo = String(request.input('correo') || '').trim().toLowerCase()
      console.log(`[Recovery Admin] 🔵 Solicitud recibida para: ${correo}`)
      
      if (!correo) {
        console.log('[Recovery Admin] ❌ Correo vacío')
        return response.badRequest({ error: 'El correo es obligatorio' })
      }

      const ok = await recuperacionService.enviarCodigoAdmin(correo)
      
      if (ok) {
        console.log(`[Recovery Admin] ✅ Email enviado exitosamente para: ${correo}`)
        return response.ok({ ok: true, message: 'Email enviado correctamente' })
      } else {
        console.log(`[Recovery Admin] ⚠️ Correo no encontrado: ${correo}`)
        return response.notFound({ error: 'Correo no registrado' })
      }
    } catch (error: any) {
      console.error('[Recovery Admin] 🔴 Error inesperado:', error.message || error)
      return response.internalServerError({ error: 'Error interno del servidor' })
    }
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

  // ==================== NUEVOS ENDPOINTS PARA MÓVIL (CON CÓDIGO) ====================

  public async solicitarCodigoEstudiante({ request, response }: HttpContext) {
    try {
      const correo = String(request.input('correo') || '').trim().toLowerCase()
      
      if (!correo) {
        return response.badRequest({ error: 'El correo es obligatorio' })
      }

      const result = await recuperacionService.solicitarCodigoEstudiantePorCorreo(correo)
      
      if (result && (result as any).success) {
        return response.ok({ 
          success: true, 
          message: 'Código enviado por email',
          codigo: (result as any).codigo // Solo en desarrollo/testing
        })
      }
      
      return response.notFound({ error: 'Correo no registrado' })
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error al solicitar código' })
    }
  }

  // 2️⃣ VERIFICAR CÓDIGO - Móvil espera: POST /estudiante/recuperar/verificar
  public async verificarCodigoEstudiante({ request, response }: HttpContext) {
    try {
      const correo = String(request.input('correo') || '').trim().toLowerCase()
      const codigo = String(request.input('codigo') || '').trim()
      
      if (!correo || !codigo) {
        return response.badRequest({ error: 'Correo y código son obligatorios' })
      }

      const valid = await recuperacionService.verificarCodigoEstudiante(correo, codigo)
      
      if (valid) {
        return response.ok({ valid: true, message: 'Código válido' })
      }
      
      return response.ok({ valid: false, message: 'Código inválido o expirado' })
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error al verificar código' })
    }
  }

  // 3️⃣ RESTABLECER CONTRASEÑA - Móvil espera: POST /estudiante/recuperar/restablecer
  public async restablecerPasswordEstudiante({ request, response }: HttpContext) {
    try {
      const correo = String(request.input('correo') || '').trim().toLowerCase()
      const codigo = String(request.input('codigo') || '').trim()
      const nueva = String(request.input('nueva_password') || '')
      
      if (!correo || !codigo || !nueva) {
        return response.badRequest({ error: 'Todos los campos son obligatorios' })
      }

      if (nueva.length < 6) {
        return response.badRequest({ error: 'La contraseña debe tener mínimo 6 caracteres' })
      }

      const ok = await recuperacionService.restablecerPasswordConCodigo(correo, codigo, nueva)
      
      if (ok) {
        return response.ok({ success: true, message: 'Contraseña restablecida exitosamente' })
      }
      
      return response.badRequest({ error: 'Código inválido, expirado o ya utilizado' })
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error al restablecer contraseña' })
    }
  }
}
export default AuthController
