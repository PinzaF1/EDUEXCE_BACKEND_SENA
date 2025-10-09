// app/services/retos_service.ts
import Reto from '../models/reto.js'
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'
import BancoPregunta from '../models/banco_pregunta.js'
import Usuario from '../models/usuario.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'

function parseIds(raw: any): number[] {
  // soporta json, array o csv
  try {
    if (Array.isArray(raw)) return raw.map((x) => Number(x)).filter(Number.isFinite);
    if (typeof raw === 'string') {
      try {
        const j = JSON.parse(raw);
        if (Array.isArray(j)) return j.map((x: any) => Number(x)).filter(Number.isFinite);
      } catch {
        return raw.split(/[\s,;|]+/).map((x) => Number(x)).filter(Number.isFinite);
      }
    }
  } catch {}
  return [];
}

function mkNom(u?: any | null) {
  if (!u) return null;
  const nom = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
  return {
    id: Number(u.id_usuario),
    nombre: nom || `Usuario ${u.id_usuario}`,
    grado: u.grado ?? null,
    curso: u.curso ?? null,
    foto_url: u.foto_url ?? null,
  };
}

/** Mapea la pregunta al formato que consume la app */
function mapPreguntaForClient(p: any) {
  return {
    id_pregunta: Number(p.id_pregunta) || null,
    area: p.area ?? null,
    subtema: p.subtema ?? null,
    dificultad: p.dificultad ?? null,
    enunciado: p.pregunta ?? p.enunciado ?? null,
    opciones: p.opciones ?? null,
    time_limit_seconds: p.time_limit_seconds ?? null,
  }
}

export default class RetosService {
  ia = new IaService()

