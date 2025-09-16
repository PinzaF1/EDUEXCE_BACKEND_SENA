import EstilosAprendizaje from '../../app/models/estilos_aprendizaje.js'
import PreguntaEstiloAprendizaje from '../../app/models/pregunta_estilo_aprendizaje.js'
import KolbResultado from '../../app/models/kolb_resultado.js'
import { DateTime } from 'luxon'

export type RespuestaKolb = {
  id_item: number
  valor_ec: number
  valor_or: number
  valor_ca: number
  valor_ea: number
}

export default class KolbService {
  async obtenerItems() {
    return await PreguntaEstiloAprendizaje
      .query()
      .orderBy('id_pregunta_estilo_aprendizajes', 'asc')
  }

  async enviarRespuestas(id_usuario: number, respuestasIn: RespuestaKolb[] | string) {
    // 1) Parsear/normalizar el body
    let respuestas: any[] = []
    if (typeof respuestasIn === 'string') {
      try {
        respuestas = JSON.parse(respuestasIn)
      } catch {
        throw new Error('El campo "respuestas" debe ser un JSON válido')
      }
    } else if (Array.isArray(respuestasIn)) {
      respuestas = respuestasIn
    } else {
      throw new Error('El campo "respuestas" es requerido')
    }
    if (!respuestas.length) throw new Error('Respuestas vacías')

    // 2) Normalizar/castear números y validar Kolb (1..4 sin repetir por ítem)
    const limpias = respuestas.map((r) => ({
      id_item: Number(r.id_item),
      valor_ec: Number(r.valor_ec),
      valor_or: Number(r.valor_or),
      valor_ca: Number(r.valor_ca),
      valor_ea: Number(r.valor_ea),
    }))

    for (const r of limpias) {
      if (!r.id_item || [r.valor_ec, r.valor_or, r.valor_ca, r.valor_ea].some((v) => !Number.isFinite(v))) {
        throw new Error('Valores inválidos en alguna respuesta')
      }
      const s = new Set([r.valor_ec, r.valor_or, r.valor_ca, r.valor_ea])
      if (s.size !== 4 || [...s].some((v) => v < 1 || v > 4)) {
        throw new Error('Cada ítem debe usar 1,2,3 y 4 sin repetir')
      }
    }

    // 3) Totales por dimensión
    const tot = limpias.reduce(
      (a, r) => ({
        ec: a.ec + r.valor_ec,
        or: a.or + r.valor_or,
        ca: a.ca + r.valor_ca,
        ea: a.ea + r.valor_ea,
      }),
      { ec: 0, or: 0, ca: 0, ea: 0 }
    )

    // 4) Determinar estilo (top 2)
    const arr = [
      { k: 'EC', v: tot.ec },
      { k: 'OR', v: tot.or },
      { k: 'CA', v: tot.ca },
      { k: 'EA', v: tot.ea },
    ].sort((x, y) => y.v - x.v)
    const top2 = [arr[0].k, arr[1].k].sort().join('+')

    let nombreEstilo: 'ACOMODADOR' | 'ASIMILADOR' | 'CONVERGENTE' | 'DIVERGENTE'
    if (top2 === 'CA+EA') nombreEstilo = 'CONVERGENTE'
    else if (top2 === 'CA+OR') nombreEstilo = 'ASIMILADOR'
    else if (top2 === 'EC+EA') nombreEstilo = 'ACOMODADOR'
    else nombreEstilo = 'DIVERGENTE'

    // 5) Buscar definición en catálogo (tabla estilos_aprendizajes sembrada)
    const estiloRow = await EstilosAprendizaje.findBy('estilo', nombreEstilo)
    if (!estiloRow) {
      throw new Error('Catálogo de estilos no inicializado (falta seed de estilos_aprendizajes)')
    }

    // 6) Guardar resultado (usa Luxon + JSON.stringify para jsonb)
    await KolbResultado.updateOrCreate(
      { id_usuario },
      {
        id_usuario,
        id_estilos_aprendizajes: estiloRow.id_estilos_aprendizajes,
        fecha_presentacion: DateTime.now(),
        total_experiencia_concreta: tot.ec,
        total_observacion_reflexiva: tot.or,
        total_conceptualizacion_abstracta: tot.ca,
        total_experimentacion_activa: tot.ea,

        respuestas_json: JSON.stringify(limpias), // <- asegura JSON válido
      }
    )

    return { estilo: nombreEstilo, totales: tot }
  }

  async obtenerResultado(id_usuario: number) {
    // Devuelve el último resultado + datos del estilo
    const res = await KolbResultado
      .query()
      .where('id_usuario', id_usuario)
      .preload('estilo') // si definiste relación belongsTo en el modelo
      .orderBy('fecha_presentacion', 'desc')
      .first()

    return res
  }
}
