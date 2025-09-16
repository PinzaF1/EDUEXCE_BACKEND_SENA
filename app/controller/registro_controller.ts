// app/controller/registro_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import RegistroService from '../services/registro_service.js'

const registroService = new RegistroService()

export default class RegistroController {
  public async registrarInstitucion({ request, response }: HttpContext) {
    try {
      // Campos base
      const base = request.only([
        'nombre_institucion',
        'codigo_dane',
        'ciudad',
        'departamento',
        'direccion',
        'telefono',
        'correo',
        'password',
        'jornada',
      ]) as any

      // Agrega confirm_password (acepta alias password_confirmation)
      const datos = {
        ...base,
        confirm_password:
          request.input('confirm_password') ??
          request.input('password_confirmation') ??
          '',
      }

      // Chequeo rápido (opcional). El service también valida.
      if (datos.confirm_password && datos.confirm_password !== datos.password) {
        return response.badRequest({ error: 'Las contraseñas no coinciden' })
      }

      const resultado = await registroService.registrarInstitucion(datos)
      return response.created(resultado)
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error al registrar institución' })
    }
  }
}
