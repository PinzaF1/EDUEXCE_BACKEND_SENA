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
  // 2) Comparativo por cursos (mes actual): promedio y progreso (delta de puntos) vs mes anterior
async comparativoPorCursos(id_institucion: number) {
  const { inicio, fin } = rangoMes(new Date())
  const inicioPrev = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1)
  const finPrev = inicio

  // Trae estudiantes (no existe 'grupo' en tu esquema)
  const estudiantes = await Usuario.query()
    .where('rol', 'estudiante')
    .where('id_institucion', id_institucion)
    .select(['id_usuario', 'grado', 'curso'])

  // Agrupa por etiqueta "grado°curso" (p. ej. "10°A")
  const groups = new Map<string, number[]>() // label -> ids
  for (const e of estudiantes as any[]) {
    const g = String(e?.grado ?? '').trim()
    const c = String(e?.curso ?? '').trim()
    const label = g ? `${g}°${c || ''}` : (c || 'Sin curso')
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(e.id_usuario)
  }

  // Helper de periodo: fin_at dentro del rango, o si está en curso (fin_at NULL) que inicio_at caiga en el rango
  const inPeriodo = (qb: any, ini: Date, finx: Date) => {
    qb.where('fin_at', '>=', ini as any).andWhere('fin_at', '<', finx as any)
      .orWhere((q2: any) => {
        q2.whereNull('fin_at')
          .andWhere('inicio_at', '>=', ini as any)
          .andWhere('inicio_at', '<',  finx as any)
      })
  }

  // Promedio ponderado por tipo de sesión (simulacro=2, práctica=1)
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
    // Mes actual
    const mes = await Sesion.query()
      .whereIn('id_usuario', ids)
      .whereIn('tipo', ['practica', 'simulacro'] as any) // usa tus tipos reales
      .where(q => inPeriodo(q, inicio, fin))

    // Mes anterior
    const prev = await Sesion.query()
      .whereIn('id_usuario', ids)
      .whereIn('tipo', ['practica', 'simulacro'] as any)
      .where(q => inPeriodo(q, inicioPrev, finPrev))

    const { avg: avgMes,  n: nMes  } = wavg(mes as any[])
    const { avg: avgPrev, n: nPrev } = wavg(prev as any[])

    // Progreso como delta de puntos (acotado), solo si hay muestra mínima en ambos meses
    let progreso_pct = 0
    if (nMes >= MIN_INTENTOS && nPrev >= MIN_INTENTOS) {
      const delta = avgMes - avgPrev
      progreso_pct = Math.max(-100, Math.min(100, delta))
    }

    items.push({
      curso: label,
      estudiantes: ids.length,
      promedio: avgMes,       // siempre número
      progreso_pct,           // delta en puntos (tu controller lo puede mapear a 'progreso')
    })
  }

  // Ordenar por grado numérico y después por letra
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


  // 3) Áreas que necesitan refuerzo (mes actual) – por estudiante (mejor intento del mes)
async areasQueNecesitanRefuerzo(
  id_institucion: number,
  critUmbral = 60,        // % para estado "Crítico"
  atenUmbral = 30,        // % para estado "Atención"
  umbralPuntaje = 60,     // puntaje (0-100) bajo el cual un estudiante se considera "bajo"
  minParticipantes = 5    // si en el área hay menos de esto, no marcamos "Crítico"
) {
  const { inicio, fin } = rangoMes(new Date())

  // Normalizador: sin tildes, minúsculas
  const normalize = (s: string) =>
    String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()

  // Mapea nombres libres de DB → tus 5 áreas fijas
  const mapArea = (raw: string): Area | null => {
    const n = normalize(raw)
    if (n.startsWith('matematic')) return 'Matematicas'
    if (n.startsWith('ingl'))      return 'Ingles'
    if (n.includes('ciencias'))    return 'Ciencias'
    if (n.startsWith('social'))    return 'Sociales'
    if (n.includes('lect') || n.startsWith('lengua')) return 'Lenguaje'
    return null
  }

  // Estudiantes de la institución
  const estudiantes = await Usuario.query()
    .where('rol', 'estudiante')
    .where('id_institucion', id_institucion)

  const ids = estudiantes.map(e => e.id_usuario)
  if (!ids.length) {
    return { areas: AREAS.map(area => ({ area, estado: 'Atención', porcentaje_bajo: 0, debajo_promedio: 0 })) }
  }

  // Sesiones del mes: terminadas en el mes o en curso iniciadas en el mes
  const ses = await Sesion.query()
    .whereIn('id_usuario', ids)
    .where(q => {
      q.where('fin_at', '>=', inicio as any).andWhere('fin_at', '<', fin as any)
       .orWhere(q2 => {
         q2.whereNull('fin_at')
           .andWhere('inicio_at', '>=', inicio as any)
           .andWhere('inicio_at', '<',  fin   as any)
       })
    })

  // Solo con puntaje válido y área reconocible
  const rows = (ses as any[]).filter(s => s?.puntaje_porcentaje != null && mapArea((s as any).area))

  // Tomar **el MEJOR** intento por (estudiante, área) en el mes
  // clave = `${areaMapped}#${id_usuario}`
  const bestByStudentArea = new Map<string, { area: Area; uid: number; puntaje: number }>()
  for (const s of rows) {
    const areaMapped = mapArea((s as any).area)!
    const uid = Number((s as any).id_usuario)
    const puntaje = Number((s as any).puntaje_porcentaje || 0)
    const key = `${areaMapped}#${uid}`
    const cur = bestByStudentArea.get(key)
    if (!cur || puntaje > cur.puntaje) {
      bestByStudentArea.set(key, { area: areaMapped, uid, puntaje })
    }
  }

  // Agrupar por área (estudiantes únicos)
  const byArea = new Map<Area, Array<{ uid: number; puntaje: number }>>()
  for (const v of bestByStudentArea.values()) {
    if (!byArea.has(v.area)) byArea.set(v.area, [])
    byArea.get(v.area)!.push({ uid: v.uid, puntaje: v.puntaje })
  }

  const res: Array<{ area: Area; estado: 'Crítico'|'Atención'|'Bueno'; porcentaje_bajo: number; debajo_promedio: number }> = []

  for (const area of AREAS) {
    const lista = byArea.get(area) ?? []

    if (!lista.length) {
      // Sin evidencia en el mes para esta área → no alarmar en rojo
      res.push({ area, estado: 'Atención', porcentaje_bajo: 0, debajo_promedio: 0 })
      continue
    }

    const participantes = lista.length
    const debajo = lista.filter(x => x.puntaje < umbralPuntaje).length
    const pct = Math.round((debajo * 100) / participantes)

    // Si hay pocos participantes, no marcamos "Crítico" aunque el % sea alto
    let estado: 'Crítico'|'Atención'|'Bueno'
    if (participantes < minParticipantes) {
      estado = pct >= atenUmbral ? 'Atención' : 'Bueno'
    } else {
      estado = pct >= critUmbral ? 'Crítico' : pct >= atenUmbral ? 'Atención' : 'Bueno'
    }

    res.push({ area, estado, porcentaje_bajo: pct, debajo_promedio: debajo })
  }

  // Orden de peor a mejor
  res.sort((a, b) => b.porcentaje_bajo - a.porcentaje_bajo)
  return { areas: res }
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
