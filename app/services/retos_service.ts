import Reto from '../models/reto.js'                 // asumiendo tabla 'retos' con {id_reto, id_institucion, estado, creado_por, ganador_id?}
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'

export default class RetosService {
  ia = new IaService()

  // Crear reto y generar preguntas compartidas
  async crearReto(d: {
    id_institucion: number
    creado_por: number              // id_usuario del que invita
    cantidad: number
    area?: 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
    dificultad?: 'facil'|'media'|'dificil'
  }) {
    const preguntas = await this.ia.generarPreguntas({
      area: d.area || 'Matematicas',
      cantidad: d.cantidad,
      dificultad: d.dificultad || 'media',
      id_institucion: d.id_institucion,
    })

    const reto = await Reto.create({
      id_institucion: d.id_institucion,
      creado_por: d.creado_por,
      estado: 'pendiente',
      preguntas_json: preguntas,   // guarda la lista exacta para ambos
    } as any)

    return reto
  }

  // Aceptar reto: crea sesiones tipo "reto" para ambos con las mismas preguntas
  async aceptarReto(id_reto: number, id_usuario_invitado: number) {
    const reto = await Reto.findOrFail(id_reto)
    const preguntas: any[] = (reto as any).preguntas_json || []
    ;(reto as any).estado = 'activo'
    await reto.save()

    const participantes = [(reto as any).creado_por, id_usuario_invitado]
    const sesiones: Sesion[] = []

    for (const uid of participantes) {
      const sesion = await Sesion.create({
        id_usuario: uid,
        tipo: 'reto',
        modo: 'estandar',
        usa_estilo_kolb: false,
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
        })
        orden++
      }
      sesiones.push(sesion)
    }

    return { reto, sesiones }
  }

  // Finalizar reto: decide ganador por correctas y tiempo total
  async finalizarReto(id_reto: number, id_usuario_a: number, id_usuario_b: number) {
    const reto = await Reto.findOrFail(id_reto)
    const sesA = await Sesion.query().where('tipo','reto').where('id_usuario', id_usuario_a).orderBy('inicio_at','desc').first()
    const sesB = await Sesion.query().where('tipo','reto').where('id_usuario', id_usuario_b).orderBy('inicio_at','desc').first()
    if (!sesA || !sesB) throw new Error('Sesiones de reto no encontradas')

    const detA = await SesionDetalle.query().where('id_sesion', sesA.id_sesion)
    const detB = await SesionDetalle.query().where('id_sesion', sesB.id_sesion)

    const correctasA = detA.filter(d=> d.es_correcta).length
    const correctasB = detB.filter(d=> d.es_correcta).length
    const tiempoA = detA.reduce((a,b)=> a + ((b as any).tiempo_empleado_seg||0), 0)
    const tiempoB = detB.reduce((a,b)=> a + ((b as any).tiempo_empleado_seg||0), 0)

    let ganador: number|null = null
    if (correctasA > correctasB) ganador = id_usuario_a
    else if (correctasB > correctasA) ganador = id_usuario_b
    else ganador = (tiempoA <= tiempoB) ? id_usuario_a : id_usuario_b

    ;(reto as any).estado = 'finalizado'
    ;(reto as any).ganador_id = ganador
    await reto.save()

    return { ganador, correctasA, correctasB, tiempoA, tiempoB }
  }
}
