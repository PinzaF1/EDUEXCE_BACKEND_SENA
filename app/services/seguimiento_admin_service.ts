// services/SeguimientoAdminService.ts (o .js si así lo usas)
import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

/** Áreas canónicas internas (siempre estas 5) */
type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
const AREAS: Area[] = ['Matematicas','Lenguaje','Ciencias','Sociales','Ingles']

/** Normalizadores reutilizables */
function norm(s: string) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Mapea cualquier variante del backend a un Area canónica.
 *  Soporta el typo "socilaes" y variantes largas como "sociales y ciudadanas".
 */
function mapArea(raw: string): Area | null {
  const n = norm(raw)
  if (!n) return null
  if (n.startsWith('matematic')) return 'Matematicas'
  if (n.startsWith('ingl'))      return 'Ingles'
  if (n.startsWith('cien'))      return 'Ciencias'
  // atrapa: sociales, socilaes, sociales y ciudadanas, etc.
  if (n.startsWith('soci') || n.includes('socilae')) return 'Sociales'
  if (n.includes('lect') || n.startsWith('lengua'))  return 'Lenguaje'
  return null
}

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
      .whereIn('id_usuario', ids)
      .where((q) => {
        q.where('fin_at', '>=', inicio as any).andWhere('fin_at','<',fin as any)
         .orWhere(q2 => q2.whereNull('fin_at').andWhere('inicio_at','>=',inicio as any).andWhere('inicio_at','<',fin as any))
      })

    const sesPrev = await Sesion.query()
      .whereIn('id_usuario', ids)
      .where((q) => {
        const inicioPrev = new Date(inicio.getFullYear(), inicio.getMonth()-1, 1)
        q.where('fin_at','>=',inicioPrev as any).andWhere('fin_at','<',inicio as any)
         .orWhere(q2 => q2.whereNull('fin_at').andWhere('inicio_at','>=',inicioPrev as any).andWhere('inicio_at','<',inicio as any))
      })

    const avgMes = sesMes.length ? Math.round(sesMes.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/sesMes.length) : 0
    const avgPrev = sesPrev.length ? Math.round(sesPrev.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/sesPrev.length) : 0
    const participando = new Set(sesMes.map(s => (s as any).id_usuario)).size

    return { promedio_actual: avgMes, mejora_mes: avgMes - avgPrev, estudiantes_participando: participando }
  }

  // 3b) Niveles críticos por área (porcentaje de estudiantes < umbral)
  async nivelesCriticosPorArea(
    id_institucion: number,
    { umbralPuntaje = 60, minPorcentaje = 60 } = {}
  ) {
    const { inicio, fin } = rangoMes(new Date())

    const estudiantes = await Usuario.query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .select(['id_usuario'])

    const ids = estudiantes.map((e) => e.id_usuario)
    const totalEst = ids.length
    if (!ids.length) return { areas: [] as any[] }

    const ses = await Sesion.query()
      .whereIn('id_usuario', ids)
      .where((q) => {
        q.where('fin_at', '>=', inicio as any)
          .andWhere('fin_at', '<', fin as any)
          .orWhere((q2) =>
            q2.whereNull('fin_at').andWhere('inicio_at', '>=', inicio as any).andWhere('inicio_at', '<', fin as any)
          )
      })
      .select(['id_usuario', 'area', 'subtema', 'nivel_orden', 'puntaje_porcentaje'])

    type NivelInfo = { nivel: number; subtema: string | null; con_dificultad: number; total: number; porcentaje: number }
    const porAreaNivel = new Map<Area, Map<number, { difUsers: Set<number>; subtemaCount: Map<string, number> }>>()

    for (const row of ses as any[]) {
      const area = mapArea(row.area)
      if (!area) continue
      const nivel = Number(row.nivel_orden ?? 0) || 0
      const uid = Number(row.id_usuario)
      const puntaje = Number(row.puntaje_porcentaje ?? 0)
      if (!porAreaNivel.has(area)) porAreaNivel.set(area, new Map())
      const m = porAreaNivel.get(area)!
      if (!m.has(nivel)) m.set(nivel, { difUsers: new Set<number>(), subtemaCount: new Map<string, number>() })
      const bucket = m.get(nivel)!
      const st = String(row.subtema ?? '').trim()
      if (st) bucket.subtemaCount.set(st, (bucket.subtemaCount.get(st) || 0) + 1)
      if (puntaje < umbralPuntaje) bucket.difUsers.add(uid)
    }

    const out: Array<{ area: Area; niveles_criticos: number; niveles: NivelInfo[] }> = []

    for (const area of AREAS) {
      const niveles = porAreaNivel.get(area) ?? new Map()
      const data: NivelInfo[] = []
      for (const [nivel, info] of niveles.entries()) {
        const conDif = info.difUsers.size
        const porcentaje = totalEst ? Math.round((conDif * 100) / totalEst) : 0
        const subtemaTop = Array.from(info.subtemaCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
        data.push({ nivel, subtema: subtemaTop, con_dificultad: conDif, total: totalEst, porcentaje })
      }
      // filtrar críticos (>= minPorcentaje)
      const criticos = data.filter((x) => x.porcentaje >= minPorcentaje)
      // ordenar por nivel asc
      criticos.sort((a, b) => a.nivel - b.nivel)
      out.push({ area, niveles_criticos: criticos.length, niveles: criticos })
    }

    return { areas: out }
  }
  // 2) Comparativo por cursos (mes actual) – promedio y progreso vs mes anterior
  async comparativoPorCursos(id_institucion: number) {
    const { inicio, fin } = rangoMes(new Date())
    const inicioPrev = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1)
    const finPrev = inicio

    const estudiantes = await Usuario.query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .select(['id_usuario', 'grado', 'curso'])

    const groups = new Map<string, number[]>() // label -> ids
    for (const e of estudiantes as any[]) {
      const g = String(e?.grado ?? '').trim()
      const c = String(e?.curso ?? '').trim()
      const label = g ? `${g}°${c || ''}` : (c || 'Sin curso')
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label)!.push(e.id_usuario)
    }

    const inPeriodo = (qb: any, ini: Date, finx: Date) => {
      qb.where((q: any) => {
        q.where('fin_at', '>=', ini as any).andWhere('fin_at', '<', finx as any)
         .orWhere((q2: any) => q2.whereNull('fin_at').andWhere('inicio_at','>=',ini as any).andWhere('inicio_at','<',finx as any))
      })
    }

    const wavg = (rows: any[]) => {
      const vals = rows.filter(r => r?.puntaje_porcentaje != null)
      if (!vals.length) return { avg: 0, n: 0 }
      let sum = 0, wsum = 0
      for (const s of vals) {
        const w = s?.tipo === 'simulacro' ? 2 : 1
        sum  += Number(s.puntaje_porcentaje || 0) * w
        wsum += w
      }
      return { avg: wsum ? Math.round(sum / wsum) : 0, n: vals.length }
    }

    const MIN_INTENTOS = 2
    const items: Array<{ curso: string; estudiantes: number; promedio: number; progreso_pct: number }> = []

    for (const [label, ids] of groups.entries()) {
      const mes = await Sesion.query().whereIn('id_usuario', ids).whereIn('tipo', ['practica','simulacro'] as any).where(q => inPeriodo(q, inicio, fin))
      const prev = await Sesion.query().whereIn('id_usuario', ids).whereIn('tipo', ['practica','simulacro'] as any).where(q => inPeriodo(q, inicioPrev, finPrev))

      const { avg: avgMes,  n: nMes  } = wavg(mes as any[])
      const { avg: avgPrev, n: nPrev } = wavg(prev as any[])

      let progreso_pct = 0
      if (nMes >= MIN_INTENTOS && nPrev >= MIN_INTENTOS) {
        const delta = avgMes - avgPrev
        progreso_pct = Math.max(-100, Math.min(100, delta))
      }

      items.push({ curso: label, estudiantes: ids.length, promedio: avgMes, progreso_pct })
    }

    const key = (s: string) => {
      const m = s.match(/^(\d+)[°º]?\s*([A-Za-zÁÉÍÓÚÑ-]+)?/i)
      return { grado: m ? parseInt(m[1], 10) : 0, seccion: m && m[2] ? m[2] : '' }
    }
    items.sort((a, b) => {
      const A = key(a.curso), B = key(b.curso)
      return A.grado !== B.grado ? A.grado - B.grado : A.seccion.localeCompare(B.seccion, 'es')
    })

    return items
  }

  // 3) Áreas que necesitan refuerzo (mejor intento por estudiante/área)
  async areasQueNecesitanRefuerzo(
    id_institucion: number,
    critUmbral = 60,
    atenUmbral = 30,
    umbralPuntaje = 60,
    minParticipantes = 5
  ) {
    const { inicio, fin } = rangoMes(new Date())
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)
    const ids = estudiantes.map(e => e.id_usuario)

    if (!ids.length) {
      return { areas: AREAS.map(area => ({ area, estado: 'Atención', porcentaje_bajo: 0, debajo_promedio: 0 })) }
    }

    const ses = await Sesion.query()
      .whereIn('id_usuario', ids)
      .where((q) => {
        q.where('fin_at','>=',inicio as any).andWhere('fin_at','<',fin as any)
         .orWhere(q2 => q2.whereNull('fin_at').andWhere('inicio_at','>=',inicio as any).andWhere('inicio_at','<',fin as any))
      })

    // Normalizamos Área AQUÍ (socilaes -> Sociales)
    const rows = (ses as any[]).filter(s => s?.puntaje_porcentaje != null && mapArea((s as any).area))

    const bestByStudentArea = new Map<string, { area: Area; uid: number; puntaje: number }>()
    for (const s of rows) {
      const areaMapped = mapArea((s as any).area)! // <- normalizado
      const uid = Number((s as any).id_usuario)
      const puntaje = Number((s as any).puntaje_porcentaje || 0)
      const key = `${areaMapped}#${uid}`
      const cur = bestByStudentArea.get(key)
      if (!cur || puntaje > cur.puntaje) bestByStudentArea.set(key, { area: areaMapped, uid, puntaje })
    }

    const byArea = new Map<Area, Array<{ uid: number; puntaje: number }>>()
    for (const v of bestByStudentArea.values()) {
      if (!byArea.has(v.area)) byArea.set(v.area, [])
      byArea.get(v.area)!.push({ uid: v.uid, puntaje: v.puntaje })
    }

    const res: Array<{ area: Area; estado: 'Crítico'|'Atención'|'Bueno'; porcentaje_bajo: number; debajo_promedio: number; nivel?: number | null; subtema?: string | null }> = []

    for (const area of AREAS) {
      const lista = byArea.get(area) ?? []

      if (!lista.length) {
        res.push({ area, estado: 'Atención', porcentaje_bajo: 0, debajo_promedio: 0 })
        continue
      }

      const participantes = lista.length
      const debajo = lista.filter(x => x.puntaje < umbralPuntaje).length
      const pct = Math.round((debajo * 100) / participantes)

      let estado: 'Crítico'|'Atención'|'Bueno'
      if (participantes < minParticipantes) {
        estado = pct >= atenUmbral ? 'Atención' : 'Bueno'
      } else {
        estado = pct >= critUmbral ? 'Crítico' : pct >= atenUmbral ? 'Atención' : 'Bueno'
      }

      // detectar nivel/subtema más frecuentes donde hay bajo puntaje
      const rowsAreaBajos = (rows as any[]).filter(
        (s) => mapArea((s as any).area) === area && Number((s as any).puntaje_porcentaje ?? 0) < umbralPuntaje
      )

      // nivel_orden más frecuente
      const nivelCount = new Map<number, number>()
      const subtemaCount = new Map<string, number>()
      for (const r of rowsAreaBajos) {
        const n = Number((r as any).nivel_orden ?? 0)
        if (Number.isFinite(n) && n > 0) nivelCount.set(n, (nivelCount.get(n) || 0) + 1)
        const st = String((r as any).subtema ?? '').trim()
        if (st) subtemaCount.set(st, (subtemaCount.get(st) || 0) + 1)
      }

      const nivelTop = Array.from(nivelCount.entries()).sort((a,b)=> b[1]-a[1])[0]?.[0] ?? null
      const subtemaTop = Array.from(subtemaCount.entries()).sort((a,b)=> b[1]-a[1])[0]?.[0] ?? null

      res.push({ area, estado, porcentaje_bajo: pct, debajo_promedio: debajo, nivel: nivelTop, subtema: subtemaTop })
    }

    res.sort((a, b) => b.porcentaje_bajo - a.porcentaje_bajo)
    return { areas: res }
  }

  // 4) Estudiantes que requieren atención (top N)
  async estudiantesQueRequierenAtencion(id_institucion: number, limite = 10) {
    const { inicio, fin } = rangoMes(new Date())
    const estudiantes = await Usuario.query().where('rol','estudiante').where('id_institucion', id_institucion)

    type Item = { nombre: string; curso: string|null; area_debil: Area; puntaje: number; id_usuario: number }
    const items: Item[] = []

    for (const e of estudiantes) {
      const ses = await Sesion.query()
        .where('id_usuario', e.id_usuario)
        .where((q) => {
          q.where('fin_at','>=',inicio as any).andWhere('fin_at','<',fin as any)
           .orWhere(q2 => q2.whereNull('fin_at').andWhere('inicio_at','>=',inicio as any).andWhere('inicio_at','<',fin as any))
        })
      if (!ses.length) continue

      let peor: { area: Area; avg: number } | null = null
      for (const area of AREAS) {
       
        const porArea = (ses as any[])
          .filter(s => mapArea((s as any).area) === area && (s as any).puntaje_porcentaje != null)

        if (!porArea.length) continue
        const avg = Math.round(porArea.reduce((a,b)=> a + ((b as any).puntaje_porcentaje||0),0)/porArea.length)
        if (!peor || avg < peor.avg) peor = { area, avg }
      }
      if (peor) {
        const nombreCompleto = `${(e as any).nombre || ''} ${(e as any).apellido || ''}`.trim() || 
                               (e as any).apellido || 
                               String((e as any).numero_documento)
        items.push({
          id_usuario: e.id_usuario,
          nombre: nombreCompleto,
          curso: (e as any).curso ?? null,
          area_debil: peor.area,
          puntaje: peor.avg,
        })
      }
    }

    return items.sort((a,b)=> a.puntaje - b.puntaje).slice(0, limite)
  }

