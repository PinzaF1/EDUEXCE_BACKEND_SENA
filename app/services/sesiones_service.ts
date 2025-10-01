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

  /** Forzar tabla calificada para el detalle (sin tocar el modelo) */
  private ensureDetalleTable() {
    const expected = 'public.sesiones_detalles'
   
    if ((SesionDetalle as any).table !== expected) {
      
      (SesionDetalle as any).table = expected
    }
  }

  // ========= PARADA =========
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

    // excluir preguntas de la última sesión del mismo subtema
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

    // estilo Kolb opcional
    let estilo_kolb: any = undefined
    try {
      if (d.usa_estilo_kolb) {
        const k = await EstilosAprendizaje.findBy('id_usuario', d.id_usuario)
        estilo_kolb = (k as any)?.estilo
      }
    } catch { /* ignore */ }

    // ========== 1) Intento principal (IA/local con filtros estrictos) ==========
    let preguntas: any[] = await this.ia.generarPreguntas({
      area,
      subtemas: [subtema],
      dificultad: 'facil',
      estilo_kolb,
      cantidad: 5,
      id_institucion: null,
      excluir_ids: excludeIds,
    } as any)

    // ========== 2) Fallback: Banco por área + subtema (insensible a tildes) ==========
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

      // a) área exacta (sin acentos) + subtema parecido
      let base: any[] = []
      try {
        base = await BancoPregunta.query()
          .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
          .andWhereRaw('unaccent(lower(subtema)) LIKE unaccent(lower(?))', [`%${subtema}%`])
          .if(excludeIds.length > 0, (qb) => qb.whereNotIn('id_pregunta', excludeIds))
          .orderByRaw('random()')
          .limit(5)
      } catch {
        // b) si unaccent no está disponible
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

      // c) completar hasta 5 con cualquier subtema del MISMO área
      const need = Math.max(0, 5 - agg.length)
      if (need > 0) {
        try {
          const extra = await BancoPregunta.query()
            .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
            .if(yaTomadas.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(yaTomadas)))
            .orderByRaw('random()')
            .limit(need)
          for (const r of extra) {
            const id = Number((r as any).id_pregunta)
            if (!yaTomadas.has(id)) { yaTomadas.add(id); agg.push(r) }
          }
        } catch {
          const extra = await BancoPregunta.query()
            .whereILike('area', `%${area}%`)
            .if(yaTomadas.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(yaTomadas)))
            .orderByRaw('random()')
            .limit(need)
          for (const r of extra) {
            const id = Number((r as any).id_pregunta)
            if (!yaTomadas.has(id)) { yaTomadas.add(id); agg.push(r) }
          }
        }
      }

      preguntas = mapBanco(agg.slice(0, 5))
    }

    // ========== 3) Fallback FINAL GARANTIZADO (solo por ÁREA) ==========
    if (!preguntas || preguntas.length === 0) {
      const packArea = await this.ia.generarPreguntas({
        area,
        cantidad: 5,
        dificultad: 'facil',
        id_institucion: null,
        excluir_ids: excludeIds,
      } as any)

      if (packArea && packArea.length) {
        preguntas = packArea
      } else {
        const ultra = await BancoPregunta.query()
          .whereILike('area', `%${area}%`)
          .if(excludeIds.length > 0, (qb) => qb.whereNotIn('id_pregunta', excludeIds))
          .orderByRaw('random()')
          .limit(5)

        preguntas = ultra.map((b: any) => ({
          id_pregunta: b.id_pregunta,
          area: b.area,
          subtema: b.subtema,
          dificultad: (b as any).dificultad ?? 'facil',
          pregunta: (b as any).pregunta,
          opciones: (b as any).opciones,
          time_limit_seconds: (b as any).tiempo_limite_seg ?? null,
        }))
      }
    }

    // crear sesión
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

    // detalle
    const id_sesion = (sesion as any).id_sesion ?? sesion.id_sesion
    const rows = preguntas.map((p: any, i: number) => ({
      id_sesion,
      id_pregunta: p.id_pregunta ?? null,
      orden: i + 1,
      tiempo_asignado_seg: (p as any).time_limit_seconds ?? null,
    }))
    await SesionDetalle.createMany(rows as any)

    // respuesta
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
      .orderBy('inicio_at', 'desc')
      .limit(3)

    const perdidas = ultimas.filter((s) => (Number((s as any).correctas) || 0) < 4)
    if (perdidas.length >= 3) {
      const nuevoNivel = Math.max(1, nivel_orden - 1)
      return { bajar: true, nuevoNivel }
    }
    return { bajar: false, nuevoNivel: nivel_orden }
  }

  // ========= SIMULACRO POR ÁREA =========
  async crearSimulacroArea(d: { id_usuario: number; area: Area; subtemas: string[] }) {
    this.ensureDetalleTable()

    const area = String(d.area ?? '').trim() as Area
    const subtemas = Array.isArray(d.subtemas) ? d.subtemas.filter(Boolean) : []
    const TARGET = 25

    const elegidas: any[] = []
    const ya = new Set<number>()

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

    if (faltan() > 0 && subtemas.length) {
      try {
        const extra = await BancoPregunta.query()
          .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
          .andWhere((qb) => { qb.whereILike('subtema', `%${subtemas[0]}%`) })
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
          .andWhereILike('subtema', `%${subtemas[0]}%`)
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(faltan())
        for (const r of extra) {
          const id = Number((r as any).id_pregunta)
          if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(toMapped(r)) }
        }
      }
    }

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

    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'simulacro',
      modo: 'estandar',
      area,
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
  }: { id_usuario: number; id_institucion?: number | null }) {
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

    // agrupar por área
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
  }: { id_sesion: number; respuestas: RespCierre[] }) {
    this.ensureDetalleTable()

    await Sesion.findOrFail(id_sesion)

    const detalles = await SesionDetalle.query()
      .where('id_sesion', id_sesion)
      .select(['id_pregunta'])

    const ids = detalles.map((d: any) => Number(d.id_pregunta)).filter(Boolean)
    if (!ids.length) {
      return { id_sesion, puntajes_por_area: {}, puntaje_general: 0, detalle: [] }
    }

    const banco = await BancoPregunta.query().whereIn('id_pregunta', ids)
    const correctaDe = new Map<number, string>()
    const areaDe = new Map<number, string>()
    const explicacionDe = new Map<number, string>()

    for (const b of banco) {
      const idp = Number((b as any).id_pregunta)
      correctaDe.set(idp, String((b as any).respuesta_correcta).trim().toUpperCase())
      areaDe.set(idp, String((b as any).area))
      if ((b as any).explicacion) explicacionDe.set(idp, String((b as any).explicacion))
    }

    // Normaliza formas: {id_pregunta, respuesta} | {id_pregunta, seleccion} | {id_pregunta, opcion}
    const normalizadas = (Array.isArray(respuestas) ? respuestas : []).map((r: any) => {
      const idp = Number(r.id_pregunta ?? r.idPregunta ?? r.id ?? null)
      const marc = String(
        r.respuesta ?? r.seleccion ?? r.opcion ?? r.alternativa ?? ''
      ).trim().toUpperCase()
      return { id_pregunta: idp, respuesta: marc }
    }).filter(x => Number.isFinite(x.id_pregunta))

    // Conteos por área
    const porArea: Record<string, { total: number; ok: number }> = {}
    for (const idp of ids) {
      const a = areaDe.get(idp) || 'Desconocida'
      porArea[a] = porArea[a] || { total: 0, ok: 0 }
      porArea[a].total += 1
    }

    const detalle: Array<{
      id_pregunta: number
      area: string | null
      correcta: string | null
      marcada: string | null
      es_correcta: boolean
      explicacion?: string | null
    }> = []

    for (const r of normalizadas) {
      const idp = Number(r.id_pregunta)
      const marcada = r.respuesta
      const correcta = correctaDe.get(idp) || null
      const area = areaDe.get(idp) || 'Desconocida'
      if (!porArea[area]) porArea[area] = { total: 0, ok: 0 }

      const ok = !!(marcada && correcta && marcada === correcta)
      if (ok) porArea[area].ok += 1

      detalle.push({
        id_pregunta: idp,
        area,
        correcta,
        marcada,
        es_correcta: ok,
        explicacion: explicacionDe.get(idp) ?? null,
      })
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

    return { id_sesion, puntajes_por_area: puntajes, puntaje_general: puntajeGeneral, detalle }
  }

  // === Helper privado: puntaje global ICFES (ponderado 3-3-3-3-1 y *5) ===
private icfesGlobal(porArea: Record<string, number>) {
  // aceptamos claves con/ sin tilde por si vienen del banco
  const M = Number(porArea.Matematicas ?? porArea['Matemáticas'] ?? 0)
  const L = Number(porArea.Lenguaje ?? porArea['Lectura Crítica'] ?? 0)
  const C = Number(porArea.Ciencias ?? porArea['Ciencias Naturales'] ?? 0)
  const S = Number(porArea.Sociales ?? porArea['Sociales y Ciudadanas'] ?? 0)
  const I = Number(porArea.Ingles ?? porArea['Inglés'] ?? porArea['Ingles'] ?? 0)

  const sumaPonderada = (M * 3) + (L * 3) + (C * 3) + (S * 3) + (I * 1)
  const promedioPonderado = sumaPonderada / 13
  const globalIcfes = Math.round(promedioPonderado * 5)
  return globalIcfes
}

// ========= NUEVO: SIMULACRO MIXTO (25 = 5 por cada área) =========
public async crearSimulacroMixto(d: { id_usuario: number; modalidad: 'facil' | 'dificil' }) {
  this.ensureDetalleTable()

  type AreaKey = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
  const AREAS: AreaKey[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

  const stripAccents = (s: string) =>
    String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  // normaliza cadenas de área del banco a nuestras claves
  const toAreaKeyOrNull = (a: string): AreaKey | null => {
    const s = stripAccents(a)
    if (s.startsWith('matemat')) return 'Matematicas'
    if (s.startsWith('lengua') || s.includes('lectura')) return 'Lenguaje'
    if (s.startsWith('ciencias nat') || s === 'naturales' || s.startsWith('ciencia')) return 'Ciencias'
    if (s.startsWith('ciencias soc') || s.startsWith('social')) return 'Sociales'
    if (s.startsWith('ingles') || s === 'english') return 'Ingles'
    return null
  }

  // parámetros por modalidad
  const timeLimit = d.modalidad === 'dificil' ? 60 : null

  const preguntas: any[] = []
  const usados = new Set<number>()

  // helper: trae N preguntas del banco para un área, evitando duplicados
  const traerDelBanco = async (areaKey: AreaKey, cuantos: number) => {
    let rows: any[] = []
    try {
      rows = await BancoPregunta.query()
        .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [areaKey])
        .if(usados.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(usados)))
        .orderByRaw('random()')
        .limit(cuantos)
    } catch {
      rows = await BancoPregunta.query()
        .whereILike('area', `%${areaKey}%`)
        .if(usados.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(usados)))
        .orderByRaw('random()')
        .limit(cuantos)
    }
    return rows
      .map((b: any) => ({
        id_pregunta: Number(b.id_pregunta),
        area: toAreaKeyOrNull(String(b.area)) ?? areaKey, // normalizamos
        subtema: b.subtema,
        dificultad: b.dificultad ?? null,
        pregunta: b.pregunta,
        opciones: b.opciones,
        time_limit_seconds: timeLimit,
      }))
      .filter((p) => {
        if (!p.id_pregunta || usados.has(p.id_pregunta)) return false
        usados.add(p.id_pregunta)
        return true
      })
  }

  // 1) Intento con IA (por área 5 c/u). NO filtramos por dificultad del banco.
  // Si IA falla o trae menos, completamos con banco.
  for (const area of AREAS) {
    const lote: any[] = []
    try {
      const pack = await this.ia.generarPreguntas({
        area,
        cantidad: 6, // pedimos 6 para amortiguar duplicados
        // dificultad NO se usa como filtro de banco; la IA puede devolver cualquiera
        id_institucion: null,
      } as any)

      for (const p of (pack || [])) {
        const idp = Number((p as any).id_pregunta)
        if (!idp || usados.has(idp)) continue
        usados.add(idp)
        lote.push({
          id_pregunta: idp,
          area: toAreaKeyOrNull(String(p.area)) ?? area,
          subtema: p.subtema,
          dificultad: p.dificultad ?? null,
          pregunta: p.pregunta,
          opciones: p.opciones,
          time_limit_seconds: timeLimit,
        })
        if (lote.length >= 5) break
      }
    } catch { /* silent */ }

    if (lote.length < 5) {
      const faltan = 5 - lote.length
      const extra = await traerDelBanco(area, faltan)
      lote.push(...extra)
    }

    if (lote.length < 5) {
      // último intento: banco sin igualdad estricta (solo por si hay áreas con tilde)
      let extra2: any[] = []
      try {
        extra2 = await BancoPregunta.query()
          .whereILike('area', `%${area}%`)
          .if(usados.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(usados)))
          .orderByRaw('random()')
          .limit(5 - lote.length)
      } catch { /* ignore */ }

      for (const b of extra2) {
        const idp = Number((b as any).id_pregunta)
        if (!idp || usados.has(idp)) continue
        usados.add(idp)
        lote.push({
          id_pregunta: idp,
          area: toAreaKeyOrNull(String((b as any).area)) ?? area,
          subtema: (b as any).subtema,
          dificultad: (b as any).dificultad ?? null,
          pregunta: (b as any).pregunta,
          opciones: (b as any).opciones,
          time_limit_seconds: timeLimit,
        })
        if (lote.length >= 5) break
      }
    }

    preguntas.push(...lote.slice(0, 5))
  }

  // validación final
  if (preguntas.length !== 25) {
    throw new Error(`Se esperaban 25 preguntas (5 por área), se obtuvieron ${preguntas.length}`)
  }

  // crear sesión
  const sesion = await Sesion.create({
    id_usuario: d.id_usuario,
    tipo: 'simulacro',
    modo: 'estandar',
    area: null as any, // mixto
    usa_estilo_kolb: false,
    inicio_at: DateTime.now(),
    total_preguntas: preguntas.length,
    correctas: 0,
    tiempo_por_pregunta: timeLimit ?? null,
  } as any)

  const id_sesion = (sesion as any).id_sesion ?? sesion.id_sesion
  const rows = preguntas.map((p: any, i: number) => ({
    id_sesion,
    id_pregunta: p.id_pregunta ?? null,
    orden: i + 1,
    tiempo_asignado_seg: timeLimit,
  }))
  await SesionDetalle.createMany(rows as any)

  return {
    sesion: { id_sesion, modalidad: d.modalidad, total: preguntas.length },
    preguntas: preguntas.map((p: any) => ({
      id_pregunta: String(p.id_pregunta),
      area: p.area,
      subtema: p.subtema,
      dificultad: p.dificultad,
      enunciado: p.pregunta,
      opciones: p.opciones,
      time_limit_seconds: p.time_limit_seconds,
    })),
  }
}

