import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
const AREAS: Area[] = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles']

function rangoMes(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
  return { inicio, fin }
}

export default class SeguimientoAdminService {
  // 1) Resumen general
  async resumenGeneral(id_institucion: number) {
    const { inicio, fin } = rangoMes(new Date())
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)
    const ids = estudiantes.map((e) => e.id_usuario)

    if (ids.length === 0) return { promedio_actual: 0, mejora_mes: 0, estudiantes_participando: 0 }

    const sesMes = await Sesion.query()
      .whereIn('id_usuario', ids).where('inicio_at','>=', inicio as any).where('inicio_at','<', fin as any)

    const sesPrev = await Sesion.query()
      .whereIn('id_usuario', ids).where('inicio_at','>=', new Date(inicio.getFullYear(), inicio.getMonth()-1, 1) as any)
      .where('inicio_at','<', inicio as any)

    const avgMes = sesMes.length ? Math.round(sesMes.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/sesMes.length) : 0
    const avgPrev = sesPrev.length ? Math.round(sesPrev.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/sesPrev.length) : 0
    const participando = new Set(sesMes.map(s => (s as any).id_usuario)).size

    return { promedio_actual: avgMes, mejora_mes: avgMes - avgPrev, estudiantes_participando: participando }
  }

  // 2) Comparativo por cursos (mes actual): promedio y progreso % vs mes anterior
  async comparativoPorCursos(id_institucion: number) {
    const { inicio, fin } = rangoMes(new Date())
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)

    const cursos = [...new Set(estudiantes.map((e) => (e as any).curso).filter(Boolean))]
    const out: Array<{curso: string; estudiantes: number; promedio: number; progreso_pct: number}> = []

    for (const curso of cursos) {
      const ids = estudiantes.filter(e => (e as any).curso === curso).map(e => e.id_usuario)
      const mes = await Sesion.query().whereIn('id_usuario', ids).where('inicio_at','>=',inicio as any).where('inicio_at','<',fin as any)
      const prev = await Sesion.query().whereIn('id_usuario', ids)
        .where('inicio_at','>=', new Date(inicio.getFullYear(), inicio.getMonth()-1, 1) as any)
        .where('inicio_at','<', inicio as any)

      const avgMes = mes.length ? Math.round(mes.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/mes.length) : 0
      const avgPrev = prev.length ? Math.round(prev.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/prev.length) : 0
      const progreso_pct = avgPrev ? Math.round(((avgMes - avgPrev) / Math.max(1, avgPrev)) * 100) : (avgMes ? 100 : 0)

      out.push({ curso: String(curso), estudiantes: ids.length, promedio: avgMes, progreso_pct })
    }
    return out.sort((a,b)=> b.promedio - a.promedio)
  }

  // 3) Áreas que necesitan refuerzo (mes actual)
  async areasQueNecesitanRefuerzo(id_institucion: number) {
    const { inicio, fin } = rangoMes(new Date())
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)
    const ids = estudiantes.map(e => e.id_usuario)
    const ses = await Sesion.query().whereIn('id_usuario', ids).where('inicio_at','>=',inicio as any).where('inicio_at','<',fin as any)

    const promedioGeneral = ses.length ? Math.round(ses.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/ses.length) : 0

    const res: Array<{area: Area; estado: 'Crítico'|'Atención'|'Bueno'; porcentaje_bajo: number; debajo_promedio: number}> = []

    for (const area of AREAS) {
      const porArea = ses.filter(s => (s as any).area === area && (s as any).puntaje_porcentaje != null)
      if (!porArea.length) {
        res.push({ area, estado: 'Crítico', porcentaje_bajo: 100, debajo_promedio: 0 })
        continue
      }
      const debajo = porArea.filter(s => ((s as any).puntaje_porcentaje||0) < promedioGeneral).length
      const pct = Math.round((debajo * 100) / porArea.length)
      const estado = pct >= 60 ? 'Crítico' : pct >= 30 ? 'Atención' : 'Bueno'
      res.push({ area, estado, porcentaje_bajo: pct, debajo_promedio: debajo })
    }
    return res
  }

  // 4) Estudiantes que requieren atención (top N más bajos este mes)
  async estudiantesQueRequierenAtencion(id_institucion: number, limite = 10) {
    const { inicio, fin } = rangoMes(new Date())
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)

    type Item = { nombre: string; curso: string|null; area_debil: Area; puntaje: number; id_usuario: number }
    const items: Item[] = []

    for (const e of estudiantes) {
      const ses = await Sesion.query()
        .where('id_usuario', e.id_usuario)
        .where('inicio_at','>=',inicio as any).where('inicio_at','<',fin as any)
      if (!ses.length) continue

      // área más débil = promedio más bajo por área
      let peor: { area: Area; avg: number } | null = null
      for (const area of AREAS) {
        const porArea = ses.filter(s => (s as any).area === area && (s as any).puntaje_porcentaje != null)
        if (!porArea.length) continue
        const avg = Math.round(porArea.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/porArea.length)
        if (!peor || avg < peor.avg) peor = { area, avg }
      }
      if (peor) {
        items.push({
          id_usuario: e.id_usuario,
          nombre: (e as any).apellido || String((e as any).numero_documento),
          curso: (e as any).curso ?? null,
          area_debil: peor.area,
          puntaje: peor.avg,
        })
      }
    }

    return items.sort((a,b)=> a.puntaje - b.puntaje).slice(0, limite)
  }
}
