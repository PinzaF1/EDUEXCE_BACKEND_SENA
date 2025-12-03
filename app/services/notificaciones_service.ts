// app/services/notificaciones_service.ts
import Notificacion from '../models/notificacione.js'
import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles'] as const

// Parámetros por HU
const UMBRAL_PUNTAJE_BAJO = 40      // EP-06 HU-02
const DIAS_INACTIVIDAD = 30         // EP-06 HU-01
const PROGRESO_LENTO_DELTA = -5     // EP-06 HU-03

function rangoMes(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
  return { inicio, fin }
}

/** helper: período (fin_at en rango) OR (fin_at NULL y inicio_at en rango) */
function wherePeriodo(qb: any, inicio: Date, fin: Date) {
  qb.where((q1: any) => {
    q1.where('fin_at', '>=', inicio as any).andWhere('fin_at', '<', fin as any)
  }).orWhere((q2: any) => {
    q2.whereNull('fin_at')
      .andWhere('inicio_at', '>=', inicio as any)
      .andWhere('inicio_at', '<', fin as any)
  })
}

/** helper: evita duplicados del mismo MES (mismo tipo + destino + “clave” en payload) */
async function yaExisteEnElMes(
  id_institucion: number,
  tipo: string,
  inicio: Date,
  fin: Date,
  {
    id_usuario_destino,
    clavePayload,
    valorClave,
  }: { id_usuario_destino?: number | null; clavePayload?: string; valorClave?: string | number | null } = {}
) {
  let q = Notificacion
    .query()
    .where('id_institucion', id_institucion)
    .andWhere('tipo', tipo)
    .where((qb: any) => qb.where('created_at', '>=', inicio as any).andWhere('created_at', '<', fin as any))
    .orderBy('created_at', 'desc')
    .limit(10) // pequeño límite para inspección

  if (id_usuario_destino === null) q = q.whereNull('id_usuario_destino')
  else if (typeof id_usuario_destino === 'number') q = q.andWhere('id_usuario_destino', id_usuario_destino)

  const rows = await q

  if (!rows.length) return false
  if (!clavePayload) return rows.length > 0

  // validamos por coincidencia de payload[clavePayload]
  for (const n of rows as any[]) {
    const v = n?.payload ? n.payload[clavePayload] : undefined
    if (String(v ?? '') === String(valorClave ?? '')) return true
  }
  return false
}

export default class NotificacionesService {
  // ===== Listado / marcado =====
  async listar(
    id_institucion: number,
    opciones: {
      tipo?: string
      leida?: boolean | null
      incluir_eliminadas?: boolean
      page?: number
      limit?: number
      desde?: string // fecha ISO
      hasta?: string // fecha ISO
    } = {}
  ) {
    const {
      tipo,
      leida,
      incluir_eliminadas = false,
      page = 1,
      limit = 50,
      desde,
      hasta,
    } = opciones

    // Validar y sanitizar
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(10, Number(limit) || 50)) // entre 10 y 100
    const offset = (pageNum - 1) * limitNum

    // Query base
    const baseQuery = Notificacion.query().where('id_institucion', id_institucion)

    // Filtros
    if (tipo) baseQuery.andWhere('tipo', tipo)
    if (typeof leida === 'boolean') baseQuery.andWhere('leida', leida)
    if (!incluir_eliminadas) baseQuery.andWhere('eliminada', false)
    if (desde) baseQuery.andWhere('created_at', '>=', new Date(desde) as any)
    if (hasta) baseQuery.andWhere('created_at', '<=', new Date(hasta) as any)

    // Total count (para paginación)
    const [{ count: total }] = await baseQuery.clone().count('* as count')

    // Obtener datos paginados
    const rows = await baseQuery
      .orderBy('created_at', 'desc')
      .limit(limitNum)
      .offset(offset)

    const notificaciones = rows.map((n: any) => ({
      id: n.id_notificacion,
      id_institucion: n.id_institucion,
      id_usuario_destino: n.id_usuario_destino ?? null,
      tipo: n.tipo ?? '',
      titulo: n.payload?.titulo ?? '',
      detalle: n.payload?.detalle ?? '',
      payload: n.payload ?? null,
      leida: !!n.leida,
      eliminada: !!n.eliminada,
      createdAt: n.createdAt ?? n.created_at ?? null,
      created_at: n.created_at ?? n.createdAt ?? null, // Alias
    }))

