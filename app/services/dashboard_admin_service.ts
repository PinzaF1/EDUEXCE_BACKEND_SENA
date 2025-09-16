// app/services/dashboard_admin_service.ts
import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

export type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

function rangoMes(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
  return { inicio, fin }
}

export default class DashboardAdminService {
  /** IDs de estudiantes de la institución */
  private async idsEstudiantes(id_institucion: number): Promise<number[]> {
    const estudiantes = await Usuario
      .query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .select(['id_usuario'])
    return estudiantes.map((e) => e.id_usuario)
  }

  /** Tarjetas: # de estudiantes que practicaron por área en el mes actual */
  async tarjetasPorArea(id_institucion: number) {
    const ids = await this.idsEstudiantes(id_institucion)
    const { inicio, fin } = rangoMes(new Date())
    const tarjetas: Record<Area, number> = {
      Matematicas: 0, Lenguaje: 0, Ciencias: 0, Sociales: 0, Ingles: 0,
    }
    if (ids.length === 0) return tarjetas

    for (const area of AREAS) {
      const sesiones = await Sesion.query()
        .whereIn('id_usuario', ids)
        .where('area', area)
        .where('inicio_at', '>=', inicio as any)
        .where('inicio_at', '<', fin as any)
        .select(['id_usuario'])

      // distinct estudiantes de ese área en el mes
      const unicos = new Set((sesiones as any[]).map((s) => (s as any).id_usuario))
      tarjetas[area] = unicos.size
    }
    return tarjetas
  }

  /** Progreso (últimos N meses) por área: promedio de puntaje_porcentaje */
  async progresoMensualPorArea(id_institucion: number, meses = 6) {
    const ids = await this.idsEstudiantes(id_institucion)
    const hoy = new Date()
    const series: Record<Area, Array<{ mes: string; promedio: number }>> = {
      Matematicas: [], Lenguaje: [], Ciencias: [], Sociales: [], Ingles: [],
    }
    if (ids.length === 0) return series

    for (let i = meses - 1; i >= 0; i--) {
      const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const { inicio, fin } = rangoMes(ref)
      const etiquetaMes = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`

      // traemos una sola vez las sesiones del mes y luego filtramos por área
      const ses = await Sesion.query()
        .whereIn('id_usuario', ids)
        .where('inicio_at', '>=', inicio as any)
        .where('inicio_at', '<', fin as any)
        .select(['area', 'puntaje_porcentaje'])

      for (const area of AREAS) {
        const filtro = (ses as any[]).filter(
          (x) => (x as any).area === area && (x as any).puntaje_porcentaje != null
        )
        const avg = filtro.length
          ? Math.round(
              filtro.reduce((a, b) => a + Number((b as any).puntaje_porcentaje || 0), 0) /
              filtro.length
            )
          : 0
        series[area].push({ mes: etiquetaMes, promedio: avg })
      }
    }
    return series
  }

  /** Rendimiento del mes (promedio por área) */
  async rendimientoDelMes(id_institucion: number, year: number, month1_12: number) {
    const ids = await this.idsEstudiantes(id_institucion)
    const { inicio, fin } = rangoMes(new Date(year, month1_12 - 1, 1))
    const res: Record<Area, number> = {
      Matematicas: 0, Lenguaje: 0, Ciencias: 0, Sociales: 0, Ingles: 0,
    }
    if (ids.length === 0) return res

    const ses = await Sesion.query()
      .whereIn('id_usuario', ids)
      .where('inicio_at', '>=', inicio as any)
      .where('inicio_at', '<', fin as any)
      .select(['area', 'puntaje_porcentaje'])

    for (const area of AREAS) {
      const filtro = (ses as any[]).filter(
        (x) => (x as any).area === area && (x as any).puntaje_porcentaje != null
      )
      res[area] = filtro.length
        ? Math.round(
            filtro.reduce((a, b) => a + Number((b as any).puntaje_porcentaje || 0), 0) /
            filtro.length
          )
        : 0
    }
    return res
  }

  /** === MÉTODO QUE USA EL CONTROLADOR === */
  async resumen(id_institucion: number) {
    const ahora = new Date()
    const tarjetas = await this.tarjetasPorArea(id_institucion)
    const series = await this.progresoMensualPorArea(id_institucion, 6)
    const rendMes = await this.rendimientoDelMes(
      id_institucion,
      ahora.getFullYear(),
      ahora.getMonth() + 1
    )

    const islas = AREAS.map((area) => ({ area, activos: tarjetas[area] || 0 }))
    const serie = AREAS.flatMap((area) =>
      (series[area] || []).map((p) => ({ mes: p.mes, area, valor: p.promedio }))
    )
    const rend = AREAS.map((area) => ({ area, promedio: rendMes[area] || 0 }))

    return { islas, serie, rend }
  }
}
