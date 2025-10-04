// app/services/logros_service.ts
import Sesion from '../models/sesione.js'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

// Umbral de aprobación para otorgar insignia por área (ajústalo si quieres)
const PASS_THRESHOLD = 80

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

    const maxPorArea = new Map<Area, number>()
    for (const s of sims) {
      const area = (s as any).area as Area
      if (!area) continue
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
    const fila = await Sesion.query()
      .where('id_usuario', id_usuario)
      .where('tipo', 'simulacro')
      .where('area', area as any)
      .whereNotNull('fin_at')
      .orderBy('puntaje_porcentaje', 'desc')
      .first()

    const puntajeMax = Number((fila as any)?.puntaje_porcentaje ?? 0)
    const otorgada = puntajeMax >= PASS_THRESHOLD

    // Si usas persistencia de logros, haz el upsert aquí.
    // await LogroUsuario.updateOrCreate({ id_usuario, codigo: `ISLA_COMPLETA_${area.toUpperCase()}` }, {...})

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
