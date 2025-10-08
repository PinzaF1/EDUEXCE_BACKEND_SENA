// app/services/progreso_service.ts
import Sesion from '../models/sesione.js'
import ProgresoNivel from '../models/progreso_nivel.js'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
const AREAS: Area[] = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles']

// ===== Helpers locales =====
const nivelDe = (p: number) =>
  p >= 91 ? 'Experto' : p >= 76 ? 'Avanzado' : p >= 51 ? 'Intermedio' : 'Básico'

const etiquetaDe = (p: number) =>
  p >= 75 ? 'Excelente' : p >= 60 ? 'Buen progreso' : 'Necesita mejorar'

// normaliza: quita acentos, trim y minúsculas
const norm = (s: string) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

// construye mapa subtema → área con claves normalizadas (del usuario)
async function buildAreaBySubtemaMap(id_usuario: number) {
  const rows = await ProgresoNivel.query().where('id_usuario', id_usuario)
  const map = new Map<string, Area>()
  for (const r of rows) {
    const sub = norm((r as any).subtema || '')
    const ar  = (r as any).area as Area
    if (sub && ar && !map.has(sub)) map.set(sub, ar)
  }
  return map
}

// obtiene área de la sesión o la infiere por subtema usando el mapa
function getAreaFromSesionOrMap(s: any, areaBySubtema: Map<string, Area>): Area | null {
  if (s.area) return s.area as Area
  const sub = norm(String(s.subtema || ''))
  return (areaBySubtema.get(sub) as Area | undefined) ?? null
}

export default class ProgresoService {
  /**
   * Base: calcula promedios, arma historial y niveles.
   * Ahora convierte fechas a ISO y usa progreso_nivel para inferir áreas cuando vienen null.
   */
  async resumenEstudiante(id_usuario: number) {
    const ses = await Sesion.query()
      .where('id_usuario', id_usuario)
      .orderBy('inicio_at', 'desc')

    if (!ses.length) return { porcentaje_global: 0, por_area: {}, simulacros: [], niveles: [] }

    // mapa subtema → área (fallback)
    const areaBySubtema = await buildAreaBySubtemaMap(id_usuario)

    // ----- promedios por área (considera fallback) -----
    const por_area: Record<Area, number> = { Matematicas:0, Lenguaje:0, Ciencias:0, Sociales:0, Ingles:0 }
    for (const a of AREAS) {
      const s = ses.filter(x => {
        const area = getAreaFromSesionOrMap(x as any, areaBySubtema)
        return area === a && (x as any).puntaje_porcentaje != null
      })
      por_area[a] = s.length
        ? Math.round(s.reduce((acc,b)=> acc + ((b as any).puntaje_porcentaje||0),0)/s.length)
        : 0
    }
    const global = Math.round(Object.values(por_area).reduce((a,b)=> a+b, 0)/AREAS.length)

    // ----- historial de simulacros (solo los que conocemos el área) -----
    const simulacros = ses
      .filter(x => String((x as any).tipo).toLowerCase() === 'simulacro')
      .map(x => {
        const area = getAreaFromSesionOrMap(x as any, areaBySubtema)
        return {
          id_sesion: (x as any).id_sesion,
          area, // puede ser null aquí, lo filtramos abajo
          puntaje: (x as any).puntaje_porcentaje || 0,
          fecha: ((x as any).fin_at?.toISO?.() || (x as any).inicio_at?.toISO?.() || null),
        }
      })
      .filter(s => !!s.area) // descartamos los que aún no se pueden inferir

    // ----- línea de niveles (orden ascendente por nivel_orden) -----
    const niveles = ses
      .filter(x => (x as any).nivel_orden != null)
      .sort((a,b)=> ((a as any).nivel_orden||0) - ((b as any).nivel_orden||0))
      .map(x => ({
        area: getAreaFromSesionOrMap(x as any, areaBySubtema),
        nivel: (x as any).nivel_orden
      }))

    return { porcentaje_global: global, por_area, simulacros, niveles }
  }

  /** Pestaña: General */
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

  /** Pestaña: Historial (lista con filtros/paginación) */
  async historial(
    id_usuario: number,
    opts?: { materia?: string; page?: number; limit?: number; desde?: string; hasta?: string }
  ) {
    const { materia, page = 1, limit = 20, desde, hasta } = opts || {}
    const base = await this.resumenEstudiante(id_usuario)

    let items = (base.simulacros || []).map((s: any) => ({
      id_sesion: s.id_sesion,
      materia: s.area, // ya no debería ser null (filtrado arriba)
      porcentaje: Number(s.puntaje || 0),
      nivel: nivelDe(Number(s.puntaje || 0)),
      fecha: s.fecha,
    }))

    if (materia) items = items.filter(i => String(i.materia).toLowerCase() === String(materia).toLowerCase())
    if (desde)   items = items.filter(i => new Date(i.fecha) >= new Date(desde))
    if (hasta)   items = items.filter(i => new Date(i.fecha) <= new Date(hasta))

    items.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    const p = Math.max(1, Number(page))
    const l = Math.max(1, Math.min(100, Number(limit)))
    const start = (p - 1) * l

    return {
      items: items.slice(start, start + l).map(i => ({
        intentoId: i.id_sesion,
        materia: i.materia,
        porcentaje: i.porcentaje,
        nivel: i.nivel,
        fecha: i.fecha,
        detalleDisponible: true
      })),
      page: p,
      limit: l,
      total: items.length
    }
  }

  /** Historial (detalle de un intento) */
  async historialDetalle(id_usuario: number, id_sesion: number) {
    const ses = await Sesion.query()
      .where('id_sesion', id_sesion)
      .andWhere('id_usuario', id_usuario)
      .first()

    if (!ses) return null

    // inferir área si viene null
    let materia = (ses as any).area || null
    if (!materia) {
      const map = await buildAreaBySubtemaMap(id_usuario)
      materia = getAreaFromSesionOrMap(ses as any, map)
    }

    const total = Number((ses as any).total_preguntas || 0)
    const correctas = Number((ses as any).correctas || 0)
    const porcentaje = (ses as any).puntaje_porcentaje != null
      ? Number((ses as any).puntaje_porcentaje)
      : (total > 0 ? Math.round((correctas / total) * 100) : 0)

    return {
      intentoId: (ses as any).id_sesion,
      materia, // ya no debe ser null si hay match en progreso_nivel
      porcentaje,
      nivel: nivelDe(porcentaje),
      fecha: ((ses as any).fin_at?.toISO?.() || (ses as any).inicio_at?.toISO?.() || null),
      preguntas: {
        total,
        correctas,
        incorrectas: (total && correctas != null) ? (total - correctas) : null,
      }
    }
  }
}