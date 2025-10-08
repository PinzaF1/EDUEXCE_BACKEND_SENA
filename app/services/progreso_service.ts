// app/services/progreso_service.ts
import Sesion from '../models/sesione.js'            
import ProgresoNivel from '../models/progreso_nivel.js' 

// ===== ÁREAS y normalizadores =====
export type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

const norm = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

// normaliza nombres de área (con/sin acentos)
const toArea = (raw?: string | null): Area | null => {
  const s = norm(String(raw || ''))
  if (!s) return null
  if (s.startsWith('matem')) return 'Matematicas'
  if (s.startsWith('leng') || s.includes('lectura') || s.includes('critica') || s.includes('critico')) return 'Lenguaje'
  if (s.startsWith('cien') || s.includes('natur')) return 'Ciencias'
  if (s.startsWith('socia') || s.includes('ciudada') || s.includes('hist') || s.includes('geogra') || s.includes('econ')) return 'Sociales'
  if (s.startsWith('ingl')) return 'Ingles'
  return null
}

// heurística por subtema cuando el área viene null
const subtemaToArea = (raw?: string | null): Area | null => {
  const s = norm(String(raw || ''))
  if (!s) return null
  if (s.includes('arit') || s.includes('alge') || s.includes('geome') || s.includes('estad') || s.includes('funci')) return 'Matematicas'
  if (s.includes('lectur') || s.includes('comprens') || s.includes('gramat') || s.includes('texto')) return 'Lenguaje'
  if (s.includes('cienc') || s.includes('biolo') || s.includes('quimi') || s.includes('fisic') || s.includes('natur')) return 'Ciencias'
  if (s.includes('social') || s.includes('ciudada') || s.includes('hist') || s.includes('geogra') || s.includes('econ')) return 'Sociales'
  if (s.includes('ingl')) return 'Ingles'
  return null
}

// porcentaje como coalesce(puntaje_porcentaje, correctas/total)
const scoreOf = (x: any): number => {
  const p = Number(x?.puntaje_porcentaje)
  if (!Number.isNaN(p) && p > 0) return Math.round(p)
  const tot = Number(x?.total_preguntas || 0)
  const ok  = Number(x?.correctas || 0)
  return tot > 0 ? Math.round((ok * 100) / tot) : 0
}

const toISO = (d: any): string | null => {
  if (!d) return null
  // Luxon DateTime
  if (typeof d?.toISO === 'function') return d.toISO()
  // JS Date
  try { return new Date(d).toISOString() } catch { return null }
}

const nivelDe = (p: number) =>
  p >= 91 ? 'Experto' : p >= 76 ? 'Avanzado' : p >= 51 ? 'Intermedio' : 'Básico'

const etiquetaDe = (p: number) =>
  p >= 75 ? 'Excelente' : p >= 60 ? 'Buen progreso' : 'Necesita mejorar'

// ------- helpers extra: mapa subtema->area desde progreso_nivel -------
const buildAreaBySubtemaMap = async (id_usuario: number) => {
  const rows = await ProgresoNivel.query().where('id_usuario', id_usuario)
  const map = new Map<string, Area>()
  for (const r of rows) {
    const sub = norm((r as any).subtema || '')
    const ar  = toArea((r as any).area)
    if (sub && ar && !map.has(sub)) map.set(sub, ar)
  }
  return map
}

const getAreaFromSesion = (row: any, map: Map<string, Area>): Area | null => {
  return toArea(row.area) ?? map.get(norm(row.subtema || '')) ?? subtemaToArea(row.subtema)
}

export default class ProgresoService {
  /**
   * Base: calcula promedios, arma historial y niveles.
   * - solo usa sesiones CERRADAS (fin_at no null)
   * - si el área viene null la infiere con subtema / progreso_nivel
   * - calcula el puntaje con puntaje_porcentaje o correctas/total
   */
  async resumenEstudiante(id_usuario: number) {
    const ses = await Sesion.query()
      .where('id_usuario', id_usuario)
      .whereNotNull('fin_at')                // <<< clave: solo cerradas
      .orderBy('inicio_at', 'desc')

    if (!ses.length) {
      return { porcentaje_global: 0, por_area: {}, simulacros: [], niveles: [] }
    }

    const sub2area = await buildAreaBySubtemaMap(id_usuario)

    // buckets para promediar por área
    const buckets: Record<Area, number[]> = {
      Matematicas: [], Lenguaje: [], Ciencias: [], Sociales: [], Ingles: [],
    }

    for (const s of ses) {
      const row: any = s
      const area = getAreaFromSesion(row, sub2area)
      if (!area) continue

      const puntaje = scoreOf(row)
      buckets[area].push(puntaje)
    }

    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

    const por_area = {
      Matematicas: avg(buckets.Matematicas),
      Lenguaje:    avg(buckets.Lenguaje),
      Ciencias:    avg(buckets.Ciencias),
      Sociales:    avg(buckets.Sociales),
      Ingles:      avg(buckets.Ingles),
    }

    const global = Math.round(
      (por_area.Matematicas + por_area.Lenguaje + por_area.Ciencias + por_area.Sociales + por_area.Ingles) / AREAS.length
    )

    // historial (todas las cerradas; si quieres solo simulacro, filtra por tipo)
    const simulacros = ses
      .map((x: any) => ({
        id_sesion: x.id_sesion,
        area: getAreaFromSesion(x, sub2area),
        puntaje: scoreOf(x),
        fecha: toISO(x.fin_at) || toISO(x.inicio_at),
        tipo: x.tipo || null,
      }))
      .filter((s: { area: any }) => !!s.area)

    // timeline de niveles (si manejas nivel_orden)
    const niveles = ses
      .filter((x: any) => x.nivel_orden != null)
      .sort((a: any, b: any) => (a.nivel_orden || 0) - (b.nivel_orden || 0))
      .map((x: any) => ({
        area: getAreaFromSesion(x, sub2area),
        nivel: x.nivel_orden,
      }))

    return { porcentaje_global: global, por_area, simulacros, niveles }
  }

