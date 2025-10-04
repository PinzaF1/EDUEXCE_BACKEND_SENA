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

    try {
      const resultado = await estudiantesService.perfilEstudiante(token)
      return response.ok(resultado)
    } catch (e: any) {
      return response.unauthorized({ error: e?.message || 'Token inválido' })
    }
  }

  // ================= KOLB =================
  public async kolbItems({ response }: HttpContext) {
    const data = await kolbService.obtenerItems()
    return response.ok(data)
  }

  public async kolbGuardar({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { respuestas } = request.only(['respuestas']) as any
    const safe = Array.isArray(respuestas) ? respuestas : []
    const data = await kolbService.enviarRespuestas(Number(auth.id_usuario), safe)
    return response.ok(data)
  }

  public async kolbResultado({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const res = await kolbService.obtenerResultado(Number(auth.id_usuario))
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
      id_usuario: Number(auth.id_usuario),
      area,
      subtema,
      nivel_orden: Number(p.nivel_orden ?? 1),
      usa_estilo_kolb: !!p.usa_estilo_kolb,
      intento_actual: Number(p.intento_actual ?? 1),
    } as any)

    return response.created(data)
  }

  public async cerrarSesion({ request, response }: HttpContext) {
    try {
      // Acepta ambos formatos:
      // - [{ orden, opcion, tiempo_empleado_seg? }]
      // - [{ id_pregunta, respuesta?|seleccion?|opcion?|alternativa?, tiempo_empleado_seg? }]
      const body = request.only(['id_sesion', 'respuestas']) as any
      const id_sesion = Number(body.id_sesion)
      if (!id_sesion) return response.badRequest({ error: 'id_sesion es obligatorio' })

      const inResps = Array.isArray(body.respuestas) ? body.respuestas : []
      // Normalizamos si vienen por id_pregunta: los ordenes deben existir en BD, así que solo
      // enviamos tal cual si ya vienen con {orden, opcion}
      const respuestas = inResps.map((r: any) => {
        // si ya viene con "orden", respetamos
        if (r?.orden != null) {
          return {
            orden: Number(r.orden),
            opcion: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '').toUpperCase(),
            tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
          }
        }
        return r
      })

      const data = await sesionesService.cerrarSesion({
        id_sesion,
        respuestas,
      } as any)

      return response.ok(data)
    } catch (e: any) {
      return response.badRequest({ error: e?.message || 'No se pudo cerrar la sesión' })
    }
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

  // POST /movil/simulacro/cerrar  -> recibe respuestas, califica y cierra
  public async cerrarSimulacro({ request, response }: HttpContext) {
    try {
      const { id_sesion, respuestas } = request.only(['id_sesion', 'respuestas']) as any
      if (!id_sesion || !Array.isArray(respuestas)) {
        return response.badRequest({ error: 'id_sesion y respuestas son obligatorios' })
      }

      const data = await sesionesService.cerrarSesionSimulacro({
        id_sesion: Number(id_sesion),
        respuestas: respuestas.map((r: any) => ({
          orden: Number(r.orden),
          opcion: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '').toUpperCase(),
          tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
        })),
      })

      return response.ok(data)
    } catch (e: any) {
      return response.badRequest({
        error: e?.message || 'No se pudo cerrar el simulacro',
      })
    }
  }

  // ===== Isla del Conocimiento: iniciar simulacro mixto (HU-01/02/03) =====
  public async islaSimulacroIniciar({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { modalidad } = request.only(['modalidad']) as any
    const mod = String(modalidad || 'facil').toLowerCase() === 'dificil' ? 'dificil' : 'facil'

    const data = await (sesionesService as any).crearSimulacroMixto({
      id_usuario: Number(auth.id_usuario),
      modalidad: mod,
    })

    return response.created(data)
  }

  // ===== Isla del Conocimiento: cerrar simulacro (HU-04/05) =====
  public async islaSimulacroCerrar({ request, response }: HttpContext) {
    const body = request.only(['id_sesion', 'respuestas']) as any
    const id_sesion = Number(body.id_sesion)
    const respuestas = Array.isArray(body.respuestas) ? body.respuestas : []

    const data = await (sesionesService as any).cerrarSimulacroMixto({ id_sesion, respuestas })
    return response.ok(data)
  }

  // ===== Isla del Conocimiento: ver resumen/resultado guardado =====
  public async islaSimulacroResumen({ request, response }: HttpContext) {
    const id_sesion = Number(request.param('id_sesion'))
    const data = await (sesionesService as any).resumenResultadoSimulacro(id_sesion)
    if (!data) return response.notFound({ error: 'Simulacro no encontrado' })
    return response.ok(data)
  }

  // ================= PROGRESO =================
  public async progresoGeneral({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario // viene del middleware onlyRol
    const data = await progresoService.general(Number(auth.id_usuario ?? auth.id))
    return response.ok(data)
  }

  // GET mov/progreso/materias
  public async progresoPorMaterias({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await progresoService.porMaterias(Number(auth.id_usuario ?? auth.id))
    return response.ok(data)
  }

  // GET mov/progreso/historial?page=&limit=
  public async progresoHistorial({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const page = Number((request.qs() as any).page ?? 1)
    const limit = Number((request.qs() as any).limit ?? 20)
    const data = await progresoService.historialUsuario(Number(auth.id_usuario ?? auth.id), { page, limit })
    return response.ok(data)
  }

  // GET mov/progreso/historial/:id_sesion  (RESUMEN + datos para cabecera)
  public async progresoHistorialDetalle({ request, response }: HttpContext) {
    const id = Number(request.param('id_sesion'))
    const data = await progresoService.detalleIntento(id)
    if ((data as any).error) return response.notFound(data)
    return response.ok(data)
  }

  // Si quieres habilitar también las pestañas "Preguntas" y "Análisis":
  public async progresoHistorialPreguntas({ request, response }: HttpContext) {
    const id = Number(request.param('id_sesion'))
    const data = await progresoService.preguntasIntento(id)
    return response.ok(data)
  }
  public async progresoHistorialAnalisis({ request, response }: HttpContext) {
    const id = Number(request.param('id_sesion'))
    const data = await progresoService.analisisIntento(id)
    return response.ok(data)
  }

  // ============ RANKING / LOGROS ============ 
  public async ranking({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await rankingService.rankingInstitucion(
      Number(auth.id_institucion),
      Number(auth.id_usuario)
    )
    return response.ok(data)
  }

  /** Compatibilidad con tu endpoint existente (HU-04 si lo llamabas así) */
  public async misLogros({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await logrosService.misLogros(Number(auth.id_usuario))
    return response.ok(data)
  }

  /** HU-03: verificar/otorgar insignia al completar un área */
  public async otorgarInsigniaArea({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { area } = request.only(['area']) as any
    const okAreas = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']
    if (!okAreas.includes(String(area))) {
      return response.badRequest({ error: 'Área inválida' })
    }
    const res = await logrosService.asignarInsigniaAreaSiCorresponde(
      Number(auth.id_usuario),
      String(area) as any
    )
    return response.ok(res)
  }

  /** HU-04: todas mis insignias (obtenidas y pendientes) */
  public async logrosTodos({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await logrosService.listarInsigniasCompletas(Number(auth.id_usuario))
    return response.ok(data)
  }

  // ============ RETOS 1v1 ============ 
  public async crearReto({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const { cantidad, area } = request.only(['cantidad', 'area']) as any
      if (!area) return response.badRequest({ message: 'El campo "area" es obligatorio.' })

      const data = await retosService.crearReto({
        id_institucion: Number(auth.id_institucion),
        creado_por: Number(auth.id_usuario),
        cantidad: Number(cantidad ?? 25),
        area: String(area) as any,
      })
      return response.created(data)
    } catch (err: any) {
      return response.internalServerError({ message: err?.message || 'Error al crear el reto' })
    }
  }

  /** HU-01: Aceptar reto (:id_reto) */
  public async aceptarReto({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const idReto = Number(request.param('id_reto'))
      if (!idReto) return response.badRequest({ message: 'id_reto inválido' })

      const data = await retosService.aceptarReto(idReto, Number(auth.id_usuario))
      return response.ok(data)
    } catch (err: any) {
      return response.internalServerError({ message: err?.message || 'Error al aceptar el reto' })
    }
  }

  /** HU-02: Registrar respuestas cronometradas */
  public async responderRonda({ request, response }: HttpContext) {
    try {
      const { id_sesion, respuestas } = request.only(['id_sesion', 'respuestas']) as any
      if (!id_sesion) return response.badRequest({ message: 'El campo "id_sesion" es obligatorio.' })

      const data = await retosService.responderRonda({
        id_sesion: Number(id_sesion),
        respuestas: Array.isArray(respuestas) ? respuestas : [],
      })
      return response.ok(data)
    } catch (err: any) {
      return response.internalServerError({ message: err?.message || 'Error al registrar la ronda' })
    }
  }

  /** HU-03: Estado del reto + ganador */
  public async estadoReto({ request, response }: HttpContext) {
    try {
      const idReto = Number(request.param('id_reto'))
      if (!idReto) return response.badRequest({ message: 'id_reto inválido' })
      const data = await retosService.estadoReto(idReto)
      return response.ok(data)
    } catch (err: any) {
      return response.internalServerError({ message: err?.message || 'Error al consultar el estado del reto' })
    }
  }

  // ============ QUIZ INICIAL (DIAGNÓSTICO) ============ 
  public async quizInicialIniciar({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (sesionesService as any).crearQuizInicial({
      id_usuario: Number(auth.id_usuario),
      id_institucion: Number(auth.id_institucion) || null,
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
    return response.ok({ id_usuario: Number(auth.id_usuario), ...data })
  }
}

export default MovilController
