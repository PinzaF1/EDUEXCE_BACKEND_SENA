import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

export type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles']

function rangoMes(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
  return { inicio, fin }
}

function cursoLabel(u: any) {
  // ajusta nombres si tu modelo usa otros campos
  const grado = (u?.grado ?? u?.grado_nombre ?? '').toString().trim()
  const grupo = (u?.grupo ?? u?.seccion ?? '').toString().trim()
  const curso = (u?.curso ?? '').toString().trim()
  if (grado && grupo) return `${grado}°${grupo}`
  if (curso) return curso
  return grado || 'Sin curso'
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

  /** Query base de sesiones del periodo (solo practica/simulacro) */
  private baseSesionesPeriodo(ids: number[], inicio: Date, fin: Date) {
    return Sesion.query()
      .whereIn('id_usuario', ids)
      .whereIn('tipo', ['practica', 'simulacro'] as any)
      .where((qb) => {
        qb.where('fin_at', '>=', inicio as any).andWhere('fin_at', '<', fin as any)
          .orWhere((q2) => {
            q2.whereNull('fin_at')
              .andWhere('inicio_at', '>=', inicio as any)
              .andWhere('inicio_at', '<', fin as any)
          })
      })
      .select(['id_usuario', 'area', 'puntaje_porcentaje', 'inicio_at', 'fin_at'])
  }

  /** Tarjetas: # de estudiantes que practicaron por área en el mes actual */
  async tarjetasPorArea(id_institucion: number) {
    const ids = await this.idsEstudiantes(id_institucion)
    const { inicio, fin } = rangoMes(new Date())
    const tarjetas: Record<Area, number> = {
      Matematicas: 0, Lenguaje: 0, Ciencias: 0, Sociales: 0, Ingles: 0,
    }
    if (ids.length === 0) return tarjetas

    const ses = await this.baseSesionesPeriodo(ids, inicio, fin)
    for (const area of AREAS) {
      const unicos = new Set(
        (await ses).filter(s => (s as any).area === area).map(s => (s as any).id_usuario)
      )
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

      const ses = await this.baseSesionesPeriodo(ids, inicio, fin)

      for (const area of AREAS) {
        const filtro = (ses as any[]).filter(
          (x) => (x as any).area === area && (x as any).puntaje_porcentaje != null
        )
        const avg = filtro.length
          ? Math.round(
              filtro.reduce((a, b) => a + Number((b as any).puntaje_porcentaje || 0), 0) / filtro.length
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

    const ses = await this.baseSesionesPeriodo(ids, inicio, fin)

    for (const area of AREAS) {
      const filtro = (ses as any[]).filter(
        (x) => (x as any).area === area && (x as any).puntaje_porcentaje != null
      )
      res[area] = filtro.length
        ? Math.round(
            filtro.reduce((a, b) => a + Number((b as any).puntaje_porcentaje || 0), 0) / filtro.length
          )
        : 0
    }
    return res
  }

  /** ====== NUEVO: KPIs superiores ====== */
  async kpisResumen(id_institucion: number, fechaRef = new Date()) {
    const ids = await this.idsEstudiantes(id_institucion)
    if (!ids.length) return { promedioActual: 0, mejoraEsteMes: 0, estudiantesParticipando: 0 }

    // mes actual y mes anterior
    const { inicio: iniAct, fin: finAct } = rangoMes(fechaRef)
    const { inicio: iniAnt, fin: finAnt } = rangoMes(new Date(fechaRef.getFullYear(), fechaRef.getMonth() - 1, 1))

    const sesAct = await this.baseSesionesPeriodo(ids, iniAct, finAct)
    const sesAnt = await this.baseSesionesPeriodo(ids, iniAnt, finAnt)

    const prom = (lista: any[]) => {
      const v = lista.filter(x => (x as any).puntaje_porcentaje != null).map(x => Number((x as any).puntaje_porcentaje))
      return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : 0
    }

    const promedioActual = prom(sesAct as any)
    const promedioAnterior = prom(sesAnt as any)

    const estudiantesParticipando = new Set((sesAct as any[]).map(s => (s as any).id_usuario)).size
    const mejoraEsteMes = promedioActual - promedioAnterior

    return { promedioActual, mejoraEsteMes, estudiantesParticipando }
  }

  /** ====== NUEVO: Comparativo por cursos ====== */
  async comparativoPorCursos(id_institucion: number, fechaRef = new Date()) {
    const ids = await this.idsEstudiantes(id_institucion)
    if (!ids.length) return { items: [] as any[] }

    const { inicio: iniAct, fin: finAct } = rangoMes(fechaRef)
    const { inicio: iniAnt, fin: finAnt } = rangoMes(new Date(fechaRef.getFullYear(), fechaRef.getMonth() - 1, 1))

    // traemos estudiantes con su curso
    const estudiantes = await Usuario
      .query()
      .whereIn('id_usuario', ids)
      .select(['id_usuario', 'grado', 'grupo', 'curso'])

    // sesiones del mes actual y anterior
    const sesAct = await this.baseSesionesPeriodo(ids, iniAct, finAct)
    const sesAnt = await this.baseSesionesPeriodo(ids, iniAnt, finAnt)

    // agrupación por curso
    const byCurso = (ses: any[]) => {
      const map = new Map<string, any[]>()
      for (const s of ses) {
        const u = estudiantes.find(e => (e as any).id_usuario === (s as any).id_usuario)
        const key = cursoLabel(u)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(s)
      }
      return map
    }

    const act = byCurso(sesAct as any)
    const ant = byCurso(sesAnt as any)

    const items: Array<{ curso: string; estudiantes: number; promedio: number; progreso: number }> = []

    // todos los cursos presentes en cualquiera de los 2 periodos
    const cursos = new Set<string>([...act.keys(), ...ant.keys(), ...estudiantes.map(u => cursoLabel(u))])

    for (const c of cursos) {
      const sesA = act.get(c) ?? []
      const sesB = ant.get(c) ?? []

      const estudiantesCurso = new Set(
        (estudiantes as any[]).filter(u => cursoLabel(u) === c).map(u => (u as any).id_usuario)
      ).size

      const prom = (lista: any[]) => {
        const v = lista.filter(x => (x as any).puntaje_porcentaje != null).map(x => Number((x as any).puntaje_porcentaje))
        return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : 0
      }

      const promedio = prom(sesA)
      const promedioAnt = prom(sesB)
      const progreso = promedio - promedioAnt

      items.push({ curso: c, estudiantes: estudiantesCurso, promedio, progreso })
    }

    // ordena por curso asc
    items.sort((a,b)=> a.curso.localeCompare(b.curso, 'es'))

    return { items }
  }

  /** ====== NUEVO: Áreas que necesitan refuerzo ====== */
  async areasRefuerzo(id_institucion: number, umbral = 60, fechaRef = new Date()) {
    const ids = await this.idsEstudiantes(id_institucion)
    if (!ids.length) return { areas: [] as Array<{ area: Area; promedio: number }> }

    const { inicio, fin } = rangoMes(fechaRef)
    const ses = await this.baseSesionesPeriodo(ids, inicio, fin)

    const res: Array<{ area: Area; promedio: number }> = []
    for (const area of AREAS) {
      const filtro = (ses as any[]).filter(x => (x as any).area === area && (x as any).puntaje_porcentaje != null)
      const prom = filtro.length
        ? Math.round(filtro.reduce((a,b)=> a + Number((b as any).puntaje_porcentaje || 0), 0) / filtro.length)
        : 0
      if (prom < umbral) res.push({ area, promedio: prom })
    }
    // orden asc por promedio
    res.sort((a,b)=> a.promedio - b.promedio)
    return { areas: res }
  }

  /** ====== NUEVO: Estudiantes que requieren atención ====== */
  async estudiantesAlerta(
    id_institucion: number,
    { umbral = 50, min_intentos = 2 } = {},
    fechaRef = new Date()
  ) {
    const ids = await this.idsEstudiantes(id_institucion)
    if (!ids.length) return { items: [] as Array<{ id_usuario: number; nombre: string; curso: string; promedio: number; intentos: number }> }

    const { inicio, fin } = rangoMes(fechaRef)
    const ses = await this.baseSesionesPeriodo(ids, inicio, fin)

    // agrupar por usuario
    const porUsuario = new Map<number, any[]>()
    for (const s of (ses as any[])) {
      const uid = Number((s as any).id_usuario)
      if (!porUsuario.has(uid)) porUsuario.set(uid, [])
      porUsuario.get(uid)!.push(s)
    }

    const usuarios = await Usuario
      .query()
      .whereIn('id_usuario', Array.from(porUsuario.keys()))
      .select(['id_usuario','nombre','apellido','grado','grupo','curso'])

    const items: Array<{ id_usuario: number; nombre: string; curso: string; promedio: number; intentos: number }> = []

    for (const [uid, lista] of porUsuario.entries()) {
      const v = (lista as any[]).filter(x => (x as any).puntaje_porcentaje != null)
      const intentos = v.length
      const promedio = intentos
        ? Math.round(v.reduce((a,b)=> a + Number((b as any).puntaje_porcentaje || 0), 0) / intentos)
        : 0

      if (intentos >= min_intentos && promedio < umbral) {
        const u = usuarios.find(x => (x as any).id_usuario === uid)
        const nombre = u ? `${(u as any).nombre ?? ''} ${(u as any).apellido ?? ''}`.trim() : `ID ${uid}`
        const curso = u ? cursoLabel(u) : 'Sin curso'
        items.push({ id_usuario: uid, nombre, curso, promedio, intentos })
      }
    }

    // orden por peor promedio primero
    items.sort((a,b)=> a.promedio - b.promedio)
    return { items }
  }

  /** === MÉTODO QUE USA EL CONTROLADOR PARA PINTAR TODO RÁPIDO (opcional) === */
  async resumen(id_institucion: number) {
    const ahora = new Date()
    const tarjetas = await this.tarjetasPorArea(id_institucion)
    const series = await this.progresoMensualPorArea(id_institucion, 6)
    const rendMes = await this.rendimientoDelMes( id_institucion, ahora.getFullYear(), ahora.getMonth() + 1 )
    const kpis = await this.kpisResumen(id_institucion, ahora)

    const islas = AREAS.map((area) => ({ area, activos: tarjetas[area] || 0 }))
    const serie = AREAS.flatMap((area) =>
      (series[area] || []).map((p) => ({ mes: p.mes, area, valor: p.promedio }))
    )
    const rend = AREAS.map((area) => ({ area, promedio: rendMes[area] || 0 }))

    return { kpis, islas, serie, rend }
  }
}
