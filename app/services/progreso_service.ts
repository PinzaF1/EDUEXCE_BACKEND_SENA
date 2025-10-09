// app/services/progreso_service.ts
import Sesion from '../models/sesione.js'            
import ProgresoNivel from '../models/progreso_nivel.js' 
import { DateTime } from 'luxon'

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
 
  async resumenEstudiante(id_usuario: number) {
    const ses = await Sesion.query()
      .where('id_usuario', id_usuario)
      .whereNotNull('fin_at')               
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

 
  /** Historial (solo el ÚLTIMO intento por materia y por tipo) */
async historial(
  id_usuario: number,
  opts?: { materia?: string; page?: number; limit?: number; desde?: string; hasta?: string; tipo?: string }
) {
  const { materia, page = 1, limit = 20, desde, hasta, tipo } = opts || {}

  const norm = (s: any) =>
    String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

  const canonArea = (s?: string | null): string => {
    const t = norm(s)
    if (!t) return 'General'
    if (t.startsWith('mate')) return 'Matematicas'
    if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje'
    if (t.startsWith('cien')) return 'Ciencias'
    if (t.startsWith('soci')) return 'Sociales'
    if (t.startsWith('ing'))  return 'Ingles'
    if (t.includes('todas'))  return 'Todas las areas'
    return s || 'General'
  }

  const toISO = (d: any) => (d ? DateTime.fromJSDate(d).toISO() : null)

  // 1) Traer sesiones del usuario
  const filas = await Sesion.query()
    .where('id_usuario', id_usuario)
    .whereNotNull('inicio_at')
    .whereNotNull('total_preguntas')
    .orderBy('fin_at', 'desc')
    .orderBy('inicio_at', 'desc')

  // 2) Mapear y filtrar por tipos permitidos (SOLO practica, simulacro, simulacro_mixto)
  const TIPOS_OK = new Set(['practica', 'simulacro', 'simulacro_mixto'])

  let items = (filas as any[])
    .filter((r) => TIPOS_OK.has(String(r.tipo || '').toLowerCase()))
    .map((r) => {
      const total = Math.max(0, Number(r.total_preguntas || 0))
      const ok = Math.max(0, Number(r.correctas || 0))
      const porcentaje = total > 0 ? Math.round((ok / total) * 100) : Number(r.puntaje_porcentaje || 0)

      const tipoOut = String(r.tipo || '').toLowerCase()
      let nivelOrden: number | null = null
      if (tipoOut === 'practica') {
        nivelOrden = Number(r.nivel_orden || 1) // 1–5
      } else if (tipoOut === 'simulacro') {
        nivelOrden = 6
      } else if (tipoOut === 'simulacro_mixto') {
        const nv = Number(r.nivel_orden || 7)
        nivelOrden = nv >= 8 ? 8 : 7
      }

      const nivelStr =
        porcentaje >= 91 ? 'Experto' : porcentaje >= 76 ? 'Avanzado' : porcentaje >= 51 ? 'Intermedio' : 'Básico'

      return {
        id_sesion: Number(r.id_sesion),
        materia: tipoOut === 'simulacro_mixto' ? 'Todas las areas' : canonArea(r.area),
        porcentaje,
        nivel: nivelStr,
        tipo: tipoOut,
        nivelOrden,
        fecha: toISO(r.fin_at) || toISO(r.inicio_at) || new Date().toISOString(),
      }
    })

  // 3) Filtros opcionales
  if (materia) items = items.filter((i) => norm(i.materia) === norm(materia))
  if (tipo)    items = items.filter((i) => norm(i.tipo) === norm(tipo))
  if (desde)   items = items.filter((i) => new Date(i.fecha) >= new Date(desde))
  if (hasta)   items = items.filter((i) => new Date(i.fecha) <= new Date(hasta))

 
  const keyOf = (it: typeof items[number]) => {
    if (it.tipo === 'practica') return `PRACTICA|${it.materia}`
    if (it.tipo === 'simulacro') return `SIMULACRO|${it.materia}`
    if (it.tipo === 'simulacro_mixto') return `ISLA|${it.nivelOrden}` // 7 y 8
    return `${it.tipo}|${it.materia}|${it.nivelOrden ?? ''}`
  }

  const ultimoPorClave = new Map<string, typeof items[number]>()
  for (const it of items) {
    const k = keyOf(it)
    const prev = ultimoPorClave.get(k)
    if (!prev || new Date(it.fecha) > new Date(prev.fecha)) {
      ultimoPorClave.set(k, it)
    }
  }
  items = Array.from(ultimoPorClave.values())

  // 5) Orden y paginación
  items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  const p = Math.max(1, Number(page))
  const l = Math.max(1, Math.min(100, Number(limit)))
  const start = (p - 1) * l

  return {
    items: items.slice(start, start + l).map((i) => ({
      intentoId: String(i.id_sesion),
      materia: i.materia,
      porcentaje: i.porcentaje,
      nivel: i.nivel,
      tipo: i.tipo,
      nivelOrden: i.nivelOrden,
      fecha: i.fecha,
      detalleDisponible: true,
    })),
    page: p,
    limit: l,
    total: items.length,
  }
}

async historialDetalle(id_usuario: number, id_sesion: number) {
  const norm = (s: any) =>
    String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  const canonArea = (s?: string | null): string => {
    const t = norm(s)
    if (!t) return 'General'
    if (t.startsWith('mate')) return 'Matematicas'
    if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje'
    if (t.startsWith('cien')) return 'Ciencias'
    if (t.startsWith('soci')) return 'Sociales'
    if (t.startsWith('ing'))  return 'Ingles'
    if (t.includes('todas'))  return 'Todas las areas'
    return s || 'General'
  }

  const TIPOS_OK = new Set(['practica', 'simulacro', 'simulacro_mixto'])

  const ses = await Sesion.query()
    .where('id_sesion', id_sesion)
    .andWhere('id_usuario', id_usuario)
    .first()

  if (!ses || !TIPOS_OK.has(String((ses as any).tipo || '').toLowerCase())) return null

  const row: any = ses
  const total = Number(row.total_preguntas || 0)
  const correctas = Number(row.correctas || 0)
  const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : Number(row.puntaje_porcentaje || 0)
  const fecha = row.fin_at ?? row.inicio_at

  let nivelOrden: number | null = null
  if (row.tipo === 'practica') nivelOrden = Number(row.nivel_orden || 1)
  else if (row.tipo === 'simulacro') nivelOrden = 6
  else if (row.tipo === 'simulacro_mixto') nivelOrden = Number(row.nivel_orden || 7) >= 8 ? 8 : 7

  return {
    intentoId: String(row.id_sesion),
    materia: row.tipo === 'simulacro_mixto' ? 'Todas las areas' : canonArea(row.area),
    porcentaje,
    nivel: porcentaje >= 91 ? 'Experto' : porcentaje >= 76 ? 'Avanzado' : porcentaje >= 51 ? 'Intermedio' : 'Básico',
    tipo: String(row.tipo || ''),
    nivelOrden,
    fecha: fecha ? DateTime.fromJSDate(fecha).toISO() : null,
    preguntas: {
      total,
      correctas,
      incorrectas: total && correctas != null ? total - correctas : null,
    },
  }
}

}