  /* ===================== OPONENTES ===================== */
  async listarOponentes(d: { id_institucion: number; solicitante_id: number; q?: string }) {
    // Retos activos -> usuarios “ocupados”
    const activos = await Reto.query()
      .where('id_institucion', d.id_institucion)
      .whereIn('estado', ['pendiente', 'en_curso'])

    const ocupados = new Set<number>()
    for (const r of activos) {
      const raw = (r as any).participantes_json
      let arr: any[] = []
      if (Array.isArray(raw)) arr = raw
      else if (typeof raw === 'string') {
        try { arr = JSON.parse(raw) } catch {}
      }
      for (const v of arr || []) {
        const n = Number(v)
        if (Number.isFinite(n)) ocupados.add(n)
      }
    }

    // Usuarios de la institución (menos el solicitante)
    const q = Usuario.query()
      .where('id_institucion', d.id_institucion)
      .whereNot('id_usuario', d.solicitante_id)

    // Búsqueda opcional por nombre / apellido (columnas reales)
    if (d.q && String(d.q).trim()) {
      const term = `%${String(d.q).trim()}%`
      q.where((qb) => qb.whereILike('nombre', term).orWhereILike('apellido', term))
    }

    // Orden seguro usando columnas existentes
    q.orderByRaw(`COALESCE(nombre,'') ASC, COALESCE(apellido,'') ASC`)
    const usuarios = await q.limit(200)

    // Respuesta
    const lista = usuarios.map((u: any) => {
      const id = Number(u.id_usuario)
      const nom = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
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
    lista.sort((a, b) =>
      a.estado === b.estado ? a.nombre.localeCompare(b.nombre) : a.estado === 'disponible' ? -1 : 1
    )

    return lista
  }

  /* ===================== CREAR RETO ===================== */
  async crearReto(d: {
    id_institucion: number
    creado_por: number
    cantidad: number
    area: Area
    oponente_id: number
  }) {
    const TARGET = Math.max(1, Number(d.cantidad) || 25)
    const area = d.area as Area
    const oponente = Number(d.oponente_id)
    if (!oponente || !Number.isFinite(oponente)) throw new Error('oponente_id es obligatorio')

    // Validar que el oponente no esté en reto activo
    const activos = await Reto.query()
      .where('id_institucion', d.id_institucion)
      .whereIn('estado', ['pendiente', 'en_curso'])
    for (const r of activos) {
      try {
        const arr = JSON.parse(String((r as any).participantes_json || '[]'))
        const ids = Array.isArray(arr) ? arr.map((x: any) => Number(x)).filter(Number.isFinite) : []
        if (ids.includes(oponente)) throw new Error('El oponente seleccionado ya está en un reto activo.')
      } catch {}
    }

    // 1) Intentar con IA
    let preguntas: any[] = await this.ia.generarPreguntas({
      area,
      cantidad: TARGET,
      id_institucion: d.id_institucion,
      time_limit_seconds: null,
    } as any)

    // 2) Completar desde banco si faltan
    const elegidas: any[] = []
    const ya = new Set<number>()
    for (const p of preguntas || []) {
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
            pregunta: (r as any).pregunta,
            opciones: (r as any).opciones,
            respuesta_correcta: (r as any).respuesta_correcta,
            explicacion: (r as any).explicacion,
            time_limit_seconds: null,
          })
        }
      }
    }

    // Persistimos las preguntas en reglas_json
    const reglas = { limite_seg: null, preguntas: elegidas.map(mapPreguntaForClient) }
    const participantes = [d.creado_por, oponente]

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

    // Info del oponente para mostrar
    const op = await Usuario.find(oponente)
    const oponente_info = op
      ? {
          id_usuario: Number((op as any).id_usuario),
          nombre: [ (op as any).nombre, (op as any).apellido ].filter(Boolean).join(' ').trim(),
          grado: (op as any).grado ?? null,
          curso: (op as any).curso ?? null,
          foto_url: (op as any).foto_url ?? null,
        }
      : null

    // Devolvemos también las preguntas
    return {
      id_reto: Number((reto as any).id_reto),
      estado: String((reto as any).estado), // 'pendiente'
      area,
      cantidad: reglas.preguntas.length,
      preguntas: reglas.preguntas,
      oponente: oponente_info,
    }
  }

  /* ===================== ACEPTAR RETO ===================== */
  async aceptarReto(id_reto: number, id_usuario_invitado: number) {
    const reto = await Reto.findOrFail(id_reto)

    // Leer preguntas desde reglas_json
    let preguntas: any[] = []
    try {
      const reglas = typeof (reto as any).reglas_json === 'string'
        ? JSON.parse(String((reto as any).reglas_json))
        : (reto as any).reglas_json || {}
      if (Array.isArray(reglas?.preguntas)) preguntas = reglas.preguntas
    } catch {}

    // Si por alguna razón no hubiera preguntas, generamos
    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      const area = (reto as any).area as Area
      const pack = await this.ia.generarPreguntas({
        area, cantidad: 25,
        id_institucion: Number((reto as any).id_institucion) || undefined,
        time_limit_seconds: null,
      } as any)
      preguntas = (pack || []).map(mapPreguntaForClient)
      reto.merge({ reglas_json: { limite_seg: null, preguntas } })
      await reto.save()
    }

    // Participantes (creador + invitado)
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

    // Crear sesiones y detalle por jugador
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

    // Devolvemos también las preguntas
    return {
      reto: {
        id_reto: Number((reto as any).id_reto),
        estado: String((reto as any).estado),
        participantes,
      },
      sesiones,
      preguntas,
    }
  }

  /* RESPONDER RONDA */
  /* ===================== RESPONDER RONDA ===================== */
