import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'
import EstilosAprendizaje from '../models/estilos_aprendizaje.js'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'

export default class SesionesService {
  ia = new IaService()

  // Crea una sesión para una "parada" (subtema) de un área, 5 preguntas
  async crearParada(d: {
    id_usuario: number
    area: Area
    subtema: string
    nivel_orden: number         // 1..N dentro del camino del área
    usa_estilo_kolb: boolean
    intento_actual?: number     // 1..3 (si la misma parada)
  }) {
    // excluir preguntas ya hechas en esta parada
    const prev = await Sesion.query()
      .where('id_usuario', d.id_usuario)
      .where('area', d.area).where('subtema', d.subtema)
      .orderBy('inicio_at','desc').first()

    const excludeIds: number[] = []
    if (prev) {
      const detPrev = await SesionDetalle.query().where('id_sesion', prev.id_sesion)
      excludeIds.push(...detPrev.map(x => x.id_pregunta).filter(Boolean) as number[])
    }

    // ¿estilo Kolb?
    let estilo_kolb: any = undefined
    if (d.usa_estilo_kolb) {
      const k = await EstilosAprendizaje.findBy('id_usuario', d.id_usuario)
      estilo_kolb = (k as any)?.estilo
    }

    const preguntas = await this.ia.generarPreguntas({
      area: d.area,
      subtemas: [d.subtema],
      dificultad: 'facil',     // práctica por parada
      estilo_kolb,
      cantidad: 5,
      id_institucion: null,
      excluir_ids: excludeIds, // ← ver ajuste en ia_service más abajo
    } as any)

    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'practica',
      modo: 'estandar',
      area: d.area,
      subtema: d.subtema,
      usa_estilo_kolb: !!d.usa_estilo_kolb,
      nivel_orden: d.nivel_orden,
      intento: d.intento_actual ?? 1,
      inicio_at: new Date() as any,
      total_preguntas: preguntas.length,
      correctas: 0,
    } as any)

    let orden = 1
    for (const p of preguntas) {
      await SesionDetalle.create({
        id_sesion: sesion.id_sesion,
        id_pregunta: p.id_pregunta ?? null,
        orden,
        tiempo_asignado_seg: p.time_limit_seconds ?? null,
      } as any)
      orden++
    }

    return { sesion, preguntas }
  }

  // Registrar respuestas y cerrar la sesión. Retorna si avanza o no.
 // Registrar respuestas y cerrar la sesión. Retorna si avanza o no.
// Registrar respuestas y cerrar la sesión. Retorna si avanza o no.
async cerrarSesion(d: {
  id_sesion: number
  respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }>
}) {
  const ses = await Sesion.findOrFail(d.id_sesion)
  const detalles = await SesionDetalle.query()
    .where('id_sesion', ses.id_sesion)
    .orderBy('orden', 'asc')

  let correctas = 0
  for (const r of d.respuestas) {
    const det = detalles.find((x) => x.orden === r.orden)
    if (!det) continue

    // registrar selección y tiempo empleado
    ;(det as any).respuesta = r.opcion
    ;(det as any).tiempo_empleado_seg = r.tiempo_empleado_seg ?? null

    // *** Control de tiempo (Nivel 2): si excede, es incorrecta ***
    const limite = (det as any).tiempo_asignado_seg
    const excedioTiempo =
      limite != null && (r.tiempo_empleado_seg == null || r.tiempo_empleado_seg > limite)

    let esCorrecta = false
    if (!excedioTiempo) {
      esCorrecta = (det as any).respuesta === (det as any).respuesta_correcta
    }

    if (esCorrecta) correctas++
    ;(det as any).es_correcta = esCorrecta
    await det.save()
  }

  ;(ses as any).correctas = correctas
  ;(ses as any).puntaje_porcentaje = Math.round(
    (correctas * 100) / Math.max(1, (ses as any).total_preguntas || 5)
  )
  ;(ses as any).fin_at = new Date() as any
  await ses.save()

  // Reglas de avance: 4 de 5
  const aprueba = correctas >= 4
  return { aprueba, correctas, puntaje: (ses as any).puntaje_porcentaje }
}



  // Si falla 3 veces la misma parada, bajar un nivel
  async registrarFalloReintento(id_usuario: number, area: Area, subtema: string, nivel_orden: number) {
    const ultimas = await Sesion.query()
      .where('id_usuario', id_usuario).where('area', area).where('subtema', subtema)
      .orderBy('inicio_at','desc').limit(3)

    const perdidas = ultimas.filter(s => ((s as any).correctas ?? 0) < 4)
    if (perdidas.length >= 3) {
      const nuevoNivel = Math.max(1, nivel_orden - 1)
      return { bajar: true, nuevoNivel }
    }
    return { bajar: false, nuevoNivel: nivel_orden }
  }

  // Simulacro por área: 5 preguntas por cada subtema visto anteriormente
  async crearSimulacroArea(d: { id_usuario: number; area: Area; subtemas: string[] }) {
    const totalPreguntas = d.subtemas.length * 5
    const preguntasTodas: any[] = []

    for (const st of d.subtemas) {
      const pack = await this.ia.generarPreguntas({
        area: d.area,
        subtemas: [st],
        dificultad: 'media',
        cantidad: 5,
        id_institucion: null,
      } as any)
      preguntasTodas.push(...pack)
    }

    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'simulacro',
      modo: 'estandar',
      area: d.area,
      usa_estilo_kolb: false,     // simulacro real no tiene estilo
      inicio_at: new Date() as any,
      total_preguntas: totalPreguntas,
      correctas: 0,
    } as any)

    let orden = 1
    for (const p of preguntasTodas) {
      await SesionDetalle.create({
        id_sesion: sesion.id_sesion,
        id_pregunta: p.id_pregunta ?? null,
        orden,
        tiempo_asignado_seg: null,
      } as any)
      orden++
    }
    return { sesion, totalPreguntas }
  }

  // 5 áreas x 5 preguntas = 25 preguntas (resultado global)
async crearQuizInicial(d: { id_usuario: number }) {
  const areas: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

  // Si el estudiante tiene estilo, úsalo para personalizar (opcional)
  const k = await EstilosAprendizaje.findBy('id_usuario', d.id_usuario)
  const estilo_kolb = (k as any)?.estilo ?? undefined

  const sesiones: any[] = []
  for (const area of areas) {
    const preguntas = await this.ia.generarPreguntas({
      area,
      subtemas: [],            // IA decide subtemas del área
      dificultad: 'media',
      estilo_kolb,
      cantidad: 5,
      id_institucion: null,
    } as any)

    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'quiz_inicial',
      modo: 'estandar',
      area,                     // una sesión por área
      inicio_at: new Date() as any,
      total_preguntas: preguntas.length,
      correctas: 0,
    } as any)

    let orden = 1
    for (const p of preguntas) {
      await SesionDetalle.create({
        id_sesion: sesion.id_sesion,
        id_pregunta: p.id_pregunta ?? null,
        orden,
        tiempo_asignado_seg: null, // sin tiempo en quiz inicial
      } as any)
      orden++
    }

    sesiones.push(sesion)
  }

  return { sesiones, totalPreguntas: 25 }
}

}
