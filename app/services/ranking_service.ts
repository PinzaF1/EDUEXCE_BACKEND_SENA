import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

export default class RankingService {
  // ranking global de la institución (últimos 30 días)
  async rankingInstitucion(id_institucion: number, id_usuario?: number) {
    const desde = new Date(Date.now() - 30*24*3600*1000)
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)

    const filas: Array<{id_usuario: number; nombre: string; promedio: number}> = []
    for (const e of estudiantes) {
      const ses = await Sesion.query().where('id_usuario', e.id_usuario).where('inicio_at','>=', desde as any)
      if (!ses.length) continue
      const avg = Math.round(ses.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/ses.length)
      filas.push({ id_usuario: e.id_usuario, nombre: (e as any).apellido || String((e as any).numero_documento), promedio: avg })
    }

    const orden = filas.sort((a,b)=> b.promedio - a.promedio)
    const top5 = orden.slice(0,5)
    const pos = id_usuario ? (orden.findIndex(x => x.id_usuario === id_usuario) + 1 || null) : null

    return { top5, posicion: pos, total: orden.length }
  }

  // ranking por curso (últimos 30 días)
  async rankingCurso(id_institucion: number, curso: string, id_usuario?: number) {
    const desde = new Date(Date.now() - 30*24*3600*1000)
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion).where('curso', curso)

    const filas: Array<{id_usuario: number; nombre: string; promedio: number}> = []
    for (const e of estudiantes) {
      const ses = await Sesion.query().where('id_usuario', e.id_usuario).where('inicio_at','>=', desde as any)
      if (!ses.length) continue
      const avg = Math.round(ses.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/ses.length)
      filas.push({ id_usuario: e.id_usuario, nombre: (e as any).apellido || String((e as any).numero_documento), promedio: avg })
    }

    const orden = filas.sort((a,b)=> b.promedio - a.promedio)
    const top5 = orden.slice(0,5)
    const pos = id_usuario ? (orden.findIndex(x => x.id_usuario === id_usuario) + 1 || null) : null

    return { top5, posicion: pos, total: orden.length }
  }
}
