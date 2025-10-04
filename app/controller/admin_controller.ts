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
  // ===== Dashboard / Seguimiento (móvil-web) =====
  public async dashboard({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    await notificacionesService.generarParaInstitucion(Number(auth.id_institucion))
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

  /**
   * Importar estudiantes:
   *  - multipart: archivo (campo estudiantes | file | archivo)
   *  - JSON: { filas: [...] } o { estudiantes: [...] }
   */
  public async importarEstudiantes(ctx: HttpContext) {
    const f1 = ctx.request.file('estudiantes', { size: '20mb' })
    const f2 = ctx.request.file('file', { size: '20mb' })
    const f3 = ctx.request.file('archivo', { size: '20mb' })
    if (f1 || f2 || f3) {
      return (estudiantesService as any).subirCSV(ctx)
    }

    const ct = String(ctx.request.header('content-type') || '').toLowerCase()
    if (ct.includes('multipart/form-data')) {
      return (estudiantesService as any).subirCSV(ctx)
    }

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
    const n = await (notificacionesService as any).generarParaInstitucion(Number(auth.id_institucion))
    return response.ok({ ok: true, generadas: n })
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

  // ====== WEB: KPIs superiores (Promedio Actual, Mejora, Participando) ======
  public async webSeguimientoResumen({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (dashboardService as any).kpisResumen(Number(auth.id_institucion))
    return response.ok(data)
  }

  // ====== WEB: Comparativo por cursos (promedio + progreso) ======
  public async webSeguimientoCursos({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (seguimientoService as any).comparativoPorCursos(Number(auth.id_institucion))
    const itemsSrc = Array.isArray(data) ? data : (Array.isArray((data as any).items) ? (data as any).items : [])
    const items = itemsSrc.map((r: any) => ({
      curso: String(r?.curso ?? ''),
      estudiantes: Number(r?.estudiantes ?? 0),
      promedio: Number(r?.promedio ?? 0),
      progreso: Number(r?.progreso_pct ?? 0),
    }))
    return response.ok({ items })
  }

  // ====== WEB: Áreas que necesitan refuerzo ======
  public async webAreasRefuerzo({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const q = request.qs() as any

    const crit = Number(q.umbral ?? 60)
    const aten = Number(q.umbral_atencion ?? 30)
    const up   = Number(q.umbral_puntaje ?? 60)
    const min  = Number(q.min_participantes ?? 5)

    const { areas } = await (seguimientoService as any).areasQueNecesitanRefuerzo(
      Number(auth.id_institucion), crit, aten, up, min
    )

    const display: Record<string, string> = {
      Matematicas: 'Matematicas',
      Ingles: 'Ingles',
      Lenguaje: 'Lectera Critica',
      Ciencias: 'Ciencias Naturales',
      Sociales: 'Sociales y Ciudadanas',
    }

    const ORDER = [
      'Ciencias Naturales',
      'Ingles',
      'Lectera Critica',
      'Matematicas',
      'Sociales y Ciudadanas',
    ]

    const items = (areas as any[]).map((a) => ({
      area: display[a.area] ?? a.area,
      estado: a.estado,
      porcentaje_bajo: Number(a.porcentaje_bajo ?? 0),
      porcentaje: Number(a.porcentaje_bajo ?? 0),
      debajo_promedio: Number(a.debajo_promedio ?? 0),
    }))

    items.sort((x, y) => ORDER.indexOf(x.area) - ORDER.indexOf(y.area))

    return response.ok({ areas: items })
  }

  // ====== WEB: Estudiantes que requieren atención ======
  public async webEstudiantesAlerta({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { umbral = 50, min_intentos = 2 } = request.qs() as any
    const data = await (dashboardService as any).estudiantesAlerta(Number(auth.id_institucion), {
      umbral: Number(umbral),
      min_intentos: Number(min_intentos),
    })
    return response.ok(data)
  }

  // ====== WEB: Cards de estudiantes activos por área (mes actual) ======
  public async webAreasActivos({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (dashboardService as any).tarjetasPorArea(Number(auth.id_institucion))
    const areas = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles'] as const
    const islas = areas.map((area) => ({ area, activos: (data as any)[area] || 0 }))
    return response.ok({ islas })
  }

  // ====== WEB: Serie Progreso por Área (últimos N meses) ======
  public async webSerieProgresoPorArea({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const meses = Number((request.qs() as any).meses ?? 6)
    const series = await (dashboardService as any).progresoMensualPorArea(Number(auth.id_institucion), meses)
    const flat = Object.entries(series).flatMap(([area, puntos]: any) =>
      (puntos as any[]).map((p: any) => ({ mes: p.mes, area, valor: p.promedio }))
    )
    return response.ok({ series: flat })
  }

  // ====== WEB: Rendimiento por Área (mes actual) ======
  public async webRendimientoPorArea({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const now = new Date()
    const rend = await (dashboardService as any).rendimientoDelMes(
      Number(auth.id_institucion),
      now.getFullYear(),
      now.getMonth() + 1
    )
    const items = Object.entries(rend).map(([area, promedio]) => ({ area, promedio }))
    return response.ok({ items })
  }
}

export default AdminController
