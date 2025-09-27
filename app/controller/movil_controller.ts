// app/controllers/movil_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import KolbService from '../services/kolb_service.js'
import SesionesService from '../services/sesiones_service.js'
import ProgresoService from '../services/progreso_service.js'
import RankingService from '../services/ranking_service.js'
import LogrosService from '../services/logros_service.js'
import RetosService from '../services/retos_service.js'
import EstudiantesService from '../services/estudiantes_service.js'

const estudiantesService = new EstudiantesService()
const kolbService = new KolbService()
const sesionesService = new SesionesService()
const progresoService = new ProgresoService()
const rankingService = new RankingService()
const logrosService = new LogrosService()
const retosService = new RetosService()

class MovilController {
  // ================= PERFIL =================
  async perfilEstudiante({ request, response }: HttpContext) {
    const authHeader = request.header('Authorization')
    if (!authHeader) return response.unauthorized({ error: 'Token obligatorio' })
    const token = authHeader.replace('Bearer ', '').trim()
    const resultado = await estudiantesService.perfilEstudiante(token)
    return response.ok(resultado)
  }

  // ================= KOLB =================
  public async kolbItems({ response }: HttpContext) {
    const data = await kolbService.obtenerItems()
    return response.ok(data)
  }

  public async kolbGuardar({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { respuestas } = request.only(['respuestas']) as any
    const data = await kolbService.enviarRespuestas(auth.id_usuario, respuestas || [])
    return response.ok(data)
  }

  public async kolbResultado({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const res = await kolbService.obtenerResultado(auth.id_usuario)
    if (!res) return response.notFound({ error: 'Sin resultado de Kolb' })
    return response.ok({
      estudiante: `${res.alumno?.nombre ?? ''} ${res.alumno?.apellido ?? ''}`.trim(),
      documento: res.alumno?.numero_documento ?? null,
      fecha: res.fecha_presentacion,
      estilo: res.estilo,
      totales: res.totales,
    })
  }

  // ============ PARADAS / PRÁCTICAS ============
  public async crearParada({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const p = request.only(['area', 'subtema', 'nivel_orden', 'usa_estilo_kolb', 'intento_actual']) as any

    const area = String(p.area ?? '').trim()
    const subtema = String(p.subtema ?? '').trim()
    if (!area || !subtema) {
      return response.badRequest({ error: 'Los campos "area" y "subtema" son obligatorios' })
    }

    const data = await sesionesService.crearParada({
      id_usuario: auth.id_usuario,
      area,
      subtema,
      nivel_orden: Number(p.nivel_orden || 1),
      usa_estilo_kolb: !!p.usa_estilo_kolb,
      intento_actual: Number(p.intento_actual || 1),
    } as any)

    return response.created(data)
  }

  public async cerrarSesion({ request, response }: HttpContext) {
    // Acepta ambos formatos:
    // - [{ orden, opcion, tiempo_empleado_seg? }]
    // - [{ id_pregunta, respuesta?|seleccion?, tiempo_empleado_seg? }]
    const body = request.only(['id_sesion', 'respuestas']) as any
    const id_sesion = Number(body.id_sesion)
    const respuestas = Array.isArray(body.respuestas) ? body.respuestas : []

    const data = await sesionesService.cerrarSesion({
      id_sesion,
      respuestas,
    } as any)

    // data incluye: correctas, puntaje, puntajes_por_area, puntaje_general y detalle con explicación
    return response.ok(data)
  }

  // ============ SIMULACRO POR ÁREA ============
  public async crearSimulacro({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const body = request.only(['area', 'subtemas']) as any

      const area = String(body.area || '').trim()
      const subtemas = Array.isArray(body.subtemas) ? body.subtemas : []

      if (!area || subtemas.length === 0) {
        return response.badRequest({
          error: 'Los campos "area" y "subtemas" son obligatorios',
        })
      }

      const data = await sesionesService.crearSimulacroArea({
        id_usuario: Number(auth.id_usuario),
        area: area as any,
        subtemas: subtemas.map((s: any) => String(s).trim()),
      })

      return response.created(data)
    } catch (e: any) {
      return response.badRequest({
        error: e?.message || 'No se pudo crear el simulacro',
      })
    }
  }

  // PROGRESO
public async progresoResumen({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const data = await progresoService.resumenGeneral(auth.id_usuario)
  return response.ok(data)
}

public async progresoPorMaterias({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const data = await progresoService.porMaterias(auth.id_usuario)
  return response.ok(data)
}

public async progresoHistorial({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const { materia, page, limit, desde, hasta } = request.qs() as any
  const data = await progresoService.historial(auth.id_usuario, {
    materia, page: Number(page ?? 1), limit: Number(limit ?? 20), desde, hasta
  })
  return response.ok(data)
}

public async progresoHistorialDetalle({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const id_sesion = Number(request.param('id_sesion'))
  const data = await progresoService.historialDetalle(auth.id_usuario, id_sesion)
  if (!data) return response.notFound({ error: 'Simulacro no encontrado' })
  return response.ok(data)
}


  // ============ RANKING / LOGROS ============
  public async ranking({ response }: HttpContext) {
    const data = await (rankingService as any).top5()
    return response.ok(data)
  }

  public async misLogros({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (logrosService as any).misLogros(auth.id_usuario)
    return response.ok(data)
  }

  // ============ RETOS ============
  public async crearReto({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const datos = request.all() as any
    const data = await (retosService as any).crearReto(auth.id_usuario, datos)
    return response.created(data)
  }

  public async aceptarReto({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const idReto = Number(request.param('id_reto'))
    const data = await (retosService as any).aceptarReto(auth.id_usuario, idReto)
    return response.ok(data)
  }

  public async responderRonda({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const datos = request.all() as any
    const data = await (retosService as any).responderRonda(auth.id_usuario, datos)
    return response.ok(data)
  }

  public async estadoReto({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const idReto = Number(request.param('id_reto'))
    const data = await (retosService as any).estadoReto(auth.id_usuario, idReto)
    return response.ok(data)
  }

  // ============ QUIZ INICIAL (DIAGNÓSTICO) ============
  public async quizInicialIniciar({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (sesionesService as any).crearQuizInicial({
      id_usuario: auth.id_usuario,
      id_institucion: auth.id_institucion ?? null,
    })
    return response.created(data)
  }

  public async quizInicialCerrar({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { id_sesion, respuestas } = request.only(['id_sesion', 'respuestas']) as any

    const data = await (sesionesService as any).cerrarQuizInicial({
      id_sesion: Number(id_sesion),
      respuestas: Array.isArray(respuestas) ? respuestas : [],
    })

    // Devuelve lo que pide: puntajes por área, global y detalle con explicación
    return response.ok({ id_usuario: auth.id_usuario, ...data })
  }
}

export default MovilController
