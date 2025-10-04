// app/services/progreso_service.ts
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import BancoPregunta from '../models/banco_pregunta.js'

type Nivel = 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto'
type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

function nivelPorcentaje(pct: number): Nivel {
  if (pct >= 85) return 'Experto'
  if (pct >= 70) return 'Avanzado'
  if (pct >= 50) return 'Intermedio'
  return 'Básico'
}

function safeNumber(n: any, def = 0) {
  const v = Number(n)
  return Number.isFinite(v) ? v : def
}

function duracionMin(inicio?: Date | string | null, fin?: Date | string | null) {
  if (!inicio || !fin) return null
  const t1 = new Date(inicio as any).getTime()
  const t2 = new Date(fin as any).getTime()
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return null
  return Math.max(0, Math.round((t2 - t1) / 60000))
}

function porcentajeDeSesion(s: any) {
  const total = safeNumber(s.total_preguntas)
  const correctas = safeNumber(s.correctas)
  let pct =
    s.puntaje_porcentaje != null
      ? safeNumber(s.puntaje_porcentaje)
      : total > 0
      ? Math.round((correctas * 100) / total)
      : 0
  return Math.max(0, Math.min(100, Math.round(pct)))
}

// Muestra “Simulacro” en UI cuando el tipo sea simulacro
function etiquetaNivel(tipo: string, pct: number): string {
  return String(tipo) === 'simulacro' ? 'Simulacro' : nivelPorcentaje(pct)
}

export default class ProgresoService {
  // ======= HISTORIAL (lista) =======
  async historialUsuario(id_usuario: number, { page = 1, limit = 20 } = {}) {
    const q = Sesion.query()
      .where('id_usuario', id_usuario)
      .whereIn('tipo', ['practica', 'simulacro'])     // ← incluir simulacros
      .orderBy('inicio_at', 'desc')
      .orderBy('id_sesion', 'desc')                   // ← desempate estable

    const paginator = await q.paginate(page, limit)
    const rows = paginator.all()

    const items = rows.map((s: any) => {
      const pct = porcentajeDeSesion(s)
      const fecha = s.fin_at ?? s.inicio_at
      const total = safeNumber(s.total_preguntas)
      const detalleDisponible = !!s.fin_at && total > 0

      return {
        intentoId: String(s.id_sesion ?? s.id ?? s.id_sesione ?? ''),
        materia: String(s.area ?? (s.tipo === 'simulacro' ? 'Mixto' : 'General')),
        porcentaje: pct,
        nivel: nivelPorcentaje(pct),                 // nivel “numérico” (útil para analítica)
        etiquetaNivel: etiquetaNivel(s.tipo, pct),   // etiqueta para UI (“Simulacro” o nivel)
        fecha: fecha ? new Date(fecha).toISOString() : null,
        detalleDisponible,
        tipo: s.tipo,                                // para badge en el front
        subtema: s.subtema ?? null,
      }
    })

    return {
      items,
      page: paginator.currentPage,
      limit: paginator.perPage,
      total: paginator.total,
    }
  }

  // ======= DETALLE (resumen de un intento) =======
  async detalleIntento(id_sesion: number) {
    const s: any = await Sesion.findBy('id_sesion', id_sesion)
    if (!s) return { error: 'Intento no encontrado' }

    const total = safeNumber(s.total_preguntas)
    const correctas = safeNumber(s.correctas)
    const incorrectas = total > 0 ? Math.max(0, total - correctas) : 0
    const pct = porcentajeDeSesion(s)
    const duracion = duracionMin(s.inicio_at, s.fin_at)

    return {
      intentoId: String(s.id_sesion),
      materia: String(s.area ?? (s.tipo === 'simulacro' ? 'Mixto' : 'General')),
      porcentaje: pct,
      nivel: nivelPorcentaje(pct),
      etiquetaNivel: etiquetaNivel(s.tipo, pct),
      tipo: s.tipo,
      subtema: s.subtema ?? null,
      fecha: (s.fin_at ?? s.inicio_at) ? new Date(s.fin_at ?? s.inicio_at).toISOString() : null,
      resumen: {
        respondidas: total,
        correctas,
        incorrectas,
        tiempo_min: duracion,
      },
    }
  }

  // ======= PREGUNTAS del intento =======
  async preguntasIntento(id_sesion: number) {
    const detalles = await SesionDetalle
      .query()
      .where('id_sesion', id_sesion)
      .orderByRaw('COALESCE(numero, orden) ASC')

    const idsBanco = Array.from(
      new Set((detalles as any[]).map((d) => Number(d.id_pregunta)).filter((x) => Number.isFinite(x)))
    )
    const banco = idsBanco.length ? await BancoPregunta.query().whereIn('id_pregunta', idsBanco) : []
    const byId = new Map<number, any>()
    for (const b of banco as any[]) byId.set(Number(b.id_pregunta), b)

    const items = (detalles as any[]).map((d) => {
      const b = d.id_pregunta ? byId.get(Number(d.id_pregunta)) : null
      const opciones = (() => {
        const raw = d.opciones ?? b?.opciones ?? null
        if (!raw) return []
        if (Array.isArray(raw)) return raw
        try { const arr = JSON.parse(String(raw)); return Array.isArray(arr) ? arr : [] } catch { return [] }
      })()
      const marcada = String((d as any).alternativa_elegida ?? (d as any).opcion_marcada ?? '')
      const correcta = String((d as any).opcion_correcta ?? b?.respuesta_correcta ?? b?.opcion_correcta ?? '')
      return {
        numero: Number((d as any).numero ?? (d as any).orden ?? 0),
        enunciado: String((d as any).enunciado ?? b?.enunciado ?? b?.pregunta ?? ''),
        opciones,
        opcionMarcada: marcada,
        opcionCorrecta: correcta,
        correcta: marcada && correcta ? marcada.toUpperCase() === correcta.toUpperCase() : false,
        explicacion: String((d as any).explicacion ?? b?.explicacion ?? ''),
      }
    })

    return { preguntas: items }
  }