// ===== NUEVO: cerrar simulacro mixto (áreas + global + ICFES + tiempo) =====
public async cerrarSimulacroMixto(d: {
  id_sesion: number
  respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }>
}) {
  this.ensureDetalleTable()

  // 1) Reutilizamos tu cierre estándar (marca correctas, puntaje, fin_at)
  const base = await this.cerrarSesion(d)

  // 2) Calculamos por área y tiempos
  const ses = await Sesion.findOrFail(d.id_sesion)
  const detalles = await SesionDetalle.query()
    .where('id_sesion', d.id_sesion)
    .orderBy('orden', 'asc')

  const ids = detalles.map((x: any) => Number(x.id_pregunta)).filter(Boolean)
  const banco = ids.length ? await BancoPregunta.query().whereIn('id_pregunta', ids) : []

  const areaDe = new Map<number, string>()
  for (const b of banco) {
    areaDe.set(Number((b as any).id_pregunta), String((b as any).area))
  }

  const porArea: Record<string, { total: number; ok: number }> = {}
  for (const det of detalles) {
    const idp = Number((det as any).id_pregunta)
    const area = areaDe.get(idp) || 'Desconocida'
    if (!porArea[area]) porArea[area] = { total: 0, ok: 0 }
    porArea[area].total += 1
    if ((det as any).es_correcta === true) porArea[area].ok += 1
  }

  const puntajes_por_area: Record<string, number> = {}
  let totalCorrectas = 0
  let totalPreguntas = 0
  for (const [area, agg] of Object.entries(porArea)) {
    puntajes_por_area[area] = agg.total > 0 ? Math.round((agg.ok / agg.total) * 100) : 0
    totalCorrectas += agg.ok
    totalPreguntas += agg.total
  }
  const puntaje_general = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0

  // === Puntaje global ICFES (ponderado)
  const puntaje_icfes_global = this.icfesGlobal(puntajes_por_area)

  // Duración total
  const fin = (ses as any).fin_at ?? DateTime.now()
  const inicio = (ses as any).inicio_at
  const finMs = typeof (fin as any)?.toMillis === 'function' ? (fin as any).toMillis() : +new Date(fin)
  const iniMs = typeof (inicio as any)?.toMillis === 'function' ? (inicio as any).toMillis() : +new Date(inicio)
  const duracion_segundos = Math.max(0, Math.round((finMs - iniMs) / 1000))
  ;(ses as any).duracion_segundos = duracion_segundos
  await ses.save()

  const tiempo_esperado_seg = 25 * 60 // 25 minutos

  return {
    id_sesion: d.id_sesion,
    resultado_base: base, // { aprueba, correctas, puntaje }
    puntajes_por_area,
    puntaje_general,
    puntaje_icfes_global,
    tiempo: {
      usado_seg: Math.round(duracion_segundos),
      esperado_seg: tiempo_esperado_seg,
      diferencia_seg: Math.round(duracion_segundos - tiempo_esperado_seg),
    },
  }
}

