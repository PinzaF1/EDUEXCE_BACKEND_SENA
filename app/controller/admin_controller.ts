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
  // 1) Intentar SIEMPRE por archivo primero (probamos todas las claves)
  const f1 = ctx.request.file('estudiantes', { size: '20mb' })
  const f2 = ctx.request.file('file', { size: '20mb' })
  const f3 = ctx.request.file('archivo', { size: '20mb' })

  if (f1 || f2 || f3) {
    return (estudiantesService as any).subirCSV(ctx)
  }

  // hay clientes (incluido Postman) que declaran multipart sin adjuntar nada:
  const ct = String(ctx.request.header('content-type') || '').toLowerCase()
  if (ct.includes('multipart/form-data')) {
    // igual enviamos al flujo que ya maneja el error “Sube un CSV...”
    return (estudiantesService as any).subirCSV(ctx)
  }

  // 2) Fallback JSON { filas: [...] }
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

  // ====== WEB: KPIs superiores (Promedio Actual, Mejora, Participando) ======
public async webSeguimientoResumen({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const data = await (dashboardService as any).kpisResumen(Number(auth.id_institucion))
  return response.ok(data)
}


public async webSeguimientoCursos({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  // usa tu servicio correcto
  const data = await (seguimientoService as any).comparativoPorCursos(Number(auth.id_institucion))
  // adapta nombres para la UI (items + progreso)
  const items = (Array.isArray(data) ? data : []).map((r: any) => ({
    curso: String(r?.curso ?? ''),
    estudiantes: Number(r?.estudiantes ?? 0),
    promedio: Number(r?.promedio ?? 0),
    progreso: Number(r?.progreso_pct ?? 0), // <- renombrado
  }))
  return response.ok({ items })
}


// ====== WEB: Áreas que necesitan refuerzo ======
public async webAreasRefuerzo({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const q = request.qs() as any
  const crit = Number(q.umbral ?? 60)              // % crítico
  const aten = Number(q.umbral_atencion ?? 30)     // % atención
  const up   = Number(q.umbral_puntaje ?? 60)      // puntaje mínimo

  const { areas } = await (seguimientoService as any).areasQueNecesitanRefuerzo(
    Number(auth.id_institucion),
    crit,
    aten,
    up
  )

  return response.ok({ areas })
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
  // opcional: mismo formato de “islas” que usas en el resumen
  const areas = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles'] as const
  const islas = areas.map((area) => ({ area, activos: (data as any)[area] || 0 }))
  return response.ok({ islas })
}

// ====== WEB: Serie Progreso por Área (últimos N meses) ======
public async webSerieProgresoPorArea({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const meses = Number((request.qs() as any).meses ?? 6)
  const series = await (dashboardService as any).progresoMensualPorArea(Number(auth.id_institucion), meses)
  // aplanado para el gráfico de líneas
  const flat = Object.entries(series).flatMap(([area, puntos]: any) =>
    puntos.map((p: any) => ({ mes: p.mes, area, valor: p.promedio }))
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
