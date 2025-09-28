// app/services/notificaciones_service.ts
import Notificacion from '../models/notificacione.js'
import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles'] as const
const UMBRAL_PUNTAJE_BAJO = 40

function rangoMes(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
  return { inicio, fin }
}

export default class NotificacionesService {
  /**
   * Lista las notificaciones de la institución (opcionalmente filtradas por tipo)
   * Mapea `payload.titulo/detalle` para que el frontend tenga esos campos.
   */
  async listar(id_institucion: number, tipo?: string) {
    const q = Notificacion.query().where('id_institucion', id_institucion)

    if (tipo) q.andWhere('tipo', tipo)

    const rows = await q.orderBy('created_at', 'desc')

    // Normaliza salida para el frontend
    return rows.map((n) => ({
      id: (n as any).id_notificacion,
      id_institucion: (n as any).id_institucion,
      id_usuario_destino: (n as any).id_usuario_destino,
      tipo: (n as any).tipo,
      titulo: (n as any).payload?.titulo ?? '',     // <- desde payload
      detalle: (n as any).payload?.detalle ?? '',   // <- desde payload
      payload: (n as any).payload ?? null,
      leida: !!(n as any).leida,
      createdAt: (n as any).createdAt ?? (n as any).created_at ?? null,
    }))
  }

  /**
   * Marca como leídas por IDs de notificación
   */
  async marcarLeidas(ids: number[]) {
    if (!ids?.length) return 0
    const affected = await Notificacion
      .query()
      .whereIn('id_notificacion', ids)
      .update({ leida: true })
    return affected
  }

  /**
   * Genera notificaciones de "puntaje_bajo" por estudiante/área
   * para el MES ACTUAL, si su promedio en esa área < UMBRAL_PUNTAJE_BAJO.
   *
   * Usa SOLO columnas declaradas en el modelo:
   *   - id_institucion
   *   - id_usuario_destino
   *   - tipo
   *   - payload { ... }
   *   - leida
   */
  async generarParaInstitucion(id_institucion: number) {
    // 1) Traer estudiantes de la institución
    const estudiantes = await Usuario
      .query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .select(['id_usuario', 'apellido', 'numero_documento'])

    if (!estudiantes.length) return 0

    const ids = estudiantes.map((e: any) => e.id_usuario)

    // 2) Rango del mes actual y sesiones de práctica/simulacro
    const { inicio, fin } = rangoMes(new Date())

    const sesiones = await Sesion
      .query()
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
      .select(['id_usuario', 'area', 'puntaje_porcentaje'])

    // 3) Agrupar por estudiante y por área
    const porUsuarioArea = new Map<number, Map<Area, number[]>>()
    for (const s of sesiones as any[]) {
      const uid = Number(s.id_usuario)
      const area = s.area as Area
      if (!AREAS.includes(area)) continue
      const val = s.puntaje_porcentaje == null ? null : Number(s.puntaje_porcentaje)
      if (val == null || Number.isNaN(val)) continue

      if (!porUsuarioArea.has(uid)) porUsuarioArea.set(uid, new Map())
      const m = porUsuarioArea.get(uid)!
      if (!m.has(area)) m.set(area, [])
      m.get(area)!.push(val)
    }

    // 4) Crear notificaciones cuando el promedio del área < UMBRAL
    let creadas = 0
    for (const [uid, areasMap] of porUsuarioArea.entries()) {
      for (const area of AREAS) {
        const vals = areasMap.get(area) ?? []
        if (!vals.length) continue
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        if (avg < UMBRAL_PUNTAJE_BAJO) {
          const est = estudiantes.find((e: any) => Number(e.id_usuario) === uid)

          await Notificacion.create({
            id_institucion,
            id_usuario_destino: uid,              // ✅ columna del modelo
            tipo: 'puntaje_bajo',                 // ✅ tipo declarado
            payload: {                            // ✅ datos libres van en payload
              area,
              promedio: avg,
              titulo: `Puntaje bajo en ${area}`,
              detalle: `Estudiante ${est?.apellido ?? est?.numero_documento ?? uid} – Promedio ${avg}%`,
              estudiante: {
                id_usuario: uid,
                apellido: est?.apellido ?? null,
                numero_documento: est?.numero_documento ?? null,
              },
            },
            leida: false,                         // ✅ columna del modelo
          })

          creadas++
        }
      }
    }

    return creadas
  }
}
