// app/services/sesiones_service.ts
import { DateTime } from 'luxon'
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import BancoPregunta from '../models/banco_pregunta.js'
import IaService from './ia_service.js'
import EstilosAprendizaje from '../models/estilos_aprendizaje.js'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'

export default class SesionesService {
  ia = new IaService()

  /** Forzar nombre calificado de la tabla detalle sin tocar el modelo */
  private ensureDetalleTable() {
    const expected = 'public.sesiones_detalles'
    // @ts-ignore
    if ((SesionDetalle as any).table !== expected) {
      // @ts-ignore
      (SesionDetalle as any).table = expected
    }
  }

  // ========== PARADA ==========
  async crearParada(d: {
    id_usuario: number
    area: Area
    subtema: string
    nivel_orden: number
    usa_estilo_kolb: boolean
    intento_actual?: number
  }) {
    this.ensureDetalleTable()

    const prev = await Sesion.query()
      .where('id_usuario', d.id_usuario)
      .where('area', d.area)
      .where('subtema', d.subtema)
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
    } catch {}

    const preguntas = await this.ia.generarPreguntas({
      area: d.area,
      subtemas: [d.subtema],
      dificultad: 'facil',
      estilo_kolb,
      cantidad: 5,
      id_institucion: null,
      excluir_ids: excludeIds,
    } as any)

    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'practica',
      modo: 'estandar',
      area: d.area,
      subtema: d.subtema,
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

  // ========== CERRAR SESIÓN (parada/simulacro) ==========
  // Acepta:
  //  - { orden, opcion }  (formato antiguo)
  //  - { id_pregunta, respuesta? | seleccion? } (formato nuevo)
  async cerrarSesion(d: {
    id_sesion: number
    respuestas: Array<
      | { orden: number; opcion: string; tiempo_empleado_seg?: number }
      | { id_pregunta: number; respuesta?: string; seleccion?: string; tiempo_empleado_seg?: number }
    >
  }) {
    this.ensureDetalleTable()

    const ses = await Sesion.findOrFail(d.id_sesion)
    const detalles = await SesionDetalle.query()
      .where('id_sesion', (ses as any).id_sesion)
      .orderBy('orden', 'asc')

    const porOrden = new Map<number, { letra: string; tiempo?: number }>()
    const porId = new Map<number, { letra: string; tiempo?: number }>()
    for (const r of d.respuestas || []) {
      const anyR = r as any
      if (anyR.orden != null && anyR.opcion != null) {
        porOrden.set(Number(anyR.orden), { letra: String(anyR.opcion).trim().toUpperCase(), tiempo: anyR.tiempo_empleado_seg ?? undefined })
      } else if (anyR.id_pregunta != null) {
        const letra = String(anyR.respuesta ?? anyR.seleccion ?? '').trim().toUpperCase()
        if (letra) porId.set(Number(anyR.id_pregunta), { letra, tiempo: anyR.tiempo_empleado_seg ?? undefined })
      }
    }

    const idsPreg = detalles.map((x) => Number((x as any).id_pregunta)).filter(Boolean)
    const banco = idsPreg.length ? await BancoPregunta.query().whereIn('id_pregunta', idsPreg) : []
    const correctaDe = new Map<number, string>()
    const areaDe = new Map<number, string>()
    const explicacionDe = new Map<number, string | null>()
    for (const b of banco) {
      const idp = Number((b as any).id_pregunta)
      correctaDe.set(idp, String((b as any).respuesta_correcta).trim().toUpperCase())
      areaDe.set(idp, String((b as any).area))
      explicacionDe.set(idp, (b as any).explicacion ?? null)
    }

    const porArea: Record<string, { total: number; ok: number }> = {}
    for (const idp of idsPreg) {
      const area = areaDe.get(idp) || 'Desconocida'
      porArea[area] = porArea[area] || { total: 0, ok: 0 }
      porArea[area].total += 1
    }

    let correctas = 0
    const ahora = DateTime.now()
    const detalleResp: any[] = []

    for (const det of detalles) {
      const idp = Number((det as any).id_pregunta)
      const ord = Number((det as any).orden)

      const marcadaInfo = porId.get(idp) ?? porOrden.get(ord) ?? null
      const marcada = marcadaInfo?.letra ?? null
      const correcta = correctaDe.get(idp) || null
      const area = areaDe.get(idp) || 'Desconocida'

      const es_correcta = !!(marcada && correcta && marcada === correcta)
      if (es_correcta) { correctas++; porArea[area].ok += 1 }

      ;(det as any).alternativa_elegida = marcada
      ;(det as any).es_correcta = es_correcta
      ;(det as any).tiempo_empleado_seg = marcadaInfo?.tiempo ?? null
      ;(det as any).respondida_at = ahora
      await det.save()

      detalleResp.push({
        id_pregunta: idp,
        area,
        marcada,
        correcta,
        es_correcta,
        explicacion: explicacionDe.get(idp) ?? null,
      })
    }

    ;(ses as any).correctas = correctas
    ;(ses as any).puntaje_porcentaje = Math.round(
      (correctas * 100) / Math.max(1, Number((ses as any).total_preguntas) || 1)
    )
    ;(ses as any).fin_at = ahora
    await ses.save()

    const puntajes_por_area: Record<string, number> = {}
    let totalPreguntas = 0
    for (const [a, agg] of Object.entries(porArea)) {
      puntajes_por_area[a] = agg.total > 0 ? Math.round((agg.ok / agg.total) * 100) : 0
      totalPreguntas += agg.total
    }
    const puntaje_general = totalPreguntas > 0 ? Math.round((correctas / totalPreguntas) * 100) : 0

    return { id_sesion: d.id_sesion, correctas, puntaje: (ses as any).puntaje_porcentaje, puntajes_por_area, puntaje_general, detalle: detalleResp }
  }

