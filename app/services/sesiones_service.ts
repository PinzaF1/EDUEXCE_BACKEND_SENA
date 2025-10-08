import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'
import EstilosAprendizaje from '../models/estilos_aprendizaje.js'
import BancoPregunta from '../models/banco_pregunta.js'
import ProgresoNivel from '../models/progreso_nivel.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
type RespCierre = { id_pregunta: number; respuesta: string }

/* ====================== Helpers ====================== */

const norm = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const canonArea = (s?: string | null): Area | null => {
  const t = norm(String(s || ''))
  if (!t) return null
  if (t.startsWith('mate')) return 'Matematicas'
  if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje'
  if (t.startsWith('cien')) return 'Ciencias'
  if (t.startsWith('soci')) return 'Sociales'
  if (t.startsWith(' ing')) return 'Ingles'
  if (t.startsWith('ing')) return 'Ingles'
  return null
}

const ABC = ['A', 'B', 'C', 'D', 'E', 'F']

function safeOpcCount(raw: any, fallback = 4): number {
  try {
    if (Array.isArray(raw)) return Math.max(2, Math.min(6, raw.length))
    if (raw != null) {
      const parsed = JSON.parse(String(raw))
      if (Array.isArray(parsed)) return Math.max(2, Math.min(6, parsed.length))
    }
  } catch {}
  return fallback
}

function toLetter(value: any, total: number): string {
  const max = Math.max(2, Math.min(6, Number(total) || 4))
  const letters = ABC.slice(0, max)

  if (typeof value === 'string') {
    const v = value.trim().toUpperCase()
    if (letters.includes(v)) return v
    const n = Number(v)
    if (Number.isFinite(n)) {
      if (n >= 1 && n <= max) return letters[n - 1]
      if (n >= 0 && n < max) return letters[n]
    }
    const m = v.match(/(\d+)/)
    if (m) {
      const n2 = Number(m[1])
      if (n2 >= 1 && n2 <= max) return letters[n2 - 1]
    }
    if (v.length === 1) return v
    return ''
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value
    if (n >= 1 && n <= max) return letters[n - 1]
    if (n >= 0 && n < max) return letters[n]
  }

  return ''
}

function extractCorrectLetter(b: any, totalOpc: number): string {
  const rawCorrect =
    b?.respuesta_correcta ??
    b?.opcion_correcta ??
    b?.correcta ??
    b?.indice_correcto ??
    null
  return toLetter(rawCorrect, totalOpc)
}

async function upsertProgresoNivel(opts: {
  id_usuario: number
  area: string
  subtema: string
  nivel_orden?: number | null
  preguntas_por_intento?: number | null
}) {
  const { id_usuario } = opts
  const area = canonArea(opts.area)
  const subtema = String(opts.subtema || '').trim()
  if (!area || !subtema) return

  const nivel = Number.isFinite(Number(opts.nivel_orden)) ? Number(opts.nivel_orden) : 1
  const preguntas = Number.isFinite(Number(opts.preguntas_por_intento))
    ? Number(opts.preguntas_por_intento)
    : 5

  const payload = {
    id_usuario,
    area,
    subtema,
    nivel_orden: nivel,
    preguntas_por_intento: preguntas,
  }

  try {
    const existing = await ProgresoNivel.query()
      .where('id_usuario', id_usuario)
      .andWhere('area', area)
      .andWhere('subtema', subtema)
      .first()

    if (existing) {
      await existing.merge(payload).save()
    } else {
      await ProgresoNivel.create(payload)
    }
  } catch {
    try {
      await ProgresoNivel.query()
        .where('id_usuario', id_usuario)
        .andWhere('area', area)
        .andWhere('subtema', subtema)
        .update(payload)
    } catch {}
  }
}

/* ====================== Service ====================== */

export default class SesionesService {
  ia = new IaService()

  private ensureDetalleTable() {
    const expected = 'public.sesiones_detalles'
    if ((SesionDetalle as any).table !== expected) {
      (SesionDetalle as any).table = expected
    }
  }

  // ===== Reutilización de sesión (slot único por combinación) =====
  private applySlotWhere(q: ReturnType<typeof Sesion.query>, slot: {
    id_usuario: number
    area?: string | null
    tipo?: string | null
    nivel_orden?: number | null
  }) {
    q.where('id_usuario', slot.id_usuario)
    if (slot.area === null) q.whereNull('area')
    else if (slot.area !== undefined) q.where('area', slot.area)
    if (slot.tipo === null) q.whereNull('tipo')
    else if (slot.tipo !== undefined) q.where('tipo', slot.tipo)
    if (slot.nivel_orden === null) q.whereNull('nivel_orden')
    else if (slot.nivel_orden !== undefined) q.where('nivel_orden', slot.nivel_orden)
    return q
  }

