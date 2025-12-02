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
      // Si es un error de duplicado estructurado, retornarlo como está
      if (e.error && (e.error === 'DUPLICADO_OTRA_INSTITUCION' || e.error === 'DUPLICADO_MISMA_INSTITUCION')) {
        return response.badRequest(e)
      }
      return response.badRequest({ error: e.message || 'Error al crear estudiante' })
    }
  }

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

 // PUT /admin/estudiantes/:id
public async editarEstudiante({ request, response }: HttpContext) {
  try {
    const id = Number(request.param('id'))

    // aceptar únicamente is_active (estandar único)
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

    const auth = (request as any).authUsuario
    const data = await estudiantesService.editarComoAdmin(id, cambios, {
      id_institucion: Number(auth?.id_institucion),
    })

    return response.ok(data)
  } catch (e: any) {
    return response.badRequest({ error: e?.message || 'No se pudo editar' })
  }
}


  public async eliminarEstudiante({ request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const { action } = request.qs() as any // opcional: 'activar' | 'inactivar' | 'eliminar'
    
    // 🔒 SEGURIDAD: obtener institución del token JWT
    const auth = (request as any).authUsuario
    const id_institucion = Number(auth.id_institucion)

    try {
      // Si piden activar explícitamente
      if (String(action).toLowerCase() === 'activar') {
        const data = await estudiantesService.activarEstudiante(id, id_institucion)
        return response.ok(data)
      }

      // Comportamiento por defecto para DELETE:
      // si tiene historial → inactivar; si no tiene → eliminar
      const data = await estudiantesService.eliminarOInactivar(id, id_institucion)
      if ((data as any).estado === 'inactivado') {
        return response.status(409).send({ error: 'Tiene historial; se inactivó en lugar de eliminar', ...data })
      }
      return response.ok(data)
    } catch (e: any) {
      // Si es error de autorización, retornar 403
      if (e.message?.includes('No autorizado')) {
        return response.status(403).send({ error: e.message })
      }
      return response.status(500).send({ error: e.message || 'Error al procesar la solicitud' })
    }
  }


  // ===== Notificaciones =====
  public async notificaciones({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const qs = request.qs()
    
    // Parsear filtros desde query string
    const opciones: any = {
      tipo: qs.tipo || undefined,
      page: qs.page ? Number(qs.page) : 1,
      limit: qs.limit ? Number(qs.limit) : 50,
      desde: qs.desde || undefined,
      hasta: qs.hasta || undefined,
      incluir_eliminadas: qs.incluir_eliminadas === 'true',
    }
    
    // Filtro de leída: acepta 'true', 'false', o undefined (todas)
    if (qs.leida === 'true') opciones.leida = true
    else if (qs.leida === 'false') opciones.leida = false
    
    const data = await (notificacionesService as any).listar(Number(auth.id_institucion), opciones)
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

  public async eliminarNotificacion({ request, response, params }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const id = Number(params.id)
      
      if (!id || isNaN(id)) {
        return response.badRequest({ error: 'ID de notificación inválido' })
      }

      const idAdmin = Number(auth.id_usuario ?? auth.id_institucion)
      const resultado = await (notificacionesService as any).eliminarUna(
        id,
        Number(auth.id_institucion),
        Number(idAdmin)
      )
      return response.ok(resultado)
    } catch (error: any) {
      if (error.message === 'Notificación no encontrada') {
        return response.notFound({ error: error.message })
      }
      return response.badRequest({ error: error.message || 'Error al eliminar notificación' })
    }
  }

  public async eliminarNotificacionesMultiples({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const { ids } = request.body() as any

      if (!Array.isArray(ids)) {
        return response.badRequest({ error: 'Se requiere un array de IDs' })
      }

      const idAdmin = Number(auth.id_usuario ?? auth.id_institucion)
      const resultado = await (notificacionesService as any).eliminarMultiples(
        ids,
        Number(auth.id_institucion),
        Number(idAdmin)
      )
      
      if (resultado.fallidas > 0) {
        return response.status(207).json(resultado)
      }
      
      return response.ok(resultado)
    } catch (error: any) {
      return response.badRequest({ error: error.message || 'Error al eliminar notificaciones' })
    }
  }

  public async eliminarTodasNotificaciones({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const qs = request.qs()
      
      const filtros: any = {}
      if (qs.leidas_solamente === 'true') filtros.leidas_solamente = true
      if (qs.tipo) filtros.tipo = qs.tipo
      if (qs.antes_de) filtros.antes_de = qs.antes_de

      const idAdmin = Number(auth.id_usuario ?? auth.id_institucion)
      const resultado = await (notificacionesService as any).eliminarTodas(
        Number(auth.id_institucion),
        Number(idAdmin),
        filtros
      )
      return response.ok(resultado)
    } catch (error: any) {
      return response.badRequest({ error: error.message || 'Error al eliminar notificaciones' })
    }
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

  // ====== WEB: KPIs superiores ======
  public async webSeguimientoResumen({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (dashboardService as any).kpisResumen(Number(auth.id_institucion))
    return response.ok(data)
  }

  // ====== WEB: Comparativo por cursos ======
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
      Lenguaje: 'Lectura Critica',   // <-- corregido
      Ciencias: 'Ciencias Naturales',
      Sociales: 'Sociales y Ciudadanas',
    }

    const ORDER = [
      'Ciencias Naturales',
      'Ingles',
      'Lectura Critica',
      'Matematicas',
      'Sociales y Ciudadanas',
    ]

    const items = (areas as any[]).map((a) => ({
      area: display[a.area] ?? a.area,
      estado: a.estado,
      porcentaje_bajo: Number(a.porcentaje_bajo ?? 0),
      porcentaje: Number(a.porcentaje_bajo ?? 0),
      debajo_promedio: Number(a.debajo_promedio ?? 0),
      nivel: a.nivel ?? null,
      subtema: a.subtema ?? null,
    }))

    items.sort((x, y) => ORDER.indexOf(x.area) - ORDER.indexOf(y.area))

    return response.ok({ areas: items })
  }

  // ====== WEB: Áreas → Niveles críticos (detalle) ======
  public async webAreasRefuerzoDetalle({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { umbral_puntaje = 60, min_porcentaje = 60 } = request.qs() as any

    const { areas } = await (seguimientoService as any).nivelesCriticosPorArea(Number(auth.id_institucion), {
      umbralPuntaje: Number(umbral_puntaje),
      minPorcentaje: Number(min_porcentaje),
    })

    const display: Record<string, string> = {
      Matematicas: 'Matematicas',
      Ingles: 'Ingles',
      Lenguaje: 'Lectura Crítica',
      Ciencias: 'Ciencias Naturales',
      Sociales: 'Sociales y Ciudadanas',
    }

    const ORDER = ['Lectura Crítica', 'Matematicas', 'Sociales y Ciudadanas', 'Ciencias Naturales', 'Ingles']

    const items = (areas as any[]).map((a) => ({
      area: display[a.area] ?? a.area,
      niveles_criticos: Number(a.niveles_criticos ?? 0),
      niveles: (a.niveles || []).map((n: any) => ({
        nivel: Number(n.nivel ?? 0),
        subtema: n.subtema ?? null,
        con_dificultad: Number(n.con_dificultad ?? 0),
        total: Number(n.total ?? 0),
        porcentaje: Number(n.porcentaje ?? 0),
      })),
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

 
// ====== WEB: Cards de estudiantes activos por área (en vivo)
public async webAreasActivos({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const q = request.qs() as any
  const ventanaMin = q.ventana_min ? Number(q.ventana_min) : 10

  // usa el método EN VIVO
  const data = await (seguimientoService as any).areasActivosEnVivo(
    Number(auth.id_institucion),
    ventanaMin
  )
  return response.ok(data) // { islas: [{ area, activos }] }
}


// ====== WEB: Serie Progreso por Área (últimos N meses)
public async webSerieProgresoPorArea({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const meses = Number((request.qs() as any).meses ?? 6)
  const data = await (seguimientoService as any).seriesProgresoPorArea(Number(auth.id_institucion), meses)
  return response.ok(data) // { series: [{ mes: 'YYYY-MM', area: 'Matematicas'|..., promedio: number }] }
}

// ====== WEB: Rendimiento por Área (mes actual)
public async webRendimientoPorArea({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const data = await (seguimientoService as any).rendimientoPorArea(Number(auth.id_institucion))
  return response.ok(data) // { items: [{ area: 'Matematicas'|..., promedio: number }] }
}

// ====== NOTIFICACIONES EN TIEMPO REAL (SSE - Server-Sent Events)
public async notificacionesStream({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const id_institucion = Number(auth.id_institucion)
  
  console.log(`[SSE] Admin conectado - Institución ${id_institucion}`)
  
  // Configurar headers para SSE
  response.response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Para nginx
    'Access-Control-Allow-Origin': '*', // Ajustar según tu CORS
    'Access-Control-Allow-Credentials': 'true'
  })
  
  // Enviar mensaje inicial de conexión exitosa
  response.response.write(`data: ${JSON.stringify({ 
    tipo: 'conexion', 
    mensaje: 'Conectado a notificaciones en tiempo real',
    timestamp: new Date().toISOString()
  })}\n\n`)
  
  // Suscribirse a Redis Pub/Sub
  const { subscribeNotificaciones } = await import('../services/redis_service.js')
  const subscriber = subscribeNotificaciones(id_institucion, (notificacion) => {
    try {
      // Enviar notificación al cliente vía SSE
      response.response.write(`data: ${JSON.stringify(notificacion)}\n\n`)
      console.log(`[SSE] Notificación enviada a admin de institución ${id_institucion}:`, notificacion.tipo)
    } catch (error) {
      console.error('[SSE] Error enviando notificación:', error)
    }
  })
  
  // Heartbeat cada 30 segundos para mantener la conexión viva
  const heartbeatInterval = setInterval(() => {
    try {
      response.response.write(`: heartbeat ${new Date().toISOString()}\n\n`)
    } catch (error) {
      console.error('[SSE] Error en heartbeat:', error)
      clearInterval(heartbeatInterval)
    }
  }, 30000)
  
  // Cleanup cuando el cliente cierra la conexión
  request.request.on('close', () => {
    console.log(`[SSE] Admin desconectado - Institución ${id_institucion}`)
    clearInterval(heartbeatInterval)
    
    if (subscriber) {
      subscriber.unsubscribe()
      subscriber.quit()
    }
  })
  
  request.request.on('error', (error) => {
    console.error('[SSE] Error en conexión:', error)
    clearInterval(heartbeatInterval)
    
    if (subscriber) {
      subscriber.unsubscribe()
      subscriber.quit()
    }
  })
}

}

export default AdminController
