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
  public async perfilEstudiante({ request, response }: HttpContext) {
    const authHeader = request.header('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const data = await estudiantesService.perfilDesdeToken(token)
    if ((data as any).error) return response.unauthorized(data)
    return response.ok(data)
  }

 public async actualizarPerfilContacto({ request, response }: HttpContext) {
  try {
    const auth = (request as any).authUsuario
    //  incluir foto_url
    const { correo, telefono, direccion, foto_url } = request.only(['correo', 'telefono', 'direccion', 'foto_url'])
    const data = await estudiantesService.actualizarContacto(Number(auth.id_usuario), {
      correo,
      telefono,
      direccion,
      //  pasarla al service
      foto_url,
    })
    return response.ok(data)
  } catch (e: any) {
    return response.badRequest({ error: e?.message || 'No se pudo actualizar' })
  }
}


  /* TEST DE KOLB */

      public async kolbItems({ response }: HttpContext) {
      const data = await kolbService.obtenerItems()
      return response.ok(data)
    }

    public async kolbGuardar({ request, response }: HttpContext) {
      const auth = (request as any).authUsuario
      const { respuestas } = request.only(['respuestas']) as any
      const safe = Array.isArray(respuestas) ? respuestas : []
      const data = await kolbService.enviarRespuestas(Number(auth.id_usuario), safe)
      return response.ok(data) // ahora incluye ac_ce y ae_ro en totales
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

  public async crearParada({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const p = request.only(['area', 'subtema', 'nivel_orden', 'intento_actual']) as any

  const areaIn = String(p.area ?? '').trim()
  const subtema = String(p.subtema ?? '').trim()
  if (!areaIn || !subtema) {
    return response.badRequest({ error: 'Los campos "area" y "subtema" son obligatorios' })
  }

  const areaCanon = (() => {
    const t = areaIn.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    if (t.startsWith('mate')) return 'Matematicas'
    if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje'
    if (t.startsWith('cien')) return 'Ciencias'
    if (t.startsWith('soci')) return 'sociales'
    if (t.startsWith('ing'))  return 'Ingles'
    return 'Sociales'
  })() as 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'sociales' | 'Ingles'

  const normEstilo = (s: any):
    'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador' | null => {
    const v = String(s || '').trim().toLowerCase()
    if (!v) return null
    if (v.startsWith('diver')) return 'Divergente'
    if (v.startsWith('asim')) return 'Asimilador'
    if (v.startsWith('conv')) return 'Convergente'
    if (v.startsWith('acom')) return 'Acomodador'
    return null
  }

  let estiloKolbName =
    normEstilo(
      (auth as any)?.estilo_kolb ??
      (auth as any)?.estiloKolb ??
      (auth as any)?.kolb ??
      (auth as any)?.estilo ??
      (auth as any)?.perfil?.estilo_kolb
    )

  if (!estiloKolbName) {
    try {
      const r = await kolbService.obtenerResultado(Number(auth.id_usuario))
      estiloKolbName =
        normEstilo((r as any)?.estilo) ||
        normEstilo((r as any)?.totales?.estiloCalculado) ||
        null
    } catch {}
  }

  if (!estiloKolbName) {
    estiloKolbName = normEstilo((request.input('estilo_kolb') || request.input('estiloKolb')))
  }

  const data = await sesionesService.crearParada({
    id_usuario: Number(auth.id_usuario),
    area: areaCanon,
    subtema,
    nivel_orden: Number(p.nivel_orden ?? 1),
    usa_estilo_kolb: true,
    estilo_kolb: estiloKolbName || undefined,
    intento_actual: Number(p.intento_actual ?? 1),
  } as any)

  const ses = data.sesion as any
  const preguntas = Array.isArray(data.preguntas) ? data.preguntas : []

  const preguntasOut = preguntas.map((q: any) => ({
    id_pregunta: q.id_pregunta,
    area: q.area,
    subtema,
    enunciado: q.enunciado ?? q.pregunta,
    opciones: q.opciones,
  }))

  return response.created({
    sesion: {
      idSesion: String(ses.id_sesion),
      idUsuario: String(ses.id_usuario),
      tipo: 'practica',
      area: areaCanon.toLowerCase(),
      subtema,
      nivelOrden: Number(p.nivel_orden ?? 1),
      modo: 'estandar',
      estiloKolb: estiloKolbName ?? null,
      inicioAt: ses.inicio_at,
      totalPreguntas: preguntasOut.length,
      preguntasPorSubtema: preguntasOut,
    }
  })
}

  /* ========= CONTROLLER: cerrarSesion ========= */
public async cerrarSesion({ request, response }: HttpContext) {
  try {
    const body = request.only(['id_sesion', 'respuestas']) as any
    const id_sesion = Number(body.id_sesion)
    if (!id_sesion) return response.badRequest({ error: 'id_sesion es obligatorio' })

    const inResps = Array.isArray(body.respuestas) ? body.respuestas : []
    const respuestas = inResps.map((r: any) => {
      const opcion = String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '')
        .trim()
        .toUpperCase()

      return {
        orden: r.orden != null ? Number(r.orden) : null,
        id_pregunta:
          r.id_pregunta != null
            ? Number(r.id_pregunta)
            : (Number(r.idPregunta ?? r.id ?? NaN) || null),
        opcion,
        tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
      }
    })

    const data = await sesionesService.cerrarSesion({ id_sesion, respuestas } as any)
    return response.ok(data)
  } catch (e: any) {
    return response.badRequest({ error: e?.message || 'No se pudo cerrar la sesión' })
  }
}


public async detalleSesion({ request, response }: HttpContext) {
  const id_sesion = Number(request.param('id_sesion'))
  if (!id_sesion) return response.badRequest({ error: 'id_sesion es obligatorio' })
  const data = await sesionesService.detalleSesion(id_sesion)
  if (!data) return response.notFound({ error: 'Sesión no encontrada' })
  return response.ok(data)
}



// ============ SIMULACRO POR ÁREA ============ 


public async crearSimulacro({ request, response }: HttpContext) {
  try {
    const auth = (request as any).authUsuario
    const body = request.only(['area']) as any

    const area = String(body.area || '').trim()
    if (!area) {
      return response.badRequest({ error: 'El campo "area" es obligatorio' })
    }

    const data = await sesionesService.crearSimulacroArea({
      id_usuario: Number(auth.id_usuario),
      area: area as any,
    })

    const ses = data.sesion as any
    const preguntas = Array.isArray(data.preguntas) ? data.preguntas : []

    // Payload limpio: sin correctas, createdAt, updatedAt, finAt, etc.
    const payload = {
      sesion: {
        idSesion: String(ses.id_sesion),
        idUsuario: String(ses.id_usuario),
        tipo: 'simulacro',
        area: area.toLowerCase(),
        subtema:"todos los subtemas",
        nivelOrden: 6,             
        modo: 'estandar',
        usaEstiloKolb: false,
        inicioAt: ses.inicio_at,
        totalPreguntas: preguntas.length,
      },
      totalPreguntas: preguntas.length,
      preguntas,
    }

    return response.created(payload)
  } catch (e: any) {
    return response.badRequest({
      error: e?.message || 'No se pudo crear el simulacro',
    })
  }
}


// POST /movil/simulacro/cerrar

public async cerrarSimulacro({ request, response }: HttpContext) {
  try {
    const body = request.only(['id_sesion', 'respuestas']) as any
    const id_sesion = Number(body.id_sesion)
    const inResps = Array.isArray(body.respuestas) ? body.respuestas : []

    if (!id_sesion || !Array.isArray(inResps)) {
      return response.badRequest({ error: 'id_sesion y respuestas son obligatorios' })
    }

    //  NORMALIZACIÓN CORRECTA: acepta {orden,...} o {id_pregunta,...}
    const respuestas = inResps.map((r: any) => {
      if (r?.orden != null) {
        return {
          orden: Number(r.orden),
          opcion: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '').toUpperCase(),
          tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
        }
      }
      // dejamos pasar { id_pregunta, respuesta } para que el Service resuelva el orden
      return {
        id_pregunta: Number(r.id_pregunta ?? r.id ?? r.idPregunta ?? NaN),
        respuesta: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '').toUpperCase(),
        tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
      }
    })

    const data = await sesionesService.cerrarSesionSimulacro({
      id_sesion,
      respuestas,
    } as any)

    return response.ok(data)
  } catch (e: any) {
    return response.badRequest({
      error: e?.message || 'No se pudo cerrar el simulacro',
    })
  }
}



 // ======== CONTROLLER (métodos Isla del Conocimiento) ========

 public async islaSimulacroIniciar({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const { modalidad } = (request.only(['modalidad']) as any) || {}
  const modIn = String(modalidad ?? '').trim().toLowerCase()
  const mod: 'facil' | 'dificil' = modIn === 'dificil' ? 'dificil' : 'facil'

  const data = await (sesionesService as any).crearSimulacroMixto({
    id_usuario: Number(auth.id_usuario),
    modalidad: mod,
  })

  const ses = data.sesion as any
  const preguntas = Array.isArray(data.preguntas) ? data.preguntas : []
  const nivelOrden = mod === 'dificil' ? 8 : 7

  return response.created({
    sesion: {
      idSesion: String(ses.id_sesion),
      idUsuario: String(ses.id_usuario),
      tipo: 'simulacro_mixto',
      area: 'Todas las areas',
      subtema: 'Todos los subtemas',
      nivelOrden,
      modo: 'estandar',
      usaEstiloKolb: false,
      inicioAt: ses.inicio_at,
      totalPreguntas: preguntas.length,
    },
    totalPreguntas: preguntas.length,
    preguntas,
  })
}

public async islaSimulacroCerrar({ request, response }: HttpContext) {
  const body = request.only(['id_sesion', 'respuestas']) as any
  const id_sesion = Number(body.id_sesion)
  const inResps = Array.isArray(body.respuestas) ? body.respuestas : []
  if (!id_sesion || !Array.isArray(inResps)) {
    return response.badRequest({ error: 'id_sesion y respuestas son obligatorios' })
  }

  const respuestas = inResps.map((r: any) => {
  if (r?.orden != null) {
    return {
      orden: Number(r.orden),
      opcion: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '')
        .toUpperCase(),
      tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
    }
  }
  // Acepta también { id_pregunta, respuesta }
  return {
    id_pregunta: Number(r.id_pregunta ?? r.id ?? r.idPregunta ?? NaN),
    respuesta: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '')
      .toUpperCase(),
    tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
  }
})
  const data = await (sesionesService as any).cerrarSimulacroMixto({ id_sesion, respuestas })
  return response.ok(data)
}

