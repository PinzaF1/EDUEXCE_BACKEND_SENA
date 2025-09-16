import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'
import Notificacion from '../models/notificacione.js' // nombre del modelo según tu archivo

export default class NotificacionesService {
  // Corre este método en un CRON diario o cuando el admin abra el dashboard
  async generarParaInstitucion(id_institucion: number) {
    const hoy = new Date()
    const limiteInactividad = new Date(hoy.getTime() - 30 * 24 * 3600 * 1000)

    // 1) Inactividad 30 días: inactivar y notificar
    const estudiantes = await Usuario.query().where('rol', 'estudiante').where('id_institucion', id_institucion)
    for (const e of estudiantes) {
      const ses = await Sesion.query().where('id_usuario', e.id_usuario).orderBy('inicio_at', 'desc').first()
      const ultima = (ses as any)?.inicio_at ?? (e as any).created_at
      if (ultima && new Date(ultima) < limiteInactividad && (e as any).is_active) {
        ;(e as any).is_active = false
        await e.save()
        await Notificacion.create({
          id_institucion,
          id_usuario: e.id_usuario,
          tipo: 'inactividad',
          titulo: 'Estudiante inactivado por 30 días',
          detalle: `Estudiante ${e.apellido ?? e.numero_documento} (${(e as any).curso ?? 'Sin curso'}) – Última conexión: ${new Date(ultima).toLocaleDateString()}`,
          leida: false,
        } as any)
      }
    }

    // 2) Puntaje bajo (ej: < 40%) y 3) Progreso lento (no mejora vs mes anterior)
    const desdeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const hastaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
    const desdePrev = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)

    for (const e of estudiantes) {
      const sesMes = await Sesion.query()
        .where('id_usuario', e.id_usuario)
        .where('inicio_at', '>=', desdeMes as any).where('inicio_at', '<', hastaMes as any)

      if (sesMes.length) {
        // puntaje bajo por área
        const porArea: Record<string, number[]> = {}
        for (const s of sesMes) {
          const a = (s as any).area
          const v = (s as any).puntaje_porcentaje ?? 0
          if (!porArea[a]) porArea[a] = []
          porArea[a].push(v)
        }
        for (const [area, vals] of Object.entries(porArea)) {
          const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          if (avg < 40) {
            await Notificacion.create({
              id_institucion,
              id_usuario: e.id_usuario,
              tipo: 'puntaje_bajo',
              titulo: `Puntaje bajo en ${area}`,
              detalle: `Estudiante ${e.apellido ?? e.numero_documento} – Promedio ${avg}%`,
              leida: false,
            } as any)
          }
        }

        // progreso lento
        const sesPrev = await Sesion.query()
          .where('id_usuario', e.id_usuario)
          .where('inicio_at', '>=', desdePrev as any).where('inicio_at', '<', desdeMes as any)

        const avgMes = Math.round(sesMes.reduce((a, s) => a + ((s as any).puntaje_porcentaje ?? 0), 0) / sesMes.length)
        const avgPrev = sesPrev.length ? Math.round(sesPrev.reduce((a, s) => a + ((s as any).puntaje_porcentaje ?? 0), 0) / sesPrev.length) : 0

        if (avgMes <= avgPrev) {
          await Notificacion.create({
            id_institucion,
            id_usuario: e.id_usuario,
            tipo: 'progreso_lento',
            titulo: 'Progreso lento',
            detalle: `Estudiante ${e.apellido ?? e.numero_documento} – ${avgPrev}% → ${avgMes}%`,
            leida: false,
          } as any)
        }
      }
    }
  }

  async listar(id_institucion: number, filtro?: 'inactividad' | 'puntaje_bajo' | 'progreso_lento') {
    let q = Notificacion.query().where('id_institucion', id_institucion).orderBy('created_at', 'desc')
    if (filtro) q = q.where('tipo', filtro)
    return await q
  }

  async marcarLeidas(ids: number[]) {
    if (!ids || !ids.length) return 0
    const filas = await Notificacion.query().whereIn('id_notificacion', ids)
    for (const n of filas) {
      ;(n as any).leida = true
      await n.save()
    }
    return filas.length
  }
}
