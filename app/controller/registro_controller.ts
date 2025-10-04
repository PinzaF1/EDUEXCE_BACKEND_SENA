import type { HttpContext } from '@adonisjs/core/http'
import RegistroService from '../services/registro_service.js'

const registroService = new RegistroService()

export default class RegistroController {
  public async registrarInstitucion({ request, response }: HttpContext) {
    try {
      // Campos base + alias de confirmación
      const body = request.only([
        'nombre_institucion',
        'codigo_dane',
        'ciudad',
        'departamento',
        'direccion',
        'telefono',
        'correo',
        'password',
        'jornada',
        'confirm_password',
        'password_confirmation',
      ]) as any

      const datos = {
        ...body,
        confirm_password: body?.confirm_password ?? body?.password_confirmation ?? '',
      }

      // Validación rápida de coincidencia (el service valida todo igual)
      if (datos.confirm_password && datos.confirm_password !== datos.password) {
        return response.badRequest({ error: 'Las contraseñas no coinciden' })
      }

      const resultado = await registroService.registrarInstitucion(datos)
      return response.created(resultado)
    } catch (e: any) {
      return response.badRequest({ error: e?.message || 'Error al registrar institución' })
    }
  }
}