// ✅ Reemplaza el mensual por este EN VIVO
async areasActivosEnVivo(id_institucion: number, ventanaMin = 10) {
  const ahora = new Date()
  const desde = new Date(ahora.getTime() - ventanaMin * 60 * 1000)

  const estudiantes = await Usuario.query()
    .where('rol','estudiante')
    .where('id_institucion', id_institucion)
    .select('id_usuario')

  const ids = estudiantes.map(e => e.id_usuario)
  if (!ids.length) return { islas: AREAS.map(a => ({ area: a, activos: 0 })) }

  // sesiones abiertas (activas) - cualquier sesión abierta se considera activa
  // Filtramos por ventana de tiempo más amplia (30 min) para evitar contar sesiones muy antiguas
  const ventanaAmplia = new Date(ahora.getTime() - 30 * 60 * 1000) // 30 minutos
  const sesAbiertas = await Sesion.query()
    .whereIn('id_usuario', ids)
    .whereNull('fin_at')
    .where(q => {
      // Incluir sesiones con actividad reciente O sesiones iniciadas recientemente
      q.where('updated_at', '>=', ventanaAmplia as any)
       .orWhere('created_at', '>=', ventanaAmplia as any)
       .orWhere('inicio_at', '>=', ventanaAmplia as any)
    })
    .orderBy('updated_at', 'desc')
    .select(['id_usuario','area','updated_at','created_at','inicio_at','id_sesion'] as any)

  // obtener solo la sesión MÁS RECIENTE por usuario (donde está practicando AHORA)
  // Ordenar por múltiples campos para asegurar que tomamos la más reciente
  const sesOrdenadas = (sesAbiertas as any[]).sort((a, b) => {
    // Primero por updated_at
    const upA = new Date(a.updated_at || 0).getTime()
    const upB = new Date(b.updated_at || 0).getTime()
    if (upA !== upB) return upB - upA
    
    // Luego por created_at
    const crA = new Date(a.created_at || 0).getTime()
    const crB = new Date(b.created_at || 0).getTime()
    if (crA !== crB) return crB - crA
    
    // Finalmente por inicio_at
    const inA = new Date(a.inicio_at || 0).getTime()
    const inB = new Date(b.inicio_at || 0).getTime()
    return inB - inA
  })
  
  const sesPorUsuario = new Map<number, any>()
  for (const s of sesOrdenadas) {
    const idUser = Number(s.id_usuario)
    if (!sesPorUsuario.has(idUser)) {
      sesPorUsuario.set(idUser, s)
    }
  }

  // contar por área (cada usuario cuenta solo una vez)
  const porArea = new Map<Area, number>()
  for (const s of sesPorUsuario.values()) {
    // Verificar que el área no sea null o undefined
    if (!s.area) continue
    const a = mapArea(String(s.area))
    if (!a) {
      // Debug: si no se mapea, podría ser un problema de normalización
      console.warn(`[areasActivosEnVivo] Área no reconocida: ${s.area}`)
      continue
    }
    porArea.set(a, (porArea.get(a) || 0) + 1)
  }

  const islas = AREAS.map(a => ({ area: a, activos: porArea.get(a) || 0 }))
  return { islas }
}


