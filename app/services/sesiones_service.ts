// app/services/sesiones_service.ts
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'
import EstilosAprendizaje from '../models/estilos_aprendizaje.js'
import BancoPregunta from '../models/banco_pregunta.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
type RespCierre = { id_pregunta: number; respuesta: string }

export default class SesionesService {
  ia = new IaService()

  /** Forzar tabla calificada sin tocar el archivo del modelo */
  private ensureDetalleTable() {
    const expected = 'public.sesiones_detalles'
    // @ts-ignore
    if ((SesionDetalle as any).table !== expected) {
      // @ts-ignore
      (SesionDetalle as any).table = expected
    }
  }

  // ======== PARADA (con fallback robusto) ========
  async crearParada(d: {
    id_usuario: number
    area: Area
    subtema: string
    nivel_orden: number
    usa_estilo_kolb: boolean
    intento_actual?: number
  }) {
    this.ensureDetalleTable()

    const area = String(d.area ?? '').trim()
    const subtema = String(d.subtema ?? '').trim()
    if (!area || !subtema) throw new Error('area y subtema son obligatorios')

    const prev = await Sesion.query()
      .where('id_usuario', d.id_usuario)
      .where('area', area)
      .where('subtema', subtema)
      .orderBy('inicio_at', 'desc')
      .first()

    const excludeIds: number[] = []
    if (prev) {
      const detPrev = await SesionDetalle.query().where('id_sesion', (prev as any).id_sesion)
      excludeIds.push(...detPrev.map((x) => Number((x as any).id_pregunta)).filter(Boolean))
    }

    let estilo_kolb: any = undefined
    try {
      if (d.usa_estilo_kolb) {
        const k = await EstilosAprendizaje.findBy('id_usuario', d.id_usuario)
        estilo_kolb = (k as any)?.estilo
      }
    } catch {/* ignore */}

    // 1) Intento con IA
    let preguntas: any[] = await this.ia.generarPreguntas({
      area,
      subtemas: [subtema],
      dificultad: 'facil',
      estilo_kolb,
      cantidad: 5,
      id_institucion: null,
      excluir_ids: excludeIds,
    } as any)

    // 2) Fallback al banco — insensible a tildes y mayúsculas; completa hasta 5
    if (!preguntas || preguntas.length === 0) {
      const yaTomadas = new Set<number>(excludeIds)

      const mapBanco = (rows: any[]) =>
        rows.map((b: any) => ({
          id_pregunta: b.id_pregunta,
          area: b.area,
          subtema: b.subtema,
          dificultad: (b as any).dificultad ?? 'facil',
          pregunta: (b as any).pregunta,
          opciones: (b as any).opciones,
          time_limit_seconds: (b as any).tiempo_limite_seg ?? null,
        }))

      let base: any[] = []
      try {
        base = await BancoPregunta.query()
          .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
          .andWhereRaw('unaccent(lower(subtema)) LIKE unaccent(lower(?))', [`%${subtema}%`])
          .if(excludeIds.length > 0, (qb) => qb.whereNotIn('id_pregunta', excludeIds))
          .orderByRaw('random()')
          .limit(5)
      } catch {
        base = await BancoPregunta.query()
          .whereILike('area', `%${area}%`)
          .andWhereILike('subtema', `%${subtema}%`)
          .if(excludeIds.length > 0, (qb) => qb.whereNotIn('id_pregunta', excludeIds))
          .orderByRaw('random()')
          .limit(5)
      }

      const agg: any[] = []
      for (const r of base) {
        const id = Number((r as any).id_pregunta)
        if (!yaTomadas.has(id)) { yaTomadas.add(id); agg.push(r) }
      }

      const need1 = Math.max(0, 5 - agg.length)
      if (need1 > 0) {
        try {
          const extra = await BancoPregunta.query()
            .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
            .if(yaTomadas.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(yaTomadas)))
            .orderByRaw('random()')
            .limit(need1)
          for (const r of extra) {
            const id = Number((r as any).id_pregunta)
            if (!yaTomadas.has(id)) { yaTomadas.add(id); agg.push(r) }
          }
        } catch {
          const extra = await BancoPregunta.query()
            .whereILike('area', `%${area}%`)
            .if(yaTomadas.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(yaTomadas)))
            .orderByRaw('random()')
            .limit(need1)
          for (const r of extra) {
            const id = Number((r as any).id_pregunta)
            if (!yaTomadas.has(id)) { yaTomadas.add(id); agg.push(r) }
          }
        }
      }