async responderRonda(d: {
  id_sesion: number
  respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }>
}) {
  const ses = await Sesion.findOrFail(d.id_sesion)

  // === Detalles de la sesión ===
  const detalles = await SesionDetalle.query()
    .where('id_sesion', Number((ses as any).id_sesion))
    .orderBy('orden', 'asc')

  const ids = detalles.map((x: any) => Number(x.id_pregunta)).filter(Boolean)
  const banco = ids.length ? await BancoPregunta.query().whereIn('id_pregunta', ids) : []

  const correctaDe = new Map<number, string>()
  for (const b of banco) {
    correctaDe.set(
      Number((b as any).id_pregunta),
      String((b as any).respuesta_correcta || '').toUpperCase()
    )
  }

  // === Procesamos respuestas ===
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

  // === Guardamos resumen de la sesión ===
  ;(ses as any).correctas = correctas
  ;(ses as any).puntaje_porcentaje = Math.round(
    (correctas * 100) / Math.max(1, Number((ses as any).total_preguntas))
  )
  ;(ses as any).fin_at = DateTime.local()
  await ses.save()

  /* --- Actualizamos también el reto con el progreso del jugador --- */
  try {
    const reto = await Reto.query()
      .where('id_reto', (ses as any).id_reto || null)
      .first()

    if (reto) {
      let resObj: any = {}
      try {
        const raw = (reto as any).resultados_json
        resObj = typeof raw === 'string' ? JSON.parse(raw) : raw || {}
      } catch {}

      // Si no existe estructura, la creamos
      if (!Array.isArray(resObj.sesiones_por_usuario)) {
        resObj.sesiones_por_usuario = []
      }

      // Buscamos esta sesión
      const idx = resObj.sesiones_por_usuario.findIndex(
        (x: any) => Number(x.id_sesion) === Number(d.id_sesion)
      )
      if (idx >= 0) {
        resObj.sesiones_por_usuario[idx].correctas = correctas
      } else {
        // En caso de que no esté, la agregamos
        resObj.sesiones_por_usuario.push({
          id_usuario: (ses as any).id_usuario,
          id_sesion: (ses as any).id_sesion,
          correctas,
        })
      }

      reto.merge({ resultados_json: resObj })
      await reto.save()
    }
  } catch (err) {
    console.error('Error actualizando resultados_json:', err)
  }

  // === Devolvemos resultado básico ===
  return {
    id_sesion: Number((ses as any).id_sesion),
    correctas,
    puntaje: Number((ses as any).puntaje_porcentaje),
  }
}


  /* ===================== ESTADO DEL RETO ===================== */
    /* ===================== ESTADO DEL RETO ===================== */