  private async upStartOrReuse(p: {
    id_usuario: number
    total_preguntas: number
    area?: string | null
    tipo?: string | null
    nivel_orden?: number | null
    modo?: string | null
    subtema?: string | null
    usa_estilo_kolb?: boolean
  }) {
    const now = DateTime.local()
    let ses = await this.applySlotWhere(Sesion.query(), p).orderBy('inicio_at', 'desc').first()

    if (ses) {
      const id_sesion = Number((ses as any).id_sesion)
      await SesionDetalle.query().where('id_sesion', id_sesion).delete()
      ;(ses as any).modo = p.modo ?? 'estandar'
      ;(ses as any).area = p.area ?? null
      ;(ses as any).subtema = p.subtema ?? null
      ;(ses as any).tipo = p.tipo ?? null
      ;(ses as any).nivel_orden = p.nivel_orden ?? null
      ;(ses as any).usa_estilo_kolb = !!p.usa_estilo_kolb
      ;(ses as any).inicio_at = now
      ;(ses as any).fin_at = null
      ;(ses as any).total_preguntas = p.total_preguntas
      ;(ses as any).correctas = 0
      ;(ses as any).puntaje_porcentaje = null
      await (ses as any).save()
      return ses
    }

    ses = await Sesion.create({
      id_usuario: p.id_usuario,
      modo: p.modo ?? 'estandar',
      area: p.area ?? null,
      subtema: p.subtema ?? null,
      tipo: p.tipo ?? null,
      nivel_orden: p.nivel_orden ?? null,
      usa_estilo_kolb: !!p.usa_estilo_kolb,
      inicio_at: now,
      total_preguntas: p.total_preguntas,
      correctas: 0,
      is_activa: true,
    } as any)
    return ses
  }