      const need2 = Math.max(0, 5 - agg.length)
      if (need2 > 0) {
        try {
          const extra = await BancoPregunta.query()
            .whereRaw('unaccent(lower(subtema)) LIKE unaccent(lower(?))', [`%${subtema}%`])
            .if(yaTomadas.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(yaTomadas)))
            .orderByRaw('random()')
            .limit(need2)
          for (const r of extra) {
            const id = Number((r as any).id_pregunta)
            if (!yaTomadas.has(id)) { yaTomadas.add(id); agg.push(r) }
          }
        } catch {
          const extra = await BancoPregunta.query()
            .whereILike('subtema', `%${subtema}%`)
            .if(yaTomadas.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(yaTomadas)))
            .orderByRaw('random()')
            .limit(need2)
          for (const r of extra) {
            const id = Number((r as any).id_pregunta)
            if (!yaTomadas.has(id)) { yaTomadas.add(id); agg.push(r) }
          }
        }
      }

      preguntas = mapBanco(agg.slice(0, 5))
    }

    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'practica',
      modo: 'estandar',
      area,
      subtema,
      usa_estilo_kolb: !!d.usa_estilo_kolb,
      nivel_orden: d.nivel_orden,
      inicio_at: DateTime.now(),
      total_preguntas: preguntas.length,
      correctas: 0,
    } as any)

    const id_sesion = (sesion as any).id_sesion ?? sesion.id_sesion
    const rows = preguntas.map((p: any, i: number) => ({
      id_sesion,
      id_pregunta: p.id_pregunta ?? null,
      orden: i + 1,
      tiempo_asignado_seg: (p as any).time_limit_seconds ?? null,
    }))
    await SesionDetalle.createMany(rows as any)

    return {
      sesion,
      preguntas: preguntas.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        area: p.area,
        subtema: p.subtema,
        dificultad: p.dificultad,
        enunciado: p.pregunta,
        opciones: p.opciones,
      })),
    }
  }

  // ========= CERRAR SESIÓN =========
  async cerrarSesion(d: {
    id_sesion: number
    respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }>
  }) {
    this.ensureDetalleTable()

    const ses = await Sesion.findOrFail(d.id_sesion)
    const detalles = await SesionDetalle.query()
      .where('id_sesion', (ses as any).id_sesion)
      .orderBy('orden', 'asc')

    const idsPreg = detalles.map((x) => Number((x as any).id_pregunta)).filter(Boolean)
    const banco = idsPreg.length ? await BancoPregunta.query().whereIn('id_pregunta', idsPreg) : []
    const correctaDe = new Map<number, string>()
    for (const b of banco) {
      correctaDe.set(
        Number((b as any).id_pregunta),
        String((b as any).respuesta_correcta).trim().toUpperCase()
      )
    }

    let correctas = 0
    for (const r of d.respuestas) {
      const det = detalles.find((x) => Number((x as any).orden) === Number(r.orden))
      if (!det) continue

      ;(det as any).alternativa_elegida = r.opcion
      ;(det as any).tiempo_empleado_seg = r.tiempo_empleado_seg ?? null
      ;(det as any).respondida_at = DateTime.now()

      const limite = (det as any).tiempo_asignado_seg
      const excedioTiempo =
        limite != null && (r.tiempo_empleado_seg == null || r.tiempo_empleado_seg > limite)

      let esCorrecta = false
      if (!excedioTiempo) {
        const idp = Number((det as any).id_pregunta)
        const correcta = correctaDe.get(idp)
        const marcada = String(r.opcion || '').trim().toUpperCase()
        esCorrecta = !!correcta && marcada === correcta
      }

      if (esCorrecta) correctas++
      ;(det as any).es_correcta = esCorrecta
      await det.save()
    }

    ;(ses as any).correctas = correctas
    ;(ses as any).puntaje_porcentaje = Math.round(
      (correctas * 100) / Math.max(1, Number((ses as any).total_preguntas) || 5)
    )
    ;(ses as any).fin_at = DateTime.now()
    await ses.save()

    return { aprueba: correctas >= 4, correctas, puntaje: (ses as any).puntaje_porcentaje }
  }

  async registrarFalloReintento(
    id_usuario: number,
    area: Area,
    subtema: string,
    nivel_orden: number
  ) {
    const ultimas = await Sesion.query()
      .where('id_usuario', id_usuario)
      .where('area', area)
      .where('subtema', subtema)
      .orderBy('inicio_at', 'asc')
      .limit(3)

    const perdidas = ultimas.filter((s) => (Number((s as any).correctas) || 0) < 4)
    if (perdidas.length >= 3) {
      const nuevoNivel = Math.max(1, nivel_orden - 1)
      return { bajar: true, nuevoNivel }
    }
    return { bajar: false, nuevoNivel: nivel_orden }
  }

  // ========= SIMULACRO POR ÁREA (25 del área solicitada) =========
  async crearSimulacroArea(d: { id_usuario: number; area: Area; subtemas: string[] }) {
    this.ensureDetalleTable()

    const area = String(d.area ?? '').trim() as Area
    const subtemas = Array.isArray(d.subtemas) ? d.subtemas.filter(Boolean) : []
    const TARGET = 25

    const elegidas: any[] = []
    const ya = new Set<number>()

    // 1) Intento con IA (puede traer < 25)
    try {
      const pack = await this.ia.generarPreguntas({
        area,
        subtemas,
        dificultad: 'media',
        cantidad: TARGET,
        id_institucion: null,
      } as any)
      for (const p of (pack || [])) {
        const id = Number((p as any).id_pregunta)
        if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(p) }
      }
    } catch { /* ignore */ }

    const faltan = () => TARGET - elegidas.length
    const toMapped = (r: any) => ({
      id_pregunta: (r as any).id_pregunta,
      area: (r as any).area,
      subtema: (r as any).subtema,
      dificultad: (r as any).dificultad ?? 'media',
      pregunta: (r as any).pregunta,
      opciones: (r as any).opciones,
    })

    // 2) Fallback banco: primero mismo área + subtemas dados
    if (faltan() > 0 && subtemas.length) {
      try {
        const extra = await BancoPregunta.query()
          .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
          .andWhere((qb) => {
            qb.whereRaw('unaccent(lower(subtema)) = ANY (ARRAY[?]::text[])',
              [subtemas.map(s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())]
            )
            .orWhereRaw('unaccent(lower(subtema)) = unaccent(lower(?))', [subtemas[0]])
          })
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(faltan())
        for (const r of extra) {
          const id = Number((r as any).id_pregunta)
          if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(toMapped(r)) }
        }
      } catch {
        const extra = await BancoPregunta.query()
          .whereILike('area', `%${area}%`)
          .andWhere((qb) => {
            qb.whereILike('subtema', `%${subtemas[0] || ''}%`)
          })
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(faltan())
        for (const r of extra) {
          const id = Number((r as any).id_pregunta)
          if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(toMapped(r)) }
        }
      }
    }

    // 3) Si aún faltan, cualquier subtema del MISMO área
    if (faltan() > 0) {
      try {
        const extra = await BancoPregunta.query()
          .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(faltan())
        for (const r of extra) {
          const id = Number((r as any).id_pregunta)
          if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(toMapped(r)) }
        }
      } catch {
        const extra = await BancoPregunta.query()
          .whereILike('area', `%${area}%`)
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(faltan())
        for (const r of extra) {
          const id = Number((r as any).id_pregunta)
          if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(toMapped(r)) }
        }
      }
    }

    // Crear sesión etiquetada con el ÁREA solicitada
    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'simulacro',
      modo: 'estandar',
      area,                  // ← NO “GENERAL”
      usa_estilo_kolb: false,
      inicio_at: DateTime.now(),
      total_preguntas: elegidas.length,
      correctas: 0,
    } as any)

    const id_sesion = (sesion as any).id_sesion ?? sesion.id_sesion
    const rows = elegidas.map((p: any, i: number) => ({
      id_sesion,
      id_pregunta: p.id_pregunta ?? null,
      orden: i + 1,
      tiempo_asignado_seg: null,
    }))
    await SesionDetalle.createMany(rows as any)

    // Devolver también el arreglo de preguntas
    return {
      sesion,
      totalPreguntas: elegidas.length,
      preguntas: elegidas.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        area: p.area,
        subtema: p.subtema,
        dificultad: p.dificultad,
        enunciado: p.pregunta,
        opciones: p.opciones,
      })),
    }
  }

  // ========= QUIZ INICIAL =========
  async crearQuizInicial({
    id_usuario,
    id_institucion,
  }: {
    id_usuario: number
    id_institucion?: number | null
  }) {
    this.ensureDetalleTable()

    type AreaKey = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
    const ORDEN_AREAS: AreaKey[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

    const stripAccents = (s: string) =>
      String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

    const toAreaKeyOrNull = (a: string): AreaKey | null => {
      const s = stripAccents(a)
      if (s.startsWith('matemat')) return 'Matematicas'
      if (s.startsWith('lengua') || s.includes('lectura')) return 'Lenguaje'
      if (s.startsWith('ciencias nat') || s === 'naturales' || s.startsWith('ciencia')) return 'Ciencias'
      if (s.startsWith('ciencias soc') || s.startsWith('social')) return 'Sociales'
      if (s.startsWith('ingles') || s === 'english') return 'Ingles'
      return null
    }

    const areaIndex = (a: string): number => {
      const k = toAreaKeyOrNull(a)
      if (!k) return 999
      return ORDEN_AREAS.indexOf(k)
    }

    const AREAS: AreaKey[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']
    const pack: any[] = []
    for (const area of AREAS) {
      const lote = await this.ia.generarPreguntas({
        area,
        cantidad: 5,
        dificultad: 'media',
        id_institucion: id_institucion ?? null,
      } as any)
      pack.push(...lote)
    }

    pack.sort((a: any, b: any) => areaIndex(String(a?.area)) - areaIndex(String(b?.area)))

    const sesion = await Sesion.create({
      id_usuario,
      tipo: 'diagnostico',
      modo: 'estandar',
      inicio_at: DateTime.now(),
      total_preguntas: pack.length,
      correctas: 0,
    } as any)

    const id_sesion = (sesion as any).id_sesion ?? sesion.id_sesion
    const rows = pack.map((p: any, i: number) => ({
      id_sesion,
      id_pregunta: p.id_pregunta,
      orden: i + 1,
      tiempo_asignado_seg: null,
    }))
    await SesionDetalle.createMany(rows as any)

    return {
      id_sesion,
      preguntas: pack.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        area: p.area,
        subtema: p.subtema,
        dificultad: p.dificultad,
        enunciado: p.pregunta,
        opciones: p.opciones,
      })),
    }
  }

  // ========= QUIZ INICIAL - CERRAR =========
  async cerrarQuizInicial({
    id_sesion,
    respuestas,
  }: {
    id_sesion: number
    respuestas: RespCierre[]
  }) {
    this.ensureDetalleTable()

    await Sesion.findOrFail(id_sesion)

    const detalles = await SesionDetalle.query()
      .where('id_sesion', id_sesion)
      .select(['id_pregunta'])

    const ids = detalles.map((d: any) => Number(d.id_pregunta)).filter(Boolean)
    if (!ids.length) {
      return { id_sesion, puntajes_por_area: {}, puntaje_general: 0 }
    }

    const banco = await BancoPregunta.query().whereIn('id_pregunta', ids)
    const correctaDe = new Map<number, string>()
    const areaDe = new Map<number, string>()

    for (const b of banco) {
      const idp = Number((b as any).id_pregunta)
      correctaDe.set(idp, String((b as any).respuesta_correcta).trim().toUpperCase())
      areaDe.set(idp, String((b as any).area))
    }

    const porArea: Record<string, { total: number; ok: number }> = {}
    for (const idp of ids) {
      const area = areaDe.get(idp) || 'Desconocida'
      porArea[area] = porArea[area] || { total: 0, ok: 0 }
      porArea[area].total += 1
    }

    for (const r of respuestas) {
      const idp = Number(r.id_pregunta)
      const marcada = String(r.respuesta || '').trim().toUpperCase()
      const correcta = correctaDe.get(idp)
      const area = areaDe.get(idp) || 'Desconocida'
      if (!porArea[area]) porArea[area] = { total: 0, ok: 0 }
      if (marcada && correcta && marcada === correcta) porArea[area].ok += 1
    }

    const puntajes: Record<string, number> = {}
    let totalCorrectas = 0
    let totalPreguntas = 0

    for (const [a, agg] of Object.entries(porArea)) {
      const score = agg.total > 0 ? Math.round((agg.ok / agg.total) * 100) : 0
      puntajes[a] = score
      totalCorrectas += agg.ok
      totalPreguntas += agg.total
    }

    const puntajeGeneral =
      totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0

    return { id_sesion, puntajes_por_area: puntajes, puntaje_general: puntajeGeneral }
  }
}
