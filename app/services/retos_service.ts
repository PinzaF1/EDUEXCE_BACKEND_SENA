import Reto from '../models/reto.js'
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'
import BancoPregunta from '../models/banco_pregunta.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'

export default class RetosService {
  ia = new IaService()

  // ====== HU-01: Crear reto (25 preguntas si así lo pides) ======
  async crearReto(d: {
    id_institucion: number
    creado_por: number
    cantidad: number
    area: Area
  }) {
    const TARGET = Math.max(1, Number(d.cantidad) || 25)
    const area = d.area as Area

    // 1) Pide a la IA SOLO por área y cantidad (sin dificultad/estilo)
    let preguntas = await this.ia.generarPreguntas({
      area,
      cantidad: TARGET,
      id_institucion: d.id_institucion,
      time_limit_seconds: null,
    } as any)

    // 2) Garantiza la cantidad rellenando desde banco si faltan
    const elegidas: any[] = []
    const ya = new Set<number>()
    for (const p of (preguntas || [])) {
      const id = Number((p as any).id_pregunta)
      if (!ya.has(id) && elegidas.length < TARGET) { ya.add(id); elegidas.push(p) }
    }
    const faltan = () => TARGET - elegidas.length
    if (faltan() > 0) {
      const extra = await BancoPregunta
        .query()
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

    // 👉 Guardamos las PREGUNTAS dentro de reglas_json (no creamos nuevas columnas)
    const reglas = { limite_seg: null, preguntas: elegidas }

    const reto = await Reto.create({
      id_institucion: d.id_institucion,
      creado_por: d.creado_por,
      tipo: '1v1',
      area,
      estado: 'pendiente',
      participantes_json: JSON.stringify([d.creado_por]),
      reglas_json: JSON.stringify(reglas),   // <--- AQUÍ
      resultados_json: null,
    } as any)

    return {
      id_reto: String((reto as any).id_reto),
      estado: (reto as any).estado,
      total_preguntas: elegidas.length,
      preguntas: elegidas,
    }
  }

  // ====== HU-01: Aceptar reto (lee preguntas desde reglas_json) ======
  async aceptarReto(id_reto: number, id_usuario_invitado: number) {
    const reto = await Reto.findOrFail(id_reto)

    // 1) Carga preguntas desde reglas_json.preguntas
    let preguntas: any[] = []
    try {
      const reglas = JSON.parse(String((reto as any).reglas_json || '{}'))
      if (Array.isArray(reglas?.preguntas)) preguntas = reglas.preguntas
    } catch { /* vacío -> se manejará abajo */ }

    // Si por alguna razón no hubiese preguntas, generamos como fallback (misma área y 25)
    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      const area = (reto as any).area as Area
      preguntas = await this.ia.generarPreguntas({
        area,
        cantidad: 25,
        id_institucion: Number((reto as any).id_institucion) || undefined,
        time_limit_seconds: null,
      } as any)
      // persiste el fallback en reglas_json para mantener consistencia
      const reglas = { limite_seg: null, preguntas }
      ;(reto as any).reglas_json = JSON.stringify(reglas)
    }

    // 2) Normaliza participantes_json e incluye creador + invitado
    let participantes: number[] = []
    try {
      const arr = JSON.parse(String((reto as any).participantes_json || '[]'))
      if (Array.isArray(arr)) participantes = arr.map((x: any) => Number(x)).filter(Number.isFinite)
    } catch {}
    const creador = Number((reto as any).creado_por) || null
    participantes = Array.from(new Set<number>([...participantes, ...(creador ? [creador] : []), Number(id_usuario_invitado)]))

    ;(reto as any).participantes_json = JSON.stringify(participantes)
    ;(reto as any).estado = 'en_curso'
    await reto.save()

    // 3) Crear sesiones para TODOS con las MISMAS preguntas
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

    return {
      reto: {
        id_reto: Number((reto as any).id_reto),
        estado: String((reto as any).estado),
        participantes,
      },
      sesiones,
      preguntas, // <--- ahora sí viene lleno
    }
  }

  // ====== HU-02: Registrar respuestas cronometradas ======
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
      ;(det as any).tiempo_empleado_seg = r.tiempo_empleado_seg ?? null
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

    return {
      id_sesion: Number((ses as any).id_sesion),
      correctas,
      puntaje: Number((ses as any).puntaje_porcentaje),
    }
  }

  // ====== HU-03: Estado del reto + ganador ======
  // ====== HU-03: Estado del reto + ganador (por correctas y, si empatan, menor tiempo total) ======
async estadoReto(id_reto: number) {
  const reto = await Reto.findOrFail(id_reto)

  // --- parseo robusto de participantes_json ---
  let participantes: number[] = []
  const rawPart = (reto as any).participantes_json

  if (Array.isArray(rawPart)) {
    participantes = rawPart.map(Number).filter((n) => Number.isFinite(n))
  } else if (typeof rawPart === 'string') {
    try {
      const p = JSON.parse(rawPart)
      if (Array.isArray(p)) {
        participantes = p.map(Number).filter((n) => Number.isFinite(n))
      }
    } catch {
      // Intento de rescate si vino "19,50" u otro CSV simple
      const asCsv = rawPart.split(/[\s,;|]+/).map((x) => Number(x)).filter((n) => Number.isFinite(n))
      if (asCsv.length) participantes = asCsv
    }
  }
  if (!Array.isArray(participantes)) participantes = []

  // --- resto igual ---
  const jugadores: Array<{ id_usuario: number; correctas: number; tiempo_total_seg: number }> = []

  for (const uid of participantes) {
    const ses = await Sesion.query()
      .where('tipo', 'reto')
      .where('id_usuario', uid)
      .orderBy('inicio_at', 'desc')
      .first()
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

  if (ganador) {
    ;(reto as any).ganador_id = ganador
    ;(reto as any).estado = 'finalizado'
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