// 2) Rendimiento por área (mes actual)
async rendimientoPorArea(id_institucion: number) {
  const { inicio, fin } = rangoMes(new Date())

  const estudiantes = await Usuario.query()
    .where('rol','estudiante')
    .where('id_institucion', id_institucion)
    .select('id_usuario')

  const ids = estudiantes.map(e => e.id_usuario)
  if (!ids.length) return { items: AREAS.map(a => ({ area: a, promedio: 0 })) }

  const ses = await Sesion.query()
    .whereIn('id_usuario', ids)
    .where((q) => {
      q.where('fin_at','>=',inicio as any).andWhere('fin_at','<',fin as any)
       .orWhere(q2 => q2.whereNull('fin_at').andWhere('inicio_at','>=',inicio as any).andWhere('inicio_at','<',fin as any))
    })
    .select(['area','puntaje_porcentaje'])

  const sum = new Map<Area, { s: number; n: number }>()
  for (const s of ses as any[]) {
    const a = mapArea(s.area)
    const p = Number(s.puntaje_porcentaje ?? 0)
    if (!a || isNaN(p)) continue
    if (!sum.has(a)) sum.set(a, { s: 0, n: 0 })
    const cur = sum.get(a)!; cur.s += p; cur.n += 1
  }

  const items = AREAS.map(a => {
    const cur = sum.get(a)
    const promedio = cur && cur.n ? Math.round(cur.s / cur.n) : 0
    return { area: a, promedio }
  })

  return { items }
}