public async islaSimulacroResumen({ request, response }: HttpContext) {
  const raw = request.param('id_sesion')
  const id_sesion = Number.parseInt(String(raw), 10)

  if (!Number.isFinite(id_sesion) || id_sesion <= 0) {
    return response.badRequest({ error: 'id_sesion es obligatorio y debe ser numérico' })
  }

  // Reutilizamos el detalle que ya arma header/resumen/análisis
  const data = await sesionesService.detalleSesion(id_sesion)
  if (!data) return response.notFound({ error: 'Simulacro no encontrado' })
  return response.ok(data)
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
  const raw = request.param('id_sesion')
  const id_sesion = Number.parseInt(String(raw), 10)

  if (!Number.isFinite(id_sesion) || id_sesion <= 0) {
    return response.badRequest({ error: 'id_sesion es obligatorio y debe ser numérico' })
  }

  const data = await progresoService.historialDetalle(auth.id_usuario, id_sesion)
  if (!data) return response.notFound({ error: 'Intento no encontrado' })
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

   

/*  RETOS 1 VS 1 */

public async listarOponentes({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario
  const q = String(request.input('q') || '').trim()

  const data = await retosService.listarOponentes({
    id_institucion: Number(auth.id_institucion),
    solicitante_id: Number(auth.id_usuario),
    q,
  })
  return response.ok(data)
}


public async crearReto({ request, response }: HttpContext) {
  try {
    const auth = (request as any).authUsuario
    const { area, oponente_id, cantidad } = request.only(['area', 'oponente_id', 'cantidad']) as any
    if (!area)        return response.badRequest({ message: 'El campo "area" es obligatorio.' })
    if (!oponente_id) return response.badRequest({ message: 'El campo "oponente_id" es obligatorio.' })

    const data = await retosService.crearReto({
      id_institucion: Number(auth.id_institucion),
      creado_por: Number(auth.id_usuario),
      cantidad: Number(cantidad ?? 25),
      area: String(area),
      oponente_id: Number(oponente_id),
    })
    return response.created(data)
  } catch (err: any) {
    return response.internalServerError({ message: err?.message || 'Error al crear el reto' })
  }
}


// ====== Controller: aceptar reto ======
public async aceptarReto({ request, response }: HttpContext) {
  try {
    const auth = (request as any).authUsuario
    const idReto = Number(request.param('id_reto'))
    if (!Number.isFinite(idReto)) {
      return response.badRequest({ message: 'id_reto inválido' })
    }

    const data = await retosService.aceptarReto(idReto, Number(auth.id_usuario))
    return response.ok(data) // incluye preguntas y sesiones
  } catch (err: any) {
    return response.internalServerError({ message: err?.message || 'Error al aceptar el reto' })
  }
}


/** POST /movil/retos/ronda  body: { id_sesion, respuestas[{orden,opcion,tiempo_empleado_seg?}] } */

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



/** GET /movil/retos/:id_reto/estado */
public async estadoReto({ request, response }: HttpContext) {
  try {
    const idReto = Number(request.param('id_reto'))
    if (!Number.isFinite(idReto)) return response.badRequest({ message: 'id_reto inválido' })

    const data = await retosService.estadoReto(idReto)
    return response.ok(data)
  } catch (err: any) {
    return response.internalServerError({ message: err?.message || 'Error al consultar el estado del reto' })
  }
}

/** GET /movil/retos?tipo=recibidos|enviados|todos&estado=pendiente|en_curso|finalizado&q= */
public async listarRetos({ request, response }: HttpContext) {
  try {
    const auth = (request as any).authUsuario
    const tipo   = (request.input('tipo') || 'todos') as any
    const estado = request.input('estado') as any // opcional
    const q      = request.input('q') || ''

    const data = await retosService.listarRetos({
      id_institucion: Number(auth.id_institucion),
      user_id: Number(auth.id_usuario),
      tipo,
      estado,
      q,
    })

    return response.ok(data)
  } catch (err: any) {
    return response.internalServerError({ message: err?.message || 'Error al listar retos' })
  }
}

/** GET /movil/retos/:id_reto/arranque */
public async arranqueReto({ request, response }: HttpContext) {
  try {
    const auth = (request as any).authUsuario
    const idReto = Number(request.param('id_reto'))
    if (!Number.isFinite(idReto)) {
      return response.badRequest({ message: 'id_reto inválido' })
    }

    const data = await retosService.arranqueReto(idReto, Number(auth.id_usuario))
    return response.ok(data)
  } catch (err: any) {
    // Si el service valida pertenencia y lanza error, devolvemos 403 legible
    if (typeof err?.message === 'string' && /No perteneces a este reto/.test(err.message)) {
      return response.forbidden({ message: err.message })
    }
    return response.internalServerError({ message: err?.message || 'Error al iniciar el reto' })
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

 // PUT /movil/mi-perfil/:id  -> estudiante: SOLO correo, direccion, telefono (+ foto_url)
public async editarMiPerfilContacto({ request, response }: HttpContext) {
  try {
    const id = Number(request.param('id'))
    
    const cambios = request.only(['correo', 'direccion', 'telefono', 'foto_url']) as any
    const auth = (request as any).authUsuario

    const data = await estudiantesService.editarComoEstudiante(id, cambios, {
      id_usuario: Number(auth?.id_usuario),
    })

    return response.ok(data)
  } catch (e: any) {
    return response.badRequest({ error: e?.message || 'No se pudo actualizar' })
  }
}


   public async cambiarPasswordEstudiante({ request, response }: HttpContext) {
  const auth = (request as any).authUsuario;
  const { actual, nueva } = request.body() as any;

  
  if (!actual || !nueva) {
    return response.badRequest({ error: 'Los campos "actual" y "nueva" son obligatorios' });
  }

  try {
    console.log(' Usuario autenticado:', auth?.id_usuario);

  
    const ok = await estudiantesService.cambiarPasswordEstudiante(
      Number(auth.id_usuario),
      String(actual),
      String(nueva)
    );

  
    return ok
      ? response.ok({ ok: true })
      : response.badRequest({ error: 'Contraseña actual incorrecta' });
  } catch (e: any) {
    console.error(' Error al cambiar contraseña:', e?.message);
    return response.badRequest({ error: e?.message || 'No se pudo cambiar la contraseña' });
  }
}

}


export default MovilController
