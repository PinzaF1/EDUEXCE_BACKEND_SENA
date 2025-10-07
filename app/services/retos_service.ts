// app/services/retos_service.ts
import Reto from '../models/reto.js'
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'
import BancoPregunta from '../models/banco_pregunta.js'
import Usuario from '../models/usuario.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'

export default class RetosService {
  ia = new IaService()

  /* ========== LISTAR OPONENTES (primero) ========== */
    async listarOponentes(d: { id_institucion: number; solicitante_id: number; q?: string }) {
    // Retos activos para marcar ocupados
    const activos = await Reto.query()
      .where('id_institucion', d.id_institucion)
      .whereIn('estado', ['pendiente', 'en_curso'])

    const ocupados = new Set<number>()
    for (const r of activos) {
      const raw = (r as any).participantes_json
      let arr: any[] = []
      if (Array.isArray(raw)) arr = raw
      else if (typeof raw === 'string') { try { arr = JSON.parse(raw) } catch {} }
      for (const v of (arr || [])) {
        const n = Number(v)
        if (Number.isFinite(n)) ocupados.add(n)
      }
    }

    // Usuarios de la institución (menos el solicitante). Búsqueda opcional.
    const q = Usuario.query()
      .where('id_institucion', d.id_institucion)
      .whereNot('id_usuario', d.solicitante_id)

    if (d.q) {
      q.where((qb) => {
        qb.whereILike('nombres', `%${d.q}%`)
          .orWhereILike('apellidos', `%${d.q}%`)
          .orWhereILike('nombre_usuario', `%${d.q}%`)
      })
    }

    const usuarios = await q.orderBy('nombres', 'asc').limit(200)

    const lista = usuarios.map((u: any) => {
      const id  = Number(u.id_usuario)
      const nom = [u.nombres || u.nombre_usuario || u.nombre, u.apellidos || u.apellido]
        .filter(Boolean)
        .join(' ')
        .trim()

      return {
        id_usuario: id,
        nombre: nom || `Estudiante ${id}`,
        grado: u.grado ?? null,
        curso: u.curso ?? null,
        foto_url: u.foto_url ?? null,
        estado: ocupados.has(id) ? 'en_reto' : 'disponible',
      }
    })

    // Disponibles primero
    lista.sort((a, b) => (a.estado === b.estado)
      ? a.nombre.localeCompare(b.nombre)
      : (a.estado === 'disponible' ? -1 : 1))

    return lista
  }

  /* ========== CREAR RETO (después de elegir oponente) ========== */
  async crearReto(d: {
    id_institucion: number
    creado_por: number
    cantidad: number
    area: Area
    oponente_id: number            // <- requerido para este flujo
  }) {
    const TARGET = Math.max(1, Number(d.cantidad) || 25)
    const area = d.area as Area
    const oponente = Number(d.oponente_id)

    if (!oponente || !Number.isFinite(oponente)) {
      throw new Error('oponente_id es obligatorio')
    }

    // valida que el oponente no esté en reto activo
    const activos = await Reto.query()
      .where('id_institucion', d.id_institucion)
      .whereIn('estado', ['pendiente', 'en_curso'])

    for (const r of activos) {
      try {
        const arr = JSON.parse(String((r as any).participantes_json || '[]'))
        const ids = Array.isArray(arr) ? arr.map((x: any) => Number(x)).filter(Number.isFinite) : []
        if (ids.includes(oponente)) {
          throw new Error('El oponente seleccionado ya está en un reto activo.')
        }
      } catch {}
    }

    // 1) genera preguntas
    let preguntas = await this.ia.generarPreguntas({
      area, cantidad: TARGET, id_institucion: d.id_institucion, time_limit_seconds: null,
    } as any)

    // 2) completa desde banco si faltan
    const elegidas: any[] = []
    const ya = new Set<number>()
    for (const p of (preguntas || [])) {
      const id = Number((p as any).id_pregunta)
      if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(p) }
    }
    const faltan = () => TARGET - elegidas.length
    if (faltan() > 0) {
      const extra = await BancoPregunta.query()
        .whereIn('area', [area, area === 'Matematicas' ? 'Matemáticas' : area])
        .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
        .orderByRaw('random()')
        .limit(faltan())

      for (const r of extra) {
        const id = Number((r as any).id_pregunta)
        if (!ya.has(id) && elegidas.length < TARGET) {
          ya.add(id)
          elegidas.push({
            id_pregunta: (r as any).id_pregunta,
            area: (r as any).area,
            subtema: (r as any).subtema,
            dificultad: (r as any).dificultad,
            estilo_kolb: (r as any).estilo_kolb,
            pregunta: (r as any).pregunta,
            opciones: (r as any).opciones,
            respuesta_correcta: (r as any).respuesta_correcta,
            explicacion: (r as any).explicacion,
            time_limit_seconds: null,
          })
        }
      }
    }