// 3) Serie: Progreso por área (últimos N meses)
async seriesProgresoPorArea(id_institucion: number, meses = 6) {
  const hoy = new Date()

  const estudiantes = await Usuario.query()
    .where('rol','estudiante')
    .where('id_institucion', id_institucion)
    .select('id_usuario')

  const ids = estudiantes.map(e => e.id_usuario)
  if (!ids.length) return { series: [] }

  const out: Array<{ mes: string; area: Area; promedio: number }> = []

  for (let i = meses - 1; i >= 0; i--) {
    const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const { inicio, fin } = rangoMes(ref)

    const ses = await Sesion.query()
      .whereIn('id_usuario', ids)
      .where((q) => {
        q.where('fin_at','>=',inicio as any).andWhere('fin_at','<',fin as any)
         .orWhere(q2 => q2.whereNull('fin_at').andWhere('inicio_at','>=',inicio as any).andWhere('inicio_at','<',fin as any))
      })
      .select(['area','puntaje_porcentaje'])

    const sum = new Map<Area, { s: number; n: number }>()
    for (const s of ses as any[]) {
      const a = mapArea(s.area)
      const p = Number(s.puntaje_porcentaje ?? 0)
      if (!a || isNaN(p)) continue
      if (!sum.has(a)) sum.set(a, { s: 0, n: 0 })
      const cur = sum.get(a)!; cur.s += p; cur.n += 1
    }

    const labelMes = `${inicio.getFullYear()}-${String(inicio.getMonth()+1).padStart(2,'0')}`
    for (const a of AREAS) {
      const cur = sum.get(a)
      const promedio = cur && cur.n ? Math.round(cur.s / cur.n) : 0
      out.push({ mes: labelMes, area: a, promedio })
    }
  }

  return { series: out }
}

}