  // ======= ANÁLISIS simple =======
  async analisisIntento(id_sesion: number) {
    const detalles = await SesionDetalle.query().where('id_sesion', id_sesion)

    const idsBanco = Array.from(
      new Set((detalles as any[]).map((d) => Number(d.id_pregunta)).filter((x) => Number.isFinite(x)))
    )
    const banco = idsBanco.length
      ? await BancoPregunta.query().whereIn('id_pregunta', idsBanco).select(['id_pregunta', 'tema', 'competencia'])
      : []

    const temaPorPregunta = new Map<number, string>()
    for (const b of banco as any[]) {
      const tema =
        (b.tema && String(b.tema).trim()) ||
        (b.competencia && String(b.competencia).trim()) ||
        'General'
      temaPorPregunta.set(Number(b.id_pregunta), tema)
    }

    const stats = new Map<string, { ok: number; total: number }>()
    const inc = (k: string, ok: boolean) => {
      if (!stats.has(k)) stats.set(k, { ok: 0, total: 0 })
      const s = stats.get(k)!; s.total++; if (ok) s.ok++
    }

    for (const d of detalles as any[]) {
      const tema = d.id_pregunta ? (temaPorPregunta.get(Number(d.id_pregunta)) ?? 'General') : 'General'
      const marcada = String((d as any).alternativa_elegida ?? (d as any).opcion_marcada ?? '').toUpperCase()
      const correcta = String((d as any).opcion_correcta ?? '').toUpperCase()
      const ok = !!marcada && !!correcta && marcada === correcta
      inc(tema, ok)
    }

    const items = Array.from(stats.entries()).map(([tema, s]) => {
      const pct = s.total ? Math.round((s.ok * 100) / s.total) : 0
      return { tema, pct, ok: s.ok, total: s.total }
    })

    const fortalezas = items.filter((x) => x.pct >= 75).map((x) => x.tema)
    const mejoras = items.filter((x) => x.pct < 50).map((x) => x.tema)

    const recomendaciones = [
      ...mejoras.map((t) => `Practicar más ejercicios de ${t}`),
      'Revisar explicaciones de las preguntas falladas',
      'Realizar simulacros adicionales para consolidar',
    ]

    return { fortalezas, mejoras, recomendaciones, breakdown: items }
  }

  // ======= GENERAL (KPIs) =======
  async general(id_usuario: number, { dias = 90 } = {}) {
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
    const sesiones = await Sesion.query()
      .where('id_usuario', id_usuario)
      .where((qb: any) => {
        qb.where('inicio_at', '>=', desde as any).orWhere('fin_at', '>=', desde as any)
      })
      .orderBy('inicio_at', 'desc')

    if (!sesiones.length) {
      return {
        porcentaje: 0,
        nivel: 'Básico' as Nivel,
        intentos: 0,
        tiempo_total_min: 0,
      }
    }

    let sumPct = 0, nPct = 0, tiempo = 0
    for (const s of sesiones as any[]) {
      const pct = porcentajeDeSesion(s)
      sumPct += pct
      nPct++
      const t = duracionMin(s.inicio_at, s.fin_at)
      if (t != null) tiempo += t
    }

    const promedio = nPct ? Math.round(sumPct / nPct) : 0
    return {
      porcentaje: promedio,
      nivel: nivelPorcentaje(promedio),
      intentos: sesiones.length,
      tiempo_total_min: tiempo,
    }
  }

  // ======= POR MATERIAS =======
  async porMaterias(id_usuario: number, { dias = 90 } = {}) {
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
    const sesiones = await Sesion.query()
      .where('id_usuario', id_usuario)
      .where((qb: any) => {
        qb.where('inicio_at', '>=', desde as any).orWhere('fin_at', '>=', desde as any)
      })

    const map = new Map<Area, number[]>()
    for (const a of AREAS) map.set(a, [])
    for (const s of sesiones as any[]) {
      const area = (s.area ?? '') as Area
      if (!AREAS.includes(area)) continue
      map.get(area)!.push(porcentajeDeSesion(s))
    }

    const items = AREAS.map((a) => {
      const vals = map.get(a) ?? []
      const prom = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : 0
      return { materia: a, porcentaje: prom, nivel: nivelPorcentaje(prom), intentos: vals.length }
    })

    return { items }
  }
}