  /** Resumen general para la pestaña “General” */
  async resumenGeneral(id_usuario: number) {
    const base = await this.resumenEstudiante(id_usuario)
    const pg = Number(base.porcentaje_global || 0)

    const niveles = [
      { nombre: 'Básico',     min: 0,  max: 50,  rango: '0-50%',   actual: pg <= 50,                 valor: pg },
      { nombre: 'Intermedio', min: 51, max: 75,  rango: '51-75%',  actual: pg >= 51 && pg <= 75,     valor: pg },
      { nombre: 'Avanzado',   min: 76, max: 90,  rango: '76-90%',  actual: pg >= 76 && pg <= 90,     valor: pg },
      { nombre: 'Experto',    min: 91, max: 100, rango: '91-100%', actual: pg >= 91,                 valor: pg },
    ]

    return { progresoGlobal: pg, nivelActual: nivelDe(pg), niveles }
  }

  /** Pestaña: Por Materias */
  async porMaterias(id_usuario: number) {
    const base = await this.resumenEstudiante(id_usuario)
    const materias = AREAS.map((a) => {
      const porcentaje = Number((base.por_area as any)?.[a] || 0)
      return {
        nombre: a === 'Matematicas' ? 'Matemáticas' : a,
        porcentaje,
        etiqueta: etiquetaDe(porcentaje),
      }
    })
    return { materias }
  }

  /** Historial (lista con filtros/paginación) */
  /** Historial (solo el ÚLTIMO intento por materia y por tipo) */
async historial(
  id_usuario: number,
  opts?: { materia?: string; page?: number; limit?: number; desde?: string; hasta?: string; tipo?: string }
) {
  const { materia, page = 1, limit = 20, desde, hasta, tipo } = opts || {}
  const base = await this.resumenEstudiante(id_usuario)

  // Pasamos todo a un formato común
  let items = (base.simulacros || []).map((s: any) => ({
    id_sesion: s.id_sesion,
    materia: s.area,
    porcentaje: Number(s.puntaje || 0),
    nivel: ((): string => {
      const p = Number(s.puntaje || 0)
      return p >= 91 ? 'Experto' : p >= 76 ? 'Avanzado' : p >= 51 ? 'Intermedio' : 'Básico'
    })(),
    tipo: s.tipo || null,
    fecha: s.fecha,
  }))

  // Filtros (antes de agrupar)
  const norm = (x: any) => String(x ?? '').trim().toLowerCase()
  if (materia) items = items.filter((i) => norm(i.materia) === norm(materia))
  if (tipo)    items = items.filter((i) => norm(i.tipo) === norm(tipo))
  if (desde)   items = items.filter((i) => new Date(i.fecha) >= new Date(desde))
  if (hasta)   items = items.filter((i) => new Date(i.fecha) <= new Date(hasta))

  // Nos quedamos SOLO con el último por (materia + tipo)
  const ultimoPorClave = new Map<string, typeof items[number]>()
  for (const it of items) {
    const clave = `${it.materia}|${it.tipo ?? ''}`
    const prev = ultimoPorClave.get(clave)
    if (!prev || new Date(it.fecha) > new Date(prev.fecha)) {
      ultimoPorClave.set(clave, it)
    }
  }
  items = Array.from(ultimoPorClave.values())

  // Orden y paginación
  items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  const p = Math.max(1, Number(page))
  const l = Math.max(1, Math.min(100, Number(limit)))
  const start = (p - 1) * l

  return {
    items: items.slice(start, start + l).map((i) => ({
      intentoId: i.id_sesion,
      materia: i.materia,
      porcentaje: i.porcentaje,
      nivel: i.nivel,
      tipo: i.tipo,
      fecha: i.fecha,
      detalleDisponible: true,
    })),
    page: p,
    limit: l,
    total: items.length,
  }
}


  /** Historial (detalle de un intento) */
  async historialDetalle(id_usuario: number, id_sesion: number) {
    const ses = await Sesion.query()
      .where('id_sesion', id_sesion)
      .andWhere('id_usuario', id_usuario)
      .first()

    if (!ses) return null
    const row: any = ses

    const sub2area = await buildAreaBySubtemaMap(id_usuario)
    const materia = getAreaFromSesion(row, sub2area)
    const total = Number(row.total_preguntas || 0)
    const correctas = Number(row.correctas || 0)
    const porcentaje = scoreOf(row)

    return {
      intentoId: row.id_sesion,
      materia,
      porcentaje,
      nivel: nivelDe(porcentaje),
      tipo: row.tipo || null,
      fecha: toISO(row.fin_at) || toISO(row.inicio_at),
      preguntas: {
        total,
        correctas,
        incorrectas: (total && correctas != null) ? (total - correctas) : null,
      }
    }
  }
}