// ===== NUEVO: reconsultar resumen del simulacro (incluye ICFES) =====
public async resumenResultadoSimulacro(id_sesion: number) {
  const ses = await Sesion.find(id_sesion)
  if (!ses) return null

  const detalles = await SesionDetalle.query().where('id_sesion', id_sesion)
  const ids = detalles.map((x: any) => Number(x.id_pregunta)).filter(Boolean)
  const banco = ids.length ? await BancoPregunta.query().whereIn('id_pregunta', ids) : []

  const areaDe = new Map<number, string>()
  for (const b of banco) areaDe.set(Number((b as any).id_pregunta), String((b as any).area))

  const porArea: Record<string, { total: number; ok: number }> = {}
  for (const det of detalles) {
    const idp = Number((det as any).id_pregunta)
    const area = areaDe.get(idp) || 'Desconocida'
    if (!porArea[area]) porArea[area] = { total: 0, ok: 0 }
    porArea[area].total += 1
    if ((det as any).es_correcta === true) porArea[area].ok += 1
  }

  const puntajes_por_area: Record<string, number> = {}
  let totalCorrectas = 0
  let totalPreguntas = 0
  for (const [area, agg] of Object.entries(porArea)) {
    puntajes_por_area[area] = agg.total > 0 ? Math.round((agg.ok / agg.total) * 100) : 0
    totalCorrectas += agg.ok
    totalPreguntas += agg.total
  }
  const puntaje_general = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0

  // === Puntaje global ICFES (ponderado)
  const puntaje_icfes_global = this.icfesGlobal(puntajes_por_area)

  return {
    id_sesion,
    puntajes_por_area,
    puntaje_general,
    puntaje_icfes_global,
    correctas: totalCorrectas,
    total_preguntas: totalPreguntas,
    duracion_segundos: (ses as any).duracion_segundos ?? null,
  }
}


}