  // ========== SIMULACRO POR ÁREA ==========
  async crearSimulacroArea(d: { id_usuario: number; area: Area; subtemas: string[] }) {
    this.ensureDetalleTable()

    const TARGET = 25
    const elegidas: any[] = []
    const ya = new Set<number>()

    // IA primero
    try {
      const pack = await this.ia.generarPreguntas({
        area: d.area,
        subtemas: d.subtemas,
        dificultad: 'media',
        cantidad: TARGET,
        id_institucion: null,
      } as any)
      for (const p of (pack || [])) {
        const id = Number((p as any).id_pregunta)
        if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(p) }
      }
    } catch {}

    // Si faltan, completa con banco del área
    if (elegidas.length < TARGET) {
      const extra = await BancoPregunta.query()
        .whereIn('area', [d.area, 'Inglés', 'Lenguaje', 'Ciencias', 'Matematicas', 'Sociales']) // seguridad
        .where('area', d.area)
        .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
        .orderByRaw('random()')
        .limit(TARGET - elegidas.length)

      for (const r of extra) {
        const id = Number((r as any).id_pregunta)
        if (!ya.has(id) && elegidas.length < TARGET) {
          ya.add(id)
          elegidas.push({
            id_pregunta: (r as any).id_pregunta,
            area: (r as any).area,
            subtema: (r as any).subtema,
            dificultad: (r as any).dificultad ?? 'media',
            pregunta: (r as any).pregunta,
            opciones: (r as any).opciones,
          })
        }
      }
    }

