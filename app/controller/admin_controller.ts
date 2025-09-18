// app/controllers/admin_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import DashboardAdminService from '../services/dashboard_admin_service.js'
import SeguimientoAdminService from '../services/seguimiento_admin_service.js'
import EstudiantesService from '../services/estudiantes_service.js'
import NotificacionesService from '../services/notificaciones_service.js'
import PerfilService from '../services/perfil_service.js'

const dashboardService = new DashboardAdminService()
const seguimientoService = new SeguimientoAdminService()
const estudiantesService = new EstudiantesService()
const notificacionesService = new NotificacionesService()
const perfilService = new PerfilService()

class AdminController {
  public async dashboard({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    await notificacionesService.generarParaInstitucion(auth.id_institucion)
    const data = await (dashboardService as any).resumen(Number(auth.id_institucion))
    return response.ok(data)
  }

  public async seguimiento({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (seguimientoService as any).resumenMensual(Number(auth.id_institucion))
    return response.ok(data)
  }

  // ===== Estudiantes =====
  public async listarEstudiantes({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const q = request.qs()
    const data = await estudiantesService.listar({
      id_institucion: Number(auth.id_institucion),
      grado: q.grado,
      curso: q.curso,
      jornada: q.jornada,
      busqueda: q.q ?? q.busqueda,
    })
    return response.ok(data)
  }

  public async crearEstudiante({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const b = request.body() as any

      const res = await estudiantesService.crearUno({
        id_institucion: Number(auth.id_institucion),
        tipo_documento: String(b.tipo_documento || '').trim(),
        numero_documento: String(b.numero_documento || '').trim(),
        nombre: String(b.nombre ?? b.nombres ?? '').trim(),
        apellido: String(b.apellido ?? b.apellidos ?? '').trim(),
        correo: b.correo ? String(b.correo).toLowerCase() : null,
        direccion: b.direccion ?? null,
        telefono: b.telefono ?? null,
        grado: b.grado ?? null,
        curso: b.curso ?? null,
        jornada: b.jornada ?? null,
      })

      return response.created(res)
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error al crear estudiante' })
    }
  }

  /** Importar estudiantes (multipart: archivo | JSON: { filas }) */
  public async importarEstudiantes(ctx: HttpContext) {
    // ——— detección robusta de archivo ———
    const ct = String(ctx.request.header('content-type') || '').toLowerCase()
    const isMultipart = ct.includes('multipart/form-data')

    // intenta leer por todas las claves habituales
    const f1 = ctx.request.file('estudiantes')
    const f2 = ctx.request.file('file')
    const f3 = ctx.request.file('archivo')

    // allFiles() puede no existir en algunos builds → usa defensivo
    const allFiles = (ctx.request as any).allFiles?.() ?? {}
    const hasAnyOther = Object.keys(allFiles).length > 0

    // si el CT dice multipart o encontré algún file, SIEMPRE voy al flujo subirCSV
    if (isMultipart || f1 || f2 || f3 || hasAnyOther) {
      return (estudiantesService as any).subirCSV(ctx)
    }

    // ——— fallback JSON { filas } ———
    const auth = (ctx.request as any).authUsuario
    const body: any = ctx.request.body() || {}
    const filas = Array.isArray(body.filas)
      ? body.filas
      : (Array.isArray(body.estudiantes) ? body.estudiantes : [])

    const data = await estudiantesService.importarMasivo(Number(auth.id_institucion), filas)
    return ctx.response.ok(data)
  }

  public async editarEstudiante({ request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const cambios = request.only([
      'tipo_documento',
      'numero_documento',
      'correo',
      'direccion',
      'telefono',
      'grado',
      'curso',
      'jornada',
      'nombre',
      'apellido',
      'is_active',
    ]) as any

    const data = await estudiantesService.editar(id, cambios)
    return response.ok(data)
  }

  public async eliminarEstudiante({ request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const data = await estudiantesService.eliminarOInactivar(id)
    return response.ok(data)
  }

  // ===== Notificaciones =====
  public async notificaciones({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { tipo } = request.qs()
    const data = await (notificacionesService as any).listar(Number(auth.id_institucion), tipo as any)
    return response.ok(data)
  }

  public async generarNotificaciones({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    await (notificacionesService as any).generarParaInstitucion(Number(auth.id_institucion))
    return response.ok({ ok: true })
  }

  public async marcarLeidas({ request, response }: HttpContext) {
    const { ids } = request.body() as any
    const n = await (notificacionesService as any).marcarLeidas(Array.isArray(ids) ? ids : [])
    return response.ok({ marcadas: n })
  }

  // ===== Perfil institución =====
  public async verPerfilInstitucion({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (perfilService as any).verInstitucion(Number(auth.id_institucion))
    return response.ok(data)
  }

  public async actualizarPerfilInstitucion({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const data = await (perfilService as any).actualizarInstitucion(
        Number(auth.id_institucion),
        request.body() as any
      )
      return response.ok(data)
    } catch (e: any) {
      return response.badRequest({ error: e.message || 'Error al actualizar perfil' })
    }
  }

  public async cambiarPasswordInstitucion({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { actual, nueva } = request.body() as any
    const ok = await (perfilService as any).cambiarPasswordAdmin(
      Number(auth.id_institucion),
      String(actual ?? ''),
      String(nueva ?? '')
    )
    return ok ? response.ok({ ok: true }) : response.badRequest({ error: 'No se pudo cambiar contraseña' })
  }
}

export default AdminController
