// app/services/kolb_service.ts
import EstilosAprendizaje from '../../app/models/estilos_aprendizaje.js'
import PreguntaEstiloAprendizaje from '../../app/models/pregunta_estilo_aprendizaje.js'
import KolbResultado from '../../app/models/kolb_resultado.js'
import { DateTime } from 'luxon'

/** Nueva forma: 1 valor por ítem */
export type RespuestaKolb = {
  id_item?: number  // alias admitido
  id_pregunta?: number // alias admitido (Android)
  valor: number
}

export default class KolbService {
  async obtenerItems() {
    return await PreguntaEstiloAprendizaje
      .query()
      .orderBy('id_pregunta_estilo_aprendizajes', 'asc')
  }

  /** Recibe [{ id_item|id_pregunta, valor:1..4 }] */
  async enviarRespuestas(id_usuario: number, respuestasIn: RespuestaKolb[] | string) {
    // 1) Parseo / validación
    let respuestas: RespuestaKolb[] = []
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
      id_item: Number((r as any).id_item ?? (r as any).id_pregunta ?? (r as any).id),
      valor: Number(r.valor),
    }))

    for (const r of limpias) {
      if (!Number.isFinite(r.id_item) || r.id_item <= 0) {
        throw new Error('id_item inválido')
      }
      if (!Number.isFinite(r.valor) || r.valor < 1 || r.valor > 4) {
        throw new Error('Cada respuesta debe estar entre 1 y 4')
      }
    }

    // 2) Traer dimensión de cada ítem
    const ids = limpias.map((x) => x.id_item)
    const catalogo = await PreguntaEstiloAprendizaje
      .query()
      .whereIn('id_pregunta_estilo_aprendizajes', ids)
      .select(['id_pregunta_estilo_aprendizajes', 'tipo_pregunta'])

    // mapa id -> EC/OR/CA/EA
    const dimById = new Map<number, 'EC'|'OR'|'CA'|'EA'>()
    for (const row of catalogo) {
      const tipo = String((row as any).tipo_pregunta || '').toUpperCase()
      if (tipo.includes('EXPERIENCIA CONCRETA')) dimById.set(Number((row as any).id_pregunta_estilo_aprendizajes), 'EC')
      else if (tipo.includes('OBSERVACIÓN REFLEXIVA') || tipo.includes('OBSERVACION REFLEXIVA')) dimById.set(Number((row as any).id_pregunta_estilo_aprendizajes), 'OR')
      else if (tipo.includes('CONCEPTUALIZACIÓN ABSTRACTA') || tipo.includes('CONCEPTUALIZACION ABSTRACTA')) dimById.set(Number((row as any).id_pregunta_estilo_aprendizajes), 'CA')
      else if (tipo.includes('EXPERIMENTACIÓN ACTIVA') || tipo.includes('EXPERIMENTACION ACTIVA')) dimById.set(Number((row as any).id_pregunta_estilo_aprendizajes), 'EA')
    }

    // 3) Totales por dimensión
    const tot = { ec: 0, or: 0, ca: 0, ea: 0 }
    for (const r of limpias) {
      const d = dimById.get(r.id_item)
      if (!d) continue
      if (d === 'EC') tot.ec += r.valor
      else if (d === 'OR') tot.or += r.valor
      else if (d === 'CA') tot.ca += r.valor
      else if (d === 'EA') tot.ea += r.valor
    }

    // 4) Estilo por top-2
    const arr = [
      { k: 'EC', v: tot.ec },
      { k: 'OR', v: tot.or },
      { k: 'CA', v: tot.ca },
      { k: 'EA', v: tot.ea },
    ].sort((a, b) => b.v - a.v)
    const top2 = [arr[0].k, arr[1].k].sort().join('+')

    let nombreEstilo: 'ACOMODADOR' | 'ASIMILADOR' | 'CONVERGENTE' | 'DIVERGENTE'
    if (top2 === 'CA+EA') nombreEstilo = 'CONVERGENTE'
    else if (top2 === 'CA+OR') nombreEstilo = 'ASIMILADOR'
    else if (top2 === 'EC+EA') nombreEstilo = 'ACOMODADOR'
    else nombreEstilo = 'DIVERGENTE'

    const estiloRow = await EstilosAprendizaje.findBy('estilo', nombreEstilo)
    if (!estiloRow) throw new Error('Catálogo de estilos no inicializado')

    // 5) Guardar (con columnas largas si existen; de lo contrario, solo JSON)
    const where = { id_usuario }
    const basePayload = {
      id_usuario,
      id_estilos_aprendizajes: (estiloRow as any).id_estilos_aprendizajes,
      fecha_presentacion: DateTime.now(),
      respuestas_json: JSON.stringify(limpias), // ahora JSON simple {id_item, valor}
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
      .preload('usuario')
      .orderBy('fecha_presentacion', 'desc')
      .first()

    if (!row) return null

    // 1º intentar columnas largas
    let totales = {
      ec: Number((row as any).total_experiencia_concreta) || 0,
      or: Number((row as any).total_observacion_reflexiva) || 0,
      ca: Number((row as any).total_conceptualizacion_abstracta) || 0,
      ea: Number((row as any).total_experimentacion_activa) || 0,
    }

    // si no están, reconstruir desde JSON {id_item, valor}
    if (!(totales.ec + totales.or + totales.ca + totales.ea)) {
      let arr: Array<{ id_item: number; valor: number }> = []
      try {
        const raw = (row as any).respuestas_json
        arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
      } catch {}
      const ids = arr.map((x) => x.id_item)
      if (ids.length) {
        const cat = await PreguntaEstiloAprendizaje
          .query()
          .whereIn('id_pregunta_estilo_aprendizajes', ids)
          .select(['id_pregunta_estilo_aprendizajes', 'tipo_pregunta'])

        const dim = new Map<number, 'EC'|'OR'|'CA'|'EA'>()
        for (const c of cat) {
          const t = String((c as any).tipo_pregunta || '').toUpperCase()
          if (t.includes('EXPERIENCIA CONCRETA')) dim.set(Number((c as any).id_pregunta_estilo_aprendizajes), 'EC')
          else if (t.includes('OBSERVACIÓN REFLEXIVA') || t.includes('OBSERVACION REFLEXIVA')) dim.set(Number((c as any).id_pregunta_estilo_aprendizajes), 'OR')
          else if (t.includes('CONCEPTUALIZACIÓN ABSTRACTA') || t.includes('CONCEPTUALIZACION ABSTRACTA')) dim.set(Number((c as any).id_pregunta_estilo_aprendizajes), 'CA')
          else if (t.includes('EXPERIMENTACIÓN ACTIVA') || t.includes('EXPERIMENTACION ACTIVA')) dim.set(Number((c as any).id_pregunta_estilo_aprendizajes), 'EA')
        }

        const t = { ec: 0, or: 0, ca: 0, ea: 0 }
        for (const r of arr) {
          const d = dim.get(r.id_item)
          if (!d) continue
          if (d === 'EC') t.ec += Number(r.valor)
          else if (d === 'OR') t.or += Number(r.valor)
          else if (d === 'CA') t.ca += Number(r.valor)
          else if (d === 'EA') t.ea += Number(r.valor)
        }
        totales = t
      }
    }

    ;(row as any).alumno = (row as any).usuario
    ;(row as any).totales = totales
    return row
  }
}