    return {
      notificaciones,
      paginacion: {
        page: pageNum,
        limit: limitNum,
        total: Number(total) || 0,
        totalPages: Math.ceil((Number(total) || 0) / limitNum),
        hasNextPage: pageNum * limitNum < (Number(total) || 0),
        hasPrevPage: pageNum > 1,
      },
    }
  }

  async marcarLeidas(ids: number[]) {
    if (!ids || !Array.isArray(ids) || !ids.length) return 0
    const validIds = ids.map((i: any) => Number(i)).filter((n: number) => Number.isFinite(n) && !Number.isNaN(n)).map((n: number) => Math.trunc(n))
    if (!validIds.length) return 0
    const affected = await Notificacion.query().whereIn('id_notificacion', validIds).update({ leida: true })
    return affected
  }

  /** Eliminar notificación individual (soft delete) */
  async eliminarUna(id_notificacion: number, id_institucion: number, id_usuario_admin: number) {
    const notificacion = await Notificacion
      .query()
      .where('id_notificacion', id_notificacion)
      .where('id_institucion', id_institucion)
      .first()

    if (!notificacion) {
      throw new Error('Notificación no encontrada')
    }

    // validar que el actor (usuario que elimina) exista en la tabla usuarios
    let actor: number | null = Number(id_usuario_admin)
    if (!Number.isFinite(actor) || Number.isNaN(actor)) actor = null
    else {
      const u = await Usuario.query().where('id_usuario', actor).first()
      if (!u) actor = null
    }

    await notificacion
      .merge({
        eliminada: true,
        eliminadaEn: new Date() as any,
        eliminadaPor: actor,
      })
      .save()

    return { success: true, mensaje: 'Notificación eliminada correctamente' }
  }

  /** Eliminar múltiples notificaciones (soft delete) */
  async eliminarMultiples(ids: number[], id_institucion: number, id_usuario_admin: number) {
    if (!ids || !Array.isArray(ids) || !ids.length) {
      throw new Error('No se proporcionaron IDs')
    }

    // Sanitizar y validar IDs
    const validIds = ids.map((i: any) => Number(i)).filter((n: number) => Number.isFinite(n) && !Number.isNaN(n)).map((n: number) => Math.trunc(n))
    if (!validIds.length) {
      throw new Error('No se encontraron IDs válidos')
    }

    if (validIds.length > 100) {
      throw new Error('Máximo 100 notificaciones por operación')
    }

    const notificaciones = await Notificacion
      .query()
      .whereIn('id_notificacion', validIds)
      .where('id_institucion', id_institucion)

    const idsEncontrados = notificaciones.map((n: any) => Number(n.id_notificacion))
    const idsFallidos = validIds.filter(id => !idsEncontrados.includes(id))

    // validar que el actor exista en la tabla usuarios; si no existe, usar null
    let actor: number | null = Number(id_usuario_admin)
    if (!Number.isFinite(actor) || Number.isNaN(actor)) actor = null
    else {
      const u = await Usuario.query().where('id_usuario', actor).first()
      if (!u) actor = null
    }

    const affected = await Notificacion
      .query()
      .whereIn('id_notificacion', idsEncontrados)
      .update({
        eliminada: true,
        eliminadaEn: new Date(),
        eliminadaPor: actor,
      })

    if (idsFallidos.length > 0) {
      return {
        success: true,
        eliminadas: affected,
        fallidas: idsFallidos.length,
        mensaje: `${affected} de ${validIds.length} notificaciones eliminadas`,
        errores: idsFallidos.map(id => ({ id, error: 'Notificación no encontrada' })),
      }
    }

    return {
      success: true,
      eliminadas: affected,
      mensaje: `${affected} notificaciones eliminadas correctamente`,
    }
  }

  /** Eliminar todas las notificaciones con filtros opcionales */
  async eliminarTodas(
    id_institucion: number,
    id_usuario_admin: number,
    filtros: {
      leidas_solamente?: boolean
      tipo?: string
      antes_de?: string
    } = {}
  ) {
    const query = Notificacion
      .query()
      .where('id_institucion', id_institucion)
      .where('eliminada', false)

    if (filtros.leidas_solamente) {
      query.where('leida', true)
    }

    if (filtros.tipo) {
      query.where('tipo', filtros.tipo)
    }

    if (filtros.antes_de) {
      query.where('created_at', '<', new Date(filtros.antes_de) as any)
    }

    // Límite de seguridad: máximo 1000 por operación
    query.limit(1000)

    // validar que el actor exista en la tabla usuarios; si no existe, usar null
    let actor: number | null = Number(id_usuario_admin)
    if (!Number.isFinite(actor) || Number.isNaN(actor)) actor = null
    else {
      const u = await Usuario.query().where('id_usuario', actor).first()
      if (!u) actor = null
    }

    const affected = await query.update({
      eliminada: true,
      eliminadaEn: new Date(),
      eliminadaPor: actor,
    })

    return {
      success: true,
      eliminadas: affected,
      mensaje: `${affected} notificaciones eliminadas correctamente`,
    }
  }

  /** Orquestador: genera TODOS los tipos para el mes actual */
  async generarParaInstitucion(id_institucion: number) {
    const a = await this.genPuntajeBajo(id_institucion)
    const b = await this.genInactividadYAutoInactivar(id_institucion)
    const c = await this.genProgresoLento(id_institucion)
    return a + b + c
  }

  // ===== EP-06 HU-02: Puntaje bajo por área (mes actual) =====
  private async genPuntajeBajo(id_institucion: number) {
    const estudiantes = await Usuario
      .query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .select(['id_usuario', 'apellido', 'numero_documento'])

    if (!estudiantes.length) return 0
    const ids = estudiantes.map((e: any) => e.id_usuario)
    const { inicio, fin } = rangoMes(new Date())

    const sesiones = await Sesion
      .query()
      .whereIn('id_usuario', ids)
      .whereIn('tipo', ['practica', 'simulacro'] as any)
      .where(qb => wherePeriodo(qb, inicio, fin))
      .select(['id_usuario', 'area', 'puntaje_porcentaje'])

    const bucket = new Map<number, Map<Area, number[]>>()
    for (const s of sesiones as any[]) {
      const uid = Number(s.id_usuario)
      const area = s.area as Area
      const val = s.puntaje_porcentaje == null ? null : Number(s.puntaje_porcentaje)
      if (!AREAS.includes(area) || val == null || Number.isNaN(val)) continue
      if (!bucket.has(uid)) bucket.set(uid, new Map())
      const m = bucket.get(uid)!
      if (!m.has(area)) m.set(area, [])
      m.get(area)!.push(val)
    }

    let creadas = 0
    for (const [uid, areas] of bucket.entries()) {
      for (const area of AREAS) {
        const vals = areas.get(area) ?? []
        if (!vals.length) continue
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        if (avg >= UMBRAL_PUNTAJE_BAJO) continue

        // evitar duplicados en el MES por (uid, area)
        const existe = await yaExisteEnElMes(
          id_institucion,
          'puntaje_bajo',
          inicio,
          fin,
          { id_usuario_destino: uid, clavePayload: 'area', valorClave: area }
        )
        if (existe) continue

        const est = estudiantes.find((e: any) => Number(e.id_usuario) === uid)
        await Notificacion.create({
          id_institucion,
          id_usuario_destino: uid,
          tipo: 'puntaje_bajo',
          payload: {
            area,
            promedio: avg,
            titulo: `Puntaje bajo en ${area}`,
            detalle: `Estudiante ${est?.apellido ?? est?.numero_documento ?? uid} – Promedio ${avg}%`,
          },
          leida: false,
        } as any)
        creadas++
      }
    }
    return creadas
  }

  // ===== EP-06 HU-01: Inactividad 30 días → auto-inactivar + notificar =====
  private async genInactividadYAutoInactivar(id_institucion: number) {
    const hoy = new Date()
    const fechaUmbral = new Date(hoy.getTime() - DIAS_INACTIVIDAD * 24 * 60 * 60 * 1000)
    const { inicio, fin } = rangoMes(hoy)

    const inactivos = await Usuario
      .query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .where((qb: any) => {
        // si nunca ha iniciado sesión o su última actividad/login fue antes del umbral
        qb.whereNull('last_login_at')
          .orWhere('last_login_at', '<', fechaUmbral as any)
          .orWhereNull('last_activity_at')
          .orWhere('last_activity_at', '<', fechaUmbral as any)
      })
      .select(['id_usuario', 'apellido', 'numero_documento', 'curso', 'last_login_at', 'last_activity_at', 'is_active'])

    let count = 0
    for (const u of inactivos as any[]) {
      // cambia a inactivo si aún no lo está
      if (u.is_active !== false) {
        (u as any).is_active = false
        await (u as any).save()
      }

      // evitar duplicado (una por mes por usuario)
      const dup = await yaExisteEnElMes(
        id_institucion,
        'inactividad_30d',
        inicio,
        fin,
        { id_usuario_destino: Number(u.id_usuario) }
      )
      if (dup) continue

      const lastRef = u.last_activity_at ?? u.last_login_at ?? null
      const titulo = 'Inactividad de 30 días'
      const detalle = `Estudiante ${u.apellido ?? u.numero_documento ?? u.id_usuario} – último registro: ${
        lastRef ? new Date(lastRef).toLocaleDateString() : 'nunca'
      }`

      await Notificacion.create({
        id_institucion,
        id_usuario_destino: Number(u.id_usuario),
        tipo: 'inactividad_30d',
        payload: {
          titulo,
          detalle,
          curso: u.curso ?? null,
          last_login_at: u.last_login_at ?? null,
          last_activity_at: u.last_activity_at ?? null,
          fecha_umbral: fechaUmbral.toISOString(),
        },
        leida: false,
      } as any)

      count++
    }
    return count
  }

  // ===== EP-06 HU-03: Progreso lento por área (mes actual vs anterior) =====
  private async genProgresoLento(id_institucion: number) {
    const estudiantes = await Usuario
      .query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .select(['id_usuario'])

    const ids = estudiantes.map((e: any) => e.id_usuario)
    if (!ids.length) return 0

    const now = new Date()
    const { inicio: iniAct, fin: finAct } = rangoMes(now)
    const { inicio: iniAnt, fin: finAnt } = rangoMes(new Date(now.getFullYear(), now.getMonth() - 1, 1))

    const sesiones = await Sesion
      .query()
      .whereIn('id_usuario', ids)
      .whereIn('tipo', ['practica', 'simulacro'] as any)
      .where((qb) => {
        qb.where((q1: any) => q1.where('fin_at', '>=', iniAnt as any).andWhere('fin_at', '<', finAct as any))
          .orWhere((q2: any) => q2.whereNull('fin_at').andWhere('inicio_at', '>=', iniAnt as any).andWhere('inicio_at', '<', finAct as any))
      })
      .select(['id_usuario', 'area', 'puntaje_porcentaje', 'inicio_at', 'fin_at'])

    const isPrev = (d: Date) => d >= iniAnt && d < finAnt
    const isCurr = (d: Date) => d >= iniAct && d < finAct

    const ag: Record<Area, { prev: number[]; curr: number[] }> = {
      Matematicas: { prev: [], curr: [] },
      Lenguaje: { prev: [], curr: [] },
      Ciencias: { prev: [], curr: [] },
      Sociales: { prev: [], curr: [] },
      Ingles: { prev: [], curr: [] },
    }

    for (const s of sesiones as any[]) {
      const area = s.area as Area
      const score = s.puntaje_porcentaje == null ? null : Number(s.puntaje_porcentaje)
      if (!AREAS.includes(area) || score == null || Number.isNaN(score)) continue
      const ref = s.fin_at ?? s.inicio_at
      const d = ref ? new Date(ref) : null
      if (!d) continue
      if (isPrev(d)) ag[area].prev.push(score)
      else if (isCurr(d)) ag[area].curr.push(score)
    }

    let creadas = 0
    for (const area of AREAS) {
      const p = ag[area].prev
      const c = ag[area].curr
      if (!p.length || !c.length) continue
      const avgPrev = Math.round(p.reduce((a, b) => a + b, 0) / p.length)
      const avgCurr = Math.round(c.reduce((a, b) => a + b, 0) / c.length)
      const delta = avgCurr - avgPrev
      if (delta > PROGRESO_LENTO_DELTA) continue

      // evitar duplicado: una por institución+área por mes
      const dup = await yaExisteEnElMes(
        id_institucion,
        'progreso_lento',
        iniAct,
        finAct,
        { id_usuario_destino: null, clavePayload: 'area', valorClave: area }
      )
      if (dup) continue

      await Notificacion.create({
        id_institucion,
        id_usuario_destino: null,
        tipo: 'progreso_lento',
        payload: {
          titulo: `Progreso lento en ${area}`,
          detalle: `Promedio actual ${avgCurr}% vs mes anterior ${avgPrev}% (Δ ${delta} pp)`,
          promedio_actual: avgCurr,
          promedio_anterior: avgPrev,
          delta,
          area,
        },
        leida: false,
      } as any)
      creadas++
    }
    return creadas
  }
}
