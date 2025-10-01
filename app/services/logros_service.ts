// app/services/logros_service.ts
import ProgresoNivel from '../models/progreso_nivel.js'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
const AREAS: Area[] = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles']

export default class LogrosService {
  /** HU-03: verificar si TODAS las paradas del área están superadas */
  public async asignarInsigniaAreaSiCorresponde(id_usuario: number, area: Area) {
    const filas = await ProgresoNivel
      .query()
      .where('id_usuario', id_usuario)
      .where('area', area)
      .select(['estado'])

    if (!filas.length) {
      return { otorgada: false, area, motivo: 'No hay paradas registradas en esta área' }
    }

    const todasSuperadas = (filas as any[]).every(f => String(f.estado) === 'superado')

    if (todasSuperadas) {
      const nombreArea = area === 'Matematicas' ? 'Matemáticas' : area
      return {
        otorgada: true,
        area,
        nombre: `Isla completa: ${nombreArea}`,
        descripcion: `Completaste todas las paradas del área de ${nombreArea}.`
      }
    }

    return { otorgada: false, area, motivo: 'Aún no se han superado todas las paradas del área' }
  }

  /**
   * HU-04: listar mis insignias (obtenidas y pendientes) SIN persistencia.
   * Regresa 5 posibles “Isla completa: {Área}”.
   */
  public async listarInsigniasCompletas(id_usuario: number) {
    const obtenidas: Array<{codigo: string; nombre: string; descripcion: string; area: Area}> = []
    const pendientes: Array<{codigo: string; nombre: string; descripcion: string; area: Area}> = []

    for (const area of AREAS) {
      const check = await this.asignarInsigniaAreaSiCorresponde(id_usuario, area)
      const nombreArea = area === 'Matematicas' ? 'Matemáticas' : area
      const base = {
        codigo: `ISLA_COMPLETA_${area.toUpperCase()}`,
        nombre: `Isla completa: ${nombreArea}`,
        descripcion: `Completaste todas las paradas del área de ${nombreArea}.`,
        area,
      }
      if (check.otorgada) {
        obtenidas.push(base)
      } else {
        pendientes.push(base)
      }
    }

    return { obtenidas, pendientes }
  }

  /**
   * Compatibilidad con tu endpoint previo `misLogros`:
   * si lo estás llamando desde el controlador, devolvemos el mismo formato
   * (obtenidas/pendientes) calculado.
   */
  public async misLogros(id_usuario: number) {
    return this.listarInsigniasCompletas(id_usuario)
  }
}