    const reglas = { limite_seg: null, preguntas: elegidas }
    const participantes = [d.creado_por, oponente]  // siempre 1v1 con oponente

    const reto = await Reto.create({
      id_institucion: d.id_institucion,
      creado_por: d.creado_por,
      tipo: '1v1',
      area,
      estado: 'pendiente',
      participantes_json: JSON.stringify(participantes),
      reglas_json: JSON.stringify(reglas),
      resultados_json: null,
    } as any)

    // opcional: adjuntar info básica del oponente para el front
    const op = await Usuario.find(oponente)
    const oponente_info = op ? {
      id_usuario: Number((op as any).id_usuario),
      nombre: [ (op as any).nombres || (op as any).nombre_usuario || (op as any).nombre, (op as any).apellidos || (op as any).apellido ]
        .filter(Boolean).join(' ').trim(),
      grado: (op as any).grado ?? null,
      curso: (op as any).curso ?? null,
      foto_url: (op as any).foto_url ?? null,
    } : null

    return {
      id_reto: Number((reto as any).id_reto),
      estado: String((reto as any).estado),        // 'pendiente'
      area,
      cantidad: elegidas.length,
      oponente: oponente_info,
    }
  }

  /* ====== aceptar reto, responder ronda, estado ====== */
  async aceptarReto(id_reto: number, id_usuario_invitado: number) {
    const reto = await Reto.findOrFail(id_reto)

    // trae preguntas de reglas
    let preguntas: any[] = []
    try {
      const reglas = typeof (reto as any).reglas_json === 'string'
        ? JSON.parse(String((reto as any).reglas_json))
        : (reto as any).reglas_json || {}
      if (Array.isArray(reglas?.preguntas)) preguntas = reglas.preguntas
    } catch {}

    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      const area = (reto as any).area as Area
      preguntas = await this.ia.generarPreguntas({
        area, cantidad: 25,
        id_institucion: Number((reto as any).id_institucion) || undefined,
        time_limit_seconds: null,
      } as any)
      reto.merge({ reglas_json: { limite_seg: null, preguntas } })
      await reto.save()
    }

    // participantes
    let participantes: number[] = []
    try {
      const raw = (reto as any).participantes_json
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(arr)) participantes = arr.map((x: any) => Number(x)).filter(Number.isFinite)
    } catch {}
    const creador = Number((reto as any).creado_por) || null
    participantes = Array.from(new Set<number>([
      ...participantes,
      ...(creador ? [creador] : []),
      Number(id_usuario_invitado),
    ]))

    reto.merge({ participantes_json: participantes, estado: 'en_curso' })
    await reto.save()

    // sesiones
    const sesiones: Array<{ id_usuario: number; id_sesion: number }> = []
    for (const uid of participantes) {
      const ses = await Sesion.create({
        id_usuario: uid,
        tipo: 'reto',
        modo: 'estandar',
        area: (reto as any).area || null,
        usa_estilo_kolb: false,
        inicio_at: DateTime.local(),
        total_preguntas: preguntas.length,
        correctas: 0,
      } as any)

      const id_sesion = Number((ses as any).id_sesion)
      let orden = 1
      for (const p of preguntas) {
        await SesionDetalle.create({
          id_sesion,
          id_pregunta: Number((p as any).id_pregunta) || null,
          orden,
          tiempo_asignado_seg: (p as any).time_limit_seconds ?? null,
        } as any)
        orden++
      }
      sesiones.push({ id_usuario: uid, id_sesion })
    }

    reto.merge({ resultados_json: { sesiones_por_usuario: sesiones } })
    await reto.save()
    await Reto.query().where('id_reto', id_reto).update({ resultados_json: { sesiones_por_usuario: sesiones } })

    return {
      reto: {
        id_reto: Number((reto as any).id_reto),
        estado: String((reto as any).estado),
        participantes,
      },
      sesiones,
    }
  }

  async responderRonda(d: {
    id_sesion: number
    respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }>
  }) {
    const ses = await Sesion.findOrFail(d.id_sesion)
    const detalles = await SesionDetalle.query()
      .where('id_sesion', Number((ses as any).id_sesion))
      .orderBy('orden', 'asc')

    const ids = detalles.map((x: any) => Number(x.id_pregunta)).filter(Boolean)
    const banco = ids.length ? await BancoPregunta.query().whereIn('id_pregunta', ids) : []
    const correctaDe = new Map<number, string>()
    for (const b of banco) {
      correctaDe.set(Number((b as any).id_pregunta), String((b as any).respuesta_correcta || '').toUpperCase())
    }

    let correctas = 0
    for (const r of d.respuestas || []) {
      const det = detalles.find((x: any) => Number(x.orden) === Number(r.orden))
      if (!det) continue
      ;(det as any).alternativa_elegida = r.opcion
      const t = Number(r.tiempo_empleado_seg)
      ;(det as any).tiempo_empleado_seg = Number.isFinite(t) ? t : null
      ;(det as any).respondida_at = DateTime.local()
      const idp = Number((det as any).id_pregunta)
      const ok = String((r.opcion || '').toUpperCase()) === (correctaDe.get(idp) || '')
      ;(det as any).es_correcta = ok
      if (ok) correctas++
      await det.save()
    }

    ;(ses as any).correctas = correctas
    ;(ses as any).puntaje_porcentaje = Math.round((correctas * 100) / Math.max(1, Number((ses as any).total_preguntas)))
    ;(ses as any).fin_at = DateTime.local()
    await ses.save()

    return { id_sesion: Number((ses as any).id_sesion), correctas, puntaje: Number((ses as any).puntaje_porcentaje) }
  }

  async estadoReto(id_reto: number) {
    const reto = await Reto.findOrFail(id_reto)

    // participantes
    let participantes: number[] = []
    const rawPart = (reto as any).participantes_json
    if (Array.isArray(rawPart)) participantes = rawPart.map(Number).filter(Number.isFinite)
    else if (typeof rawPart === 'string') {
      try {
        const p = JSON.parse(rawPart)
        if (Array.isArray(p)) participantes = p.map(Number).filter(Number.isFinite)
      } catch {
        const asCsv = rawPart.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
        if (asCsv.length) participantes = asCsv
      }
    }

    // sesiones mapeadas en resultados_json
    let mapSesiones: Array<{ id_usuario: number; id_sesion: number }> = []
    const rawRes = (reto as any).resultados_json
    if (rawRes && typeof rawRes === 'object' && Array.isArray(rawRes.sesiones_por_usuario)) {
      mapSesiones = rawRes.sesiones_por_usuario
    } else if (typeof rawRes === 'string') {
      try {
        const r = JSON.parse(rawRes)
        if (Array.isArray(r?.sesiones_por_usuario)) mapSesiones = r.sesiones_por_usuario
      } catch {}
    }

    const jugadores: Array<{ id_usuario: number; correctas: number; tiempo_total_seg: number }> = []
    for (const uid of participantes) {
      const entry = mapSesiones.find(x => Number(x.id_usuario) === Number(uid))
      const ses = entry
        ? await Sesion.find(entry.id_sesion)
        : await Sesion.query().where('tipo', 'reto').where('id_usuario', uid).orderBy('inicio_at', 'desc').first()
      if (!ses) continue

      const dets = await SesionDetalle.query().where('id_sesion', Number((ses as any).id_sesion))
      const correctas = dets.filter((d: any) => d.es_correcta === true).length
      const tiempo = dets.reduce((a: number, b: any) => a + (Number(b.tiempo_empleado_seg) || 0), 0)
      jugadores.push({ id_usuario: uid, correctas, tiempo_total_seg: tiempo })
    }

    let ganador: number | null = null
    if (jugadores.length >= 2) {
      const [a, b] = jugadores
      if (a.correctas > b.correctas) ganador = a.id_usuario
      else if (b.correctas > a.correctas) ganador = b.id_usuario
      else ganador = a.tiempo_total_seg <= b.tiempo_total_seg ? a.id_usuario : b.id_usuario
    }

    if (ganador !== null) {
      let resObj: any = {}
      try {
        const raw = (reto as any).resultados_json
        resObj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
      } catch {}
      resObj.ganador_id = ganador
      reto.merge({ estado: 'finalizado', resultados_json: resObj })
      await reto.save()
    }

    return {
      id_reto: Number((reto as any).id_reto),
      estado: String((reto as any).estado),
      ganador: ganador ?? null,
      jugadores,
    }
  }
}