    const sesion = await Sesion.create({
      id_usuario: d.id_usuario,
      tipo: 'simulacro',
      modo: 'estandar',
      area: d.area,
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

  // ========== QUIZ INICIAL (25: 5 por área, agrupadas) ==========
  async crearQuizInicial({ id_usuario, id_institucion }: { id_usuario: number; id_institucion?: number | null }) {
    this.ensureDetalleTable()

    type AreaKey = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
    const ORDEN_AREAS: AreaKey[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

    const strip = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const asKey = (a: string): AreaKey | null => {
      const s = strip(a)
      if (s.startsWith('matemat')) return 'Matematicas'
      if (s.startsWith('lengua') || s.includes('lectura')) return 'Lenguaje'
      if (s.startsWith('ciencias nat') || s === 'naturales' || s.startsWith('ciencia')) return 'Ciencias'
      if (s.startsWith('ciencias soc') || s.startsWith('social')) return 'Sociales'
      if (s.startsWith('ingles') || s === 'english') return 'Ingles'
      return null
    }
    const idx = (a: string) => {
      const k = asKey(a)
      return k ? ORDEN_AREAS.indexOf(k) : 999
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
    // Agrupar por área en el orden fijo
    pack.sort((a: any, b: any) => idx(String(a?.area)) - idx(String(b?.area)))

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

  // ========== QUIZ INICIAL - CERRAR (guarda, compara, explica, puntajes) ==========
  async cerrarQuizInicial({
    id_sesion,
    respuestas,
  }: {
    id_sesion: number
    respuestas: Array<{ id_pregunta: number; respuesta?: string; seleccion?: string; tiempo_empleado_seg?: number }>
  }) {
    this.ensureDetalleTable()

    const ses = await Sesion.findOrFail(id_sesion)
    const detalles = await SesionDetalle.query()
      .where('id_sesion', id_sesion)
      .orderBy('orden', 'asc')

    const ids = detalles.map((d: any) => Number(d.id_pregunta)).filter(Boolean)
    if (!ids.length) {
      return { id_sesion, puntajes_por_area: {}, puntaje_general: 0, detalle: [] }
    }

    const banco = await BancoPregunta.query().whereIn('id_pregunta', ids)
    const correctaDe = new Map<number, string>()
    const areaDe = new Map<number, string>()
    const explicacionDe = new Map<number, string | null>()
    for (const b of banco) {
      const idp = Number((b as any).id_pregunta)
      correctaDe.set(idp, String((b as any).respuesta_correcta || '').trim().toUpperCase())
      areaDe.set(idp, String((b as any).area || 'Desconocida'))
      explicacionDe.set(idp, (b as any).explicacion ?? null)
    }

    const marcadas = new Map<number, { letra: string; tiempo?: number }>()
    for (const r of respuestas || []) {
      const idp = Number((r as any).id_pregunta)
      const letra = String((r as any).respuesta ?? (r as any).seleccion ?? '')
        .trim()
        .toUpperCase()
      if (idp && letra) {
        marcadas.set(idp, { letra, tiempo: (r as any).tiempo_empleado_seg ?? undefined })
      }
    }

    const porArea: Record<string, { total: number; ok: number }> = {}
    for (const idp of ids) {
      const area = areaDe.get(idp) || 'Desconocida'
      porArea[area] = porArea[area] || { total: 0, ok: 0 }
      porArea[area].total += 1
    }

    let totalCorrectas = 0
    const ahora = DateTime.now()
    const detalle: any[] = []

    for (const det of detalles) {
      const idp = Number((det as any).id_pregunta)
      const area = areaDe.get(idp) || 'Desconocida'
      const correcta = correctaDe.get(idp) || null

      const marcadaInfo = marcadas.get(idp)
      const marcada = marcadaInfo?.letra ?? null
      const es_correcta = !!(marcada && correcta && marcada === correcta)
      if (es_correcta) { totalCorrectas++; porArea[area].ok += 1 }

      ;(det as any).alternativa_elegida = marcada
      ;(det as any).es_correcta = es_correcta
      ;(det as any).tiempo_empleado_seg = marcadaInfo?.tiempo ?? null
      ;(det as any).respondida_at = ahora
      await det.save()

      detalle.push({
        id_pregunta: idp,
        area,
        marcada,
        correcta,
        es_correcta,
        explicacion: explicacionDe.get(idp) ?? null,
      })
    }

    const puntajes_por_area: Record<string, number> = {}
    let totalPreguntas = 0
    for (const [a, agg] of Object.entries(porArea)) {
      puntajes_por_area[a] = agg.total > 0 ? Math.round((agg.ok / agg.total) * 100) : 0
      totalPreguntas += agg.total
    }
    const puntaje_general = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0

    ;(ses as any).correctas = totalCorrectas
    ;(ses as any).puntaje_porcentaje = puntaje_general
    ;(ses as any).fin_at = ahora
    await ses.save()

    return { id_sesion, puntajes_por_area, puntaje_general, detalle }
  }
}