async estadoReto(id_reto: number) {
  const reto = await Reto.findOrFail(id_reto)

  // === Participantes ===
  let participantes: number[] = []
  const rawPart = (reto as any).participantes_json
  if (Array.isArray(rawPart)) {
    participantes = rawPart.map(Number).filter(Number.isFinite)
  } else if (typeof rawPart === 'string') {
    try {
      const p = JSON.parse(rawPart)
      if (Array.isArray(p)) participantes = p.map(Number).filter(Number.isFinite)
    } catch {
      const asCsv = rawPart.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
      if (asCsv.length) participantes = asCsv
    }
  }

  // === Sesiones guardadas en resultados_json ===
  let mapSesiones: Array<{ id_usuario: number; id_sesion: number; correctas?: number }> = []
  const rawRes = (reto as any).resultados_json
  if (rawRes && typeof rawRes === 'object' && Array.isArray(rawRes.sesiones_por_usuario)) {
    mapSesiones = rawRes.sesiones_por_usuario
  } else if (typeof rawRes === 'string') {
    try {
      const r = JSON.parse(rawRes)
      if (Array.isArray(r?.sesiones_por_usuario)) mapSesiones = r.sesiones_por_usuario
    } catch {}
  }

  // === Resumen por jugador ===
  const jugadores: Array<{ id_usuario: number; correctas: number; tiempo_total_seg: number }> = []

  for (const uid of participantes) {
    const entry = mapSesiones.find((x) => Number(x.id_usuario) === Number(uid))
    let ses = null

    // Preferimos la sesión mapeada, si existe
    if (entry) {
      ses = await Sesion.find(entry.id_sesion)
    } else {
      ses = await Sesion.query()
        .where('tipo', 'reto')
        .where('id_usuario', uid)
        .orderBy('inicio_at', 'desc')
        .first()
    }

    if (!ses) continue

    let correctas = Number((ses as any).correctas) || 0
    let tiempo = 0

    // Calculamos tiempo desde los detalles
    const dets = await SesionDetalle.query().where('id_sesion', Number((ses as any).id_sesion))
    if (!correctas) {
      correctas = dets.filter((d: any) => d.es_correcta === true).length
    }
    tiempo = dets.reduce((a: number, b: any) => a + (Number(b.tiempo_empleado_seg) || 0), 0)

    jugadores.push({ id_usuario: uid, correctas, tiempo_total_seg: tiempo })
  }

  // === Determinar ganador ===
  let ganador: number | null = null
  if (jugadores.length >= 2) {
    const [a, b] = jugadores
    if (a.correctas > b.correctas) ganador = a.id_usuario
    else if (b.correctas > a.correctas) ganador = b.id_usuario
    else {
      // empate: gana el de menor tiempo
      ganador = a.tiempo_total_seg <= b.tiempo_total_seg ? a.id_usuario : b.id_usuario
    }
  }

  // === Solo finaliza cuando todos respondieron ===
  const respondedAll = jugadores.length >= participantes.length && jugadores.every(j => j.correctas >= 0)
  if (respondedAll) {
    let resObj: any = {}
    try {
      const raw = (reto as any).resultados_json
      resObj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    } catch {}
    resObj.ganador_id = ganador
    reto.merge({ estado: 'finalizado', resultados_json: resObj })
    await reto.save()
  }

  // === Devolvemos resultado ===
  return {
    id_reto: Number((reto as any).id_reto),
    estado: String((reto as any).estado),
    ganador: ganador ?? null,
    jugadores,
  }
}


  /* LISTAR RETOS (RECIBIDOS/ENVIADOS) */
  async listarRetos(d: {
    id_institucion: number
    user_id: number
    tipo?: 'recibidos' | 'enviados' | 'todos'
    estado?: 'pendiente' | 'en_curso' | 'finalizado'
    q?: string
  }) {
    const tipo = (d.tipo || 'todos') as 'recibidos' | 'enviados' | 'todos';
    const estados = d.estado ? [d.estado] : ['pendiente', 'en_curso']; // por defecto solo activos

    // 1) Traemos los retos de la institución en estados deseados
    const rows = await Reto.query()
      .where('id_institucion', d.id_institucion)
      .whereIn('estado', estados)
      .orderBy('id_reto', 'desc');

    // 2) Filtramos por rol (enviados/recibidos/todos) del usuario
    const mine = rows.filter((r: any) => {
      const creadorId = Number(r.creado_por);
      const parts = parseIds(r.participantes_json);
      const soyParticipante = parts.includes(d.user_id);
      if (tipo === 'enviados')   return creadorId === d.user_id;
      if (tipo === 'recibidos')  return creadorId !== d.user_id && soyParticipante;
      return creadorId === d.user_id || soyParticipante; // todos
    });

    if (mine.length === 0) return [];

    // 3) Cargamos usuarios involucrados para armar nombres
    const idsUsuarios = new Set<number>();
    for (const r of mine) {
      idsUsuarios.add(Number((r as any).creado_por));
      parseIds((r as any).participantes_json).forEach((x) => idsUsuarios.add(x));
    }
    const usuarios = idsUsuarios.size
      ? await Usuario.query().whereIn('id_usuario', Array.from(idsUsuarios))
      : [];
    const byId = new Map<number, any>();
    for (const u of usuarios) byId.set(Number((u as any).id_usuario), u);

    // 4) Mapeamos la respuesta amigable
    const res = mine.map((r: any) => {
      const idReto   = Number(r.id_reto);
      const area     = String(r.area || '');
      const estadoR  = String(r.estado || '');
      const creadorId = Number(r.creado_por);
      const parts    = parseIds(r.participantes_json);
      const oppId    = parts.find((id) => id !== creadorId);  // puede ser undefined

      const creador  = mkNom(byId.get(creadorId));
      const oponente = (typeof oppId === 'number') ? mkNom(byId.get(oppId)) : null;

      return {
        id_reto: idReto,
        area,
        estado: estadoR, // 'pendiente' | 'en_curso' | 'finalizado'
        creado_en: r.createdAt?.toISO?.() || r.created_at || null,
        creador,
        oponente,
      };
    });

    // 5) Filtro de búsqueda opcional (area/nombres)
    if (d.q && d.q.trim()) {
      const term = d.q.trim().toLowerCase();
      return res.filter((it) =>
        (it.area || '').toLowerCase().includes(term) ||
        (it.creador?.nombre || '').toLowerCase().includes(term) ||
        (it.oponente?.nombre || '').toLowerCase().includes(term),
      );
    }

    return res;
  }
}
