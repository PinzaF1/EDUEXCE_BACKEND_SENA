// app/services/logros_service.ts
import Sesion from '../models/sesione.js'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

// Umbral de aprobación para otorgar insignia por área
const PASS_THRESHOLD = 50

function metaDeArea(a: Area) {
  const nombreArea = a === 'Matematicas' ? 'Matemáticas' : a
  return {
    codigo: `ISLA_COMPLETA_${a.toUpperCase()}`,
    nombre: `Isla completa: ${nombreArea}`,
    descripcion: `Completaste todas las paradas del área de ${nombreArea}.`,
    area: nombreArea,
  }
}

export default class LogrosService {
  /**
   * Devuelve {obtenidas, pendientes} calculando desde sesiones 'simulacro' cerradas.
   * Criterio: existe un simulacro con fin_at y puntaje_porcentaje >= PASS_THRESHOLD en esa área.
   */
  async misLogros(id_usuario: number) {
    const sims = await Sesion.query()
      .where('id_usuario', id_usuario)
      .where('tipo', 'simulacro')
      .whereNotNull('fin_at')
      .select(['area', 'puntaje_porcentaje'])

    // Función para normalizar nombres de área
    const normalizarArea = (a: any): Area | null => {
      if (!a) return null
      const s = String(a).trim().toLowerCase()
      if (s.includes('matematic') || s.includes('mat')) return 'Matematicas'
      if (s.includes('lenguaje') || s.includes('lengua') || s.includes('lectura')) return 'Lenguaje'
      if (s.includes('cien')) return 'Ciencias'
      if (s.includes('social')) return 'Sociales'
      if (s.includes('ingl')) return 'Ingles'
      return null
    }

    const maxPorArea = new Map<Area, number>()
    for (const s of sims) {
      const areaRaw = (s as any).area
      const area = normalizarArea(areaRaw) || (areaRaw as Area)
      if (!area || !AREAS.includes(area)) continue
      
      const p = Number((s as any).puntaje_porcentaje ?? 0)
      const prev = maxPorArea.get(area) ?? 0
      if (p > prev) maxPorArea.set(area, p)
    }

    const obtenidas = AREAS
      .filter(a => (maxPorArea.get(a) ?? 0) >= PASS_THRESHOLD)
      .map(metaDeArea)

    const pendientes = AREAS
      .filter(a => (maxPorArea.get(a) ?? 0) < PASS_THRESHOLD)
      .map(metaDeArea)

    return { obtenidas, pendientes }
  }

  /**
   * Evalúa/otorga solo un área. Si quieres persistir en una tabla de logros, haz el upsert aquí.
   */
  async asignarInsigniaAreaSiCorresponde(id_usuario: number, area: Area) {
    const filas = await Sesion.query()
      .where('id_usuario', id_usuario)
      .where('tipo', 'simulacro')
      .whereNotNull('fin_at')
      .orderBy('puntaje_porcentaje', 'desc')

    let puntajeMax = 0
    for (const s of filas) {
      const areaRaw = (s as any).area
      const areaNormalizada = areaRaw ? String(areaRaw).trim().toLowerCase() : ''
      if (area === 'Matematicas' && (areaNormalizada.includes('matematic') || areaNormalizada.includes('mat'))) {
        const p = Number((s as any).puntaje_porcentaje ?? 0)
        if (p > puntajeMax) puntajeMax = p
      } else if (area === 'Lenguaje' && (areaNormalizada.includes('lenguaje') || areaNormalizada.includes('lengua') || areaNormalizada.includes('lectura'))) {
        const p = Number((s as any).puntaje_porcentaje ?? 0)
        if (p > puntajeMax) puntajeMax = p
      } else if (area === 'Ciencias' && areaNormalizada.includes('cien')) {
        const p = Number((s as any).puntaje_porcentaje ?? 0)
        if (p > puntajeMax) puntajeMax = p
      } else if (area === 'Sociales' && areaNormalizada.includes('social')) {
        const p = Number((s as any).puntaje_porcentaje ?? 0)
        if (p > puntajeMax) puntajeMax = p
      } else if (area === 'Ingles' && areaNormalizada.includes('ingl')) {
        const p = Number((s as any).puntaje_porcentaje ?? 0)
        if (p > puntajeMax) puntajeMax = p
      }
    }

    const otorgada = puntajeMax >= PASS_THRESHOLD

    return {
      otorgada,
      area: area === 'Matematicas' ? 'Matemáticas' : area,
      puntajeMax,
    }
  }

  async listarInsigniasCompletas(id_usuario: number) {
    return this.misLogros(id_usuario)
  }
}
