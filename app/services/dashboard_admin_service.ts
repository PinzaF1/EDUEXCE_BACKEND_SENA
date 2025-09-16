import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
const AREAS: Area[] = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles']

function rangoMes(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
  return { inicio, fin }
}

export default class DashboardAdminService {
  // Tarjetas: cuántos estudiantes practicando por área en el mes actual
  async tarjetasPorArea(id_institucion: number) {
    const { inicio, fin } = rangoMes(new Date())
    // ids estudiantes de la institución
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)
    const ids = estudiantes.map(e => e.id_usuario)
    const tarjetas: Record<Area, number> = { Matematicas:0, Lenguaje:0, Ciencias:0, Sociales:0, Ingles:0 }

    if (ids.length === 0) return tarjetas

    for (const area of AREAS) {
      const s = await Sesion.query()
        .whereIn('id_usuario', ids)
        .where('area', area)
        .where('inicio_at', '>=', inicio as any)
        .where('inicio_at', '<', fin as any)
        .limit(1) // basta saber si participa
      tarjetas[area] = s.length
    }
    return tarjetas
  }

  // Progreso mensual por área (últimos 6 meses): promedio de puntaje_porcentaje
  async progresoMensualPorArea(id_institucion: number, meses = 6) {
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)
    const ids = estudiantes.map(e => e.id_usuario)
    const hoy = new Date()
    const series: Record<Area, Array<{mes: string; promedio: number}>> = {
      Matematicas:[], Lenguaje:[], Ciencias:[], Sociales:[], Ingles:[]
    }
    if (ids.length === 0) return series

    for (let i = meses-1; i >= 0; i--) {
      const ref = new Date(hoy.getFullYear(), hoy.getMonth()-i, 1)
      const { inicio, fin } = rangoMes(ref)
      const ses = await Sesion.query()
        .whereIn('id_usuario', ids)
        .where('inicio_at','>=', inicio as any)
        .where('inicio_at','<', fin as any)

      for (const area of AREAS) {
        const filtro = ses.filter(x => (x as any).area === area && (x as any).puntaje_porcentaje != null)
        const avg = filtro.length ? Math.round(filtro.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0), 0)/filtro.length) : 0
        series[area].push({ mes: `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}`, promedio: avg })
      }
    }
    return series
  }

  // Rendimiento del mes por área: promedio del mes seleccionado
  async rendimientoDelMes(id_institucion: number, year: number, month1_12: number) {
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)
    const ids = estudiantes.map(e => e.id_usuario)
    const { inicio, fin } = rangoMes(new Date(year, month1_12-1, 1))
    const res: Record<Area, number> = { Matematicas:0, Lenguaje:0, Ciencias:0, Sociales:0, Ingles:0 }
    if (ids.length === 0) return res

    const ses = await Sesion.query()
      .whereIn('id_usuario', ids)
      .where('inicio_at','>=', inicio as any)
      .where('inicio_at','<', fin as any)

    for (const area of AREAS) {
      const filtro = ses.filter(x => (x as any).area === area && (x as any).puntaje_porcentaje != null)
      res[area] = filtro.length ? Math.round(filtro.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0), 0)/filtro.length) : 0
    }
    return res
  }
}
