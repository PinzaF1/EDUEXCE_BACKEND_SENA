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
  async perfilEstudiante({ request, response }: HttpContext) {
    const authHeader = request.header('Authorization')
    if (!authHeader) return response.unauthorized({ error: 'Token obligatorio' })
    const token = authHeader.replace('Bearer ', '').trim()
    const resultado = await estudiantesService.perfilEstudiante(token)
    return response.ok(resultado)
  }

  // EP-11: Kolb
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
      documento:  res.alumno?.numero_documento ?? null,
      fecha:      res.fecha_presentacion,
      estilo:     res.estilo,
      totales:    res.totales,
    })
  }

  // EP-13/14: Paradas y simulacros
  public async crearParada({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const p = request.only(['area', 'subtema', 'nivel_orden', 'usa_estilo_kolb', 'intento_actual']) as any
    const data = await sesionesService.crearParada({
      id_usuario: auth.id_usuario,
      area: p.area,
      subtema: p.subtema,
      nivel_orden: Number(p.nivel_orden || 1),
      usa_estilo_kolb: !!p.usa_estilo_kolb,
      intento_actual: Number(p.intento_actual || 1), // no se guarda, solo influye si quisieras
    } as any)
    return response.created(data)
  }

  public async cerrarSesion({ request, response }: HttpContext) {
    const body = request.only(['id_sesion', 'respuestas']) as any
    const data = await sesionesService.cerrarSesion(body as any)
    return response.ok(data)
  }

  public async crearSimulacro({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const { area, subtemas } = request.only(['area', 'subtemas']) as any
    const data = await sesionesService.crearSimulacroArea(
      { id_usuario: auth.id_usuario, area, subtemas } as any
    )
    return response.created(data)
  }

  // EP-15: Progreso / historial
  public async progreso({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await progresoService.resumenEstudiante(auth.id_usuario)
    return response.ok(data)
  }

  // EP-16: Ranking / Logros
  public async ranking({ response }: HttpContext) {
    const data = await (rankingService as any).top5()
    return response.ok(data)
  }

  public async misLogros({ request, response }: HttpContext) {
    const auth = (request as any).authUsuario
    const data = await (logrosService as any).misLogros(auth.id_usuario)
    return response.ok(data)
  }

  // EP-17: Retos
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

  // ===== EP-12: Quiz inicial (diagnóstico) =====
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
    return response.ok({ id_usuario: auth.id_usuario, ...data })
  }
}

export default MovilController