  private async upAttachPreguntas(id_sesion: number, preguntas: Array<any>) {
    await SesionDetalle.query().where('id_sesion', id_sesion).delete()
    let orden = 1
    for (const p of preguntas || []) {
      await SesionDetalle.create({
        id_sesion,
        id_pregunta: Number((p as any).id_pregunta) || null,
        orden,
        tiempo_asignado_seg: (p as any).time_limit_seconds ?? null,
      } as any)
      orden++
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

    await Sesion.query()
      .where('id_usuario', d.id_usuario)
      .whereNull('fin_at')
      .update({ fin_at: DateTime.now() })

    const prev = await Sesion.query()
      .where('id_usuario', d.id_usuario)
      .where('area', area)
      .where('subtema', subtema)
      .orderBy('inicio_at', 'asc')
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

    let preguntas: any[] = await this.ia.generarPreguntas({
      area,
      subtemas: [subtema],
      dificultad: 'facil',
      estilo_kolb,
      cantidad: 5,
      id_institucion: null,
      excluir_ids: excludeIds,
    } as any)

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

    const sesion = await this.upStartOrReuse({
      id_usuario: d.id_usuario,
      area,
      tipo: 'practica',
      nivel_orden: d.nivel_orden ?? null,
      subtema,
      total_preguntas: preguntas.length,
      modo: 'estandar',
      usa_estilo_kolb: !!d.usa_estilo_kolb,
    })

    await upsertProgresoNivel({
      id_usuario: d.id_usuario,
      area: d.area,
      subtema: d.subtema,
      nivel_orden: d.nivel_orden,
      preguntas_por_intento: (sesion as any).total_preguntas ?? 5,
    })

    await this.upAttachPreguntas(Number((sesion as any).id_sesion), preguntas)

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
    respuestas: Array<{
      orden?: number
      opcion?: string
      id_pregunta?: number
      respuesta?: string
      seleccion?: string
      alternativa?: string
      tiempo_empleado_seg?: number
    }>
  }) {
    this.ensureDetalleTable()

    const ses = await Sesion.findOrFail(d.id_sesion)
    const detalles = await SesionDetalle.query()
      .where('id_sesion', (ses as any).id_sesion)
      .orderBy('orden', 'asc')

    const ordenDeId = new Map<number, number>()
    for (const det of detalles as any[]) {
      const idp = Number(det.id_pregunta)
      const ord = Number(det.orden)
      if (Number.isFinite(idp) && Number.isFinite(ord)) ordenDeId.set(idp, ord)
    }

    const respuestas = (Array.isArray(d.respuestas) ? d.respuestas : [])
      .map((r: any) => {
        if (r?.orden != null) {
          return {
            orden: Number(r.orden),
            opcion: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '')
              .trim()
              .toUpperCase(),
            tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
          }
        }
        const idp = Number(r.id_pregunta ?? r.idPregunta ?? r.id ?? NaN)
        const ord = ordenDeId.get(idp)
        if (ord == null) return null
        return {
          orden: ord,
          opcion: String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '')
            .trim()
            .toUpperCase(),
          tiempo_empleado_seg: r.tiempo_empleado_seg ?? null,
        }
      })
      .filter(Boolean) as Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number | null }>

    if (respuestas.length === 0) {
      ;(ses as any).correctas = 0
      ;(ses as any).puntaje_porcentaje = 0
      ;(ses as any).fin_at = DateTime.now()
      await ses.save()
      return { aprueba: false, correctas: 0, puntaje: 0 }
    }

    const idsPreg = detalles.map((x: any) => Number(x.id_pregunta)).filter(Boolean)
    const banco = idsPreg.length ? await BancoPregunta.query().whereIn('id_pregunta', idsPreg) : []

    const totalOpcDe = new Map<number, number>()
    const correctaDe = new Map<number, string>()
    for (const b of banco as any[]) {
      const idp = Number(b.id_pregunta)
      const totalOpc = safeOpcCount((b as any).opciones, 4)
      const letraCorrecta = extractCorrectLetter(b, totalOpc)
      totalOpcDe.set(idp, totalOpc)
      correctaDe.set(idp, letraCorrecta)
    }

    let correctas = 0
    for (const r of respuestas) {
      const det = (detalles as any[]).find((x) => Number(x.orden) === Number(r.orden))
      if (!det) continue

      ;(det as any).alternativa_elegida = r.opcion
      ;(det as any).tiempo_empleado_seg = r.tiempo_empleado_seg ?? null
      ;(det as any).respondida_at = DateTime.now()

      const limite = (det as any).tiempo_asignado_seg
      const excedioTiempo =
        limite != null && (r.tiempo_empleado_seg == null || r.tiempo_empleado_seg > limite)

      const idp = Number((det as any).id_pregunta)
      const totalOpc = totalOpcDe.get(idp) ?? 4
      const correcta = (correctaDe.get(idp) || '') as string
      const marcada = toLetter(r.opcion, totalOpc)

      let esCorrecta = false
      if (!excedioTiempo && correcta && marcada) {
        esCorrecta = marcada === correcta
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

    if ((ses as any).area && (ses as any).subtema) {
      await upsertProgresoNivel({
        id_usuario: (ses as any).id_usuario,
        area: (ses as any).area,
        subtema: (ses as any).subtema,
        nivel_orden: (ses as any).nivel_orden ?? 1,
        preguntas_por_intento: (ses as any).total_preguntas ?? 5,
      })
    }

    return { aprueba: correctas >= 4, correctas, puntaje: (ses as any).puntaje_porcentaje }
  }

  // ========= SIMULACRO POR ÁREA =========
  async crearSimulacroArea(d: { id_usuario: number; area: Area; subtemas: string[] }) {
    this.ensureDetalleTable()

    const area = String(d.area ?? '').trim() as Area
    const subtemas = Array.isArray(d.subtemas) ? d.subtemas.filter(Boolean) : []
    const TARGET = 25

    await Sesion.query().where('id_usuario', d.id_usuario).whereNull('fin_at').update({ fin_at: DateTime.now() })

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
    } catch {}

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

    const sesion = await this.upStartOrReuse({
      id_usuario: d.id_usuario,
      area,
      tipo: 'simulacro',
      nivel_orden: null,
      subtema: null,
      total_preguntas: elegidas.length,
      modo: 'estandar',
      usa_estilo_kolb: false,
    })

    for (const st of subtemas) {
      await upsertProgresoNivel({
        id_usuario: d.id_usuario,
        area,
        subtema: st,
        nivel_orden: 1,
        preguntas_por_intento: 25,
      })
    }

    await this.upAttachPreguntas(Number((sesion as any).id_sesion), elegidas)

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

  // ========= CERRAR SIMULACRO =========
  async cerrarSesionSimulacro(d: {
    id_sesion: number
    respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }>
  }) {
    return this.cerrarSesion(d)
  }

  // ========= QUIZ INICIAL =========
  async crearQuizInicial({
    id_usuario,
    id_institucion,
  }: { id_usuario: number; id_institucion?: number | null }) {
    this.ensureDetalleTable()

    await Sesion.query().where('id_usuario', id_usuario).whereNull('fin_at').update({ fin_at: DateTime.now() })

    type AreaKey = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
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

    const sesion = await this.upStartOrReuse({
      id_usuario,
      area: null,
      tipo: 'diagnostico',
      nivel_orden: null,
      subtema: null,
      total_preguntas: pack.length,
      modo: 'estandar',
      usa_estilo_kolb: false,
    })

    await this.upAttachPreguntas(Number((sesion as any).id_sesion), pack)

    const id_sesion = Number((sesion as any).id_sesion)
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
    const totalOpcDe = new Map<number, number>()

    for (const b of banco as any[]) {
      const idp = Number(b.id_pregunta)
      const total = safeOpcCount((b as any).opciones, 4)
      totalOpcDe.set(idp, total)
      correctaDe.set(idp, extractCorrectLetter(b, total))
      areaDe.set(idp, String((b as any).area))
      if ((b as any).explicacion) explicacionDe.set(idp, String((b as any).explicacion))
    }

    const normalizadas = (Array.isArray(respuestas) ? respuestas : []).map((r: any) => {
      const idp = Number(r.id_pregunta ?? r.idPregunta ?? r.id ?? null)
      const raw = String(r.respuesta ?? r.seleccion ?? r.opcion ?? r.alternativa ?? '').trim()
      return { id_pregunta: idp, respuesta: raw }
    }).filter(x => Number.isFinite(x.id_pregunta))

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
      const totalOpc = totalOpcDe.get(idp) ?? 4
      const marcada = toLetter(r.respuesta, totalOpc)
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

    const puntajeGeneral = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0
    return { id_sesion, puntajes_por_area: puntajes, puntaje_general: puntajeGeneral, detalle }
  }
}
