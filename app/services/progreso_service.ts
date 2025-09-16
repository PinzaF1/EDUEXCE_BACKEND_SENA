import Sesion from '../models/sesione.js'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
const AREAS: Area[] = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles']

export default class ProgresoService {
  async resumenEstudiante(id_usuario: number) {
    const ses = await Sesion.query().where('id_usuario', id_usuario)
    if (!ses.length) return { porcentaje_global: 0, por_area: {}, simulacros: [], niveles: [] }

    const por_area: Record<Area, number> = { Matematicas:0, Lenguaje:0, Ciencias:0, Sociales:0, Ingles:0 }
    for (const a of AREAS) {
      const s = ses.filter(x => (x as any).area === a && (x as any).puntaje_porcentaje != null)
      por_area[a] = s.length ? Math.round(s.reduce((acc,b)=> acc + ((b as any).puntaje_porcentaje||0),0)/s.length) : 0
    }
    const global = Math.round(Object.values(por_area).reduce((a,b)=> a+b, 0)/AREAS.length)

    const simulacros = ses.filter(x => (x as any).tipo === 'simulacro').map(x => ({
      id_sesion: x.id_sesion,
      area: (x as any).area,
      puntaje: (x as any).puntaje_porcentaje || 0,
      fecha: (x as any).fin_at || (x as any).inicio_at,
    }))

    // Línea de niveles (orden ascendente por nivel_orden)
    const niveles = ses
      .filter(x => (x as any).nivel_orden != null)
      .sort((a,b)=> ((a as any).nivel_orden||0) - ((b as any).nivel_orden||0))
      .map(x => ({ area: (x as any).area, nivel: (x as any).nivel_orden }))

    return { porcentaje_global: global, por_area, simulacros, niveles }
  }
}
