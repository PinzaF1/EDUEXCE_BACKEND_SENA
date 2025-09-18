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
    // 1) Parseo / validación básica
    let respuestas: any[] = []
    if (typeof respuestasIn === 'string') {
      try { respuestas = JSON.parse(respuestasIn) } 
      catch { throw new Error('El campo "respuestas" debe ser un JSON válido') }
    } else if (Array.isArray(respuestasIn)) {
      respuestas = respuestasIn
    } else {
      throw new Error('El campo "respuestas" es requerido')
    }
    if (!respuestas.length) throw new Error('Respuestas vacías')

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

    // 2) Totales
    const tot = limpias.reduce(
      (a, r) => ({ ec: a.ec + r.valor_ec, or: a.or + r.valor_or, ca: a.ca + r.valor_ca, ea: a.ea + r.valor_ea }),
      { ec: 0, or: 0, ca: 0, ea: 0 }
    )

    // 3) Determinar estilo (top2)
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

    const estiloRow = await EstilosAprendizaje.findBy('estilo', nombreEstilo)
    if (!estiloRow) throw new Error('Catálogo de estilos no inicializado')

    // 4) Intento principal: guardar con nombres LARGOS (los que tiene tu modelo)
    const where = { id_usuario }
    const basePayload = {
      id_usuario,
      id_estilos_aprendizajes: estiloRow.id_estilos_aprendizajes,
      fecha_presentacion: DateTime.now(),
      respuestas_json: JSON.stringify(limpias),
    }

    const payloadLargo = {
      ...basePayload,
      total_experiencia_concreta: tot.ec,
      total_observacion_reflexiva: tot.or,
      total_conceptualizacion_abstracta: tot.ca,
      total_experimentacion_activa: tot.ea,
    }

    try {
      await KolbResultado.updateOrCreate(where, payloadLargo as any)
    } catch (e: any) {
      // Si tu tabla en realidad NO tiene esas columnas (usa total_ec/total_or/total_ca/total_ea),
      // PG lanza 42703. En ese caso, guardamos SIN esos campos (quedan dentro del JSON).
      const msg = e?.message || ''
      if (e?.code === '42703' || /column .* does not exist/i.test(msg)) {
        await KolbResultado.updateOrCreate(where, basePayload as any)
      } else {
        throw e
      }
    }

    return { estilo: nombreEstilo, totales: tot }
  }

  async obtenerResultado(id_usuario: number) {
    const row = await KolbResultado
      .query()
      .where('id_usuario', id_usuario)
      .preload('estilo')
      .preload('usuario') // por si quieres mostrar nombre/documento
      .orderBy('fecha_presentacion', 'desc')
      .first()

    if (!row) return null

    // Si existen columnas largas, úsalas. Si no, calcula desde respuestas_json.
    let totales: { ec: number; or: number; ca: number; ea: number } = { ec: 0, or: 0, ca: 0, ea: 0 }

    const tieneLargos =
      (row as any).total_experiencia_concreta != null &&
      (row as any).total_observacion_reflexiva != null &&
      (row as any).total_conceptualizacion_abstracta != null &&
      (row as any).total_experimentacion_activa != null

    if (tieneLargos) {
      totales = {
        ec: Number((row as any).total_experiencia_concreta) || 0,
        or: Number((row as any).total_observacion_reflexiva) || 0,
        ca: Number((row as any).total_conceptualizacion_abstracta) || 0,
        ea: Number((row as any).total_experimentacion_activa) || 0,
      }
    } else {
      // Recalcular desde el JSON
      let arr: any[] = []
      try {
        arr = Array.isArray((row as any).respuestas_json)
          ? (row as any).respuestas_json
          : JSON.parse((row as any).respuestas_json || '[]')
      } catch {
        arr = []
      }
      totales = arr.reduce(
        (a, r) => ({
          ec: a.ec + Number(r?.valor_ec || 0),
          or: a.or + Number(r?.valor_or || 0),
          ca: a.ca + Number(r?.valor_ca || 0),
          ea: a.ea + Number(r?.valor_ea || 0),
        }),
        { ec: 0, or: 0, ca: 0, ea: 0 }
      )
    }

    // Para que tu MovilController siga usando res.alumno y res.totales:
    ;(row as any).alumno = (row as any).usuario
    ;(row as any).totales = totales

    return row
  }
}
