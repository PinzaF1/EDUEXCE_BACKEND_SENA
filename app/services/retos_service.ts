// app/services/retos_service.ts
import Reto from '../models/reto.js'
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService from './ia_service.js'
import BancoPregunta from '../models/banco_pregunta.js'
import Usuario from '../models/usuario.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'

function parseJsonSafe<T = any>(raw: any, fallback: T = null as any): T {
  try {
    if (raw == null) return fallback
    if (typeof raw === 'string') return JSON.parse(raw)
    if (typeof raw === 'object') return raw as T
  } catch {}
  return fallback
}

function parseIds(raw: any): number[] {
  try {
    if (Array.isArray(raw)) return raw.map((x) => Number(x)).filter(Number.isFinite)
    if (typeof raw === 'string') {
      try {
        const j = JSON.parse(raw)
        if (Array.isArray(j)) return j.map((x: any) => Number(x)).filter(Number.isFinite)
      } catch {
        return raw.split(/[\s,;|]+/).map((x) => Number(x)).filter(Number.isFinite)
      }
    }
  } catch {}
  return []
}

function mkNom(u?: any | null) {
  if (!u) return null
  const nom = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
  return {
    id: Number(u.id_usuario),
    nombre: nom || `Usuario ${u.id_usuario}`,
    grado: u.grado ?? null,
    curso: u.curso ?? null,
    foto_url: u.foto_url ?? null,
  }
}

/** Normaliza la pregunta al formato del cliente */
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
  async marcadorUsuario(id_usuario: number, id_institucion: number) {
    // Trae SOLO lo necesario
    const rows = await Reto.query()
      .where('id_institucion', id_institucion)
      .where('estado', 'finalizado')
      .select(['id_reto', 'participantes_json', 'resultados_json'])

    let victorias = 0
    let derrotas  = 0

    for (const r of rows as any[]) {
      const parts = parseJsonSafe<any[]>(r.participantes_json, [])
      const res   = parseJsonSafe<any>(r.resultados_json, {})

      // si no está en los participantes, sigue
      const participa = Array.isArray(parts) && parts.map(Number).includes(Number(id_usuario))
      if (!participa) continue

      const ganadorId = Number(res?.ganador_id ?? NaN)
      if (!Number.isFinite(ganadorId)) continue // aún sin ganador → no cuenta

      if (ganadorId === Number(id_usuario)) victorias++
      else derrotas++
    }

    return { victorias, derrotas }
  }
  
  
  async listarOponentes(d: { id_institucion: number; solicitante_id: number; q?: string }) {
    // Retos activos -> usuarios “ocupados” (solo pendiente y en_curso)
    // IMPORTANTE: Los retos finalizados, cancelados o rechazados ya liberan a los usuarios
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

    // Usuarios de la institución (menos el solicitante y los ocupados) - SOLO ACTIVOS Y LOGUEADOS
    // Hacer el filtro menos restrictivo: usuarios activos que han iniciado sesión alguna vez
    // O que tienen actividad reciente (últimas 24 horas) o sesión abierta activa
    const ahora = new Date()
    const ventanaActividad = new Date(ahora.getTime() - 24 * 60 * 60 * 1000) // Últimas 24 horas (más permisivo)
    
    // Obtener IDs de usuarios con sesiones abiertas activas (practicando ahora)
    // Primero obtener usuarios de la institución, luego buscar sus sesiones
    const usuariosInst = await Usuario.query()
      .where('id_institucion', d.id_institucion)
      .where('is_active', true)
      .select('id_usuario')
    
    const idsUsuariosInst = usuariosInst.map((u: any) => Number(u.id_usuario))
    
    const Sesion = (await import('../models/sesione.js')).default
    const sesionesActivas = idsUsuariosInst.length > 0
      ? await Sesion.query()
          .whereIn('id_usuario', idsUsuariosInst)
          .whereNull('fin_at') // Sesiones abiertas
          .where('updated_at', '>=', new Date(ahora.getTime() - 60 * 60 * 1000) as any) // Actividad en última hora
          .select('id_usuario')
      : []
    
    const idsConSesionActiva = Array.from(new Set(sesionesActivas.map((s: any) => Number(s.id_usuario))))
    
    // Construir query: usuarios activos que han iniciado sesión alguna vez
    // Y que NO estén ocupados en retos activos
    const q = Usuario.query()
      .where('id_institucion', d.id_institucion)
      .whereNot('id_usuario', d.solicitante_id)
      .where('is_active', true) // Solo usuarios activos
      .whereNotIn('id_usuario', Array.from(ocupados)) // EXCLUIR usuarios ocupados en retos activos
      .where((qb) => {
        // Usuarios que han iniciado sesión alguna vez (last_login_at no nulo)
        // Y que tienen actividad reciente (últimas 24 horas) O sesión abierta activa
        if (idsConSesionActiva.length > 0) {
          qb.whereNotNull('last_login_at') // Debe haber iniciado sesión alguna vez
            .where((subQb) => {
              subQb.whereNotNull('last_activity_at')
                .where('last_activity_at', '>=', ventanaActividad as any)
            }).orWhereIn('id_usuario', idsConSesionActiva)
        } else {
          // Si no hay sesiones activas, solo filtrar por login y actividad reciente
          qb.whereNotNull('last_login_at') // Debe haber iniciado sesión alguna vez
            .whereNotNull('last_activity_at')
            .where('last_activity_at', '>=', ventanaActividad as any)
        }
      })

    // Búsqueda opcional por nombre / apellido
    if (d.q && String(d.q).trim()) {
      const term = `%${String(d.q).trim()}%`
      q.where((qb) => qb.whereILike('nombre', term).orWhereILike('apellido', term))
    }

    q.orderByRaw(`COALESCE(nombre,'') ASC, COALESCE(apellido,'') ASC`)
    const usuarios = await q.limit(200)

    const lista = usuarios.map((u: any) => {
      const id = Number(u.id_usuario)
      const nom = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
      return {
        id_usuario: id,
        nombre: nom || `Estudiante ${id}`,
        grado: u.grado ?? null,
        curso: u.curso ?? null,
        foto_url: u.foto_url ?? null,
        estado: 'disponible', // Todos los que aparecen ya están disponibles (ocupados filtrados)
      }
    })

    // Ordenar alfabéticamente
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre))

    return lista
  }

  /* ===================== CREAR RETO ===================== */
    // ===================== CREAR RETO =====================
async crearReto(d: {
  id_institucion: number
  creado_por: number
  cantidad?: number
  area: string
  oponente_id: number
}) {
  // normalizamos el área que venga "sociales" -> "Sociales"
  const canon = (s: string) => {
    const t = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    if (t.startsWith('mate')) return 'Matematicas'
    if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje'
    if (t.startsWith('cien')) return 'Ciencias'
    if (t.startsWith('soci')) return 'Sociales'
    if (t.startsWith('ing'))  return 'Ingles'
    return s || 'General'
  }

  const TARGET = Math.max(1, Number(d.cantidad ?? 25))
  const area = canon(d.area) as Area
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
    time_limit_seconds: 60,
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
          time_limit_seconds: 60,
        })
      }
    }
  }

  //  Serializamos para DBs con columnas TEXT
  const reglasObj = { limite_seg: 60, preguntas: elegidas.map(mapPreguntaForClient) }
  const participantesArr = [d.creado_por, oponente]

  const reto = await Reto.create({
    id_institucion: d.id_institucion,
    creado_por: d.creado_por,
    tipo: '1v1',
    area,
    estado: 'pendiente',
    participantes_json: JSON.stringify(participantesArr),
    reglas_json: JSON.stringify(reglasObj),
    resultados_json: null,
  } as any)

  // Info del oponente
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

  return {
    id_reto: Number((reto as any).id_reto),
    estado: String((reto as any).estado), // 'pendiente'
    area,
    cantidad: reglasObj.preguntas.length,
    // NO devolver preguntas al crear el reto - solo se devuelven cuando el oponente acepta
    preguntas: [], // El creador NO debe ver las preguntas hasta que el oponente acepte
    oponente: oponente_info,
  }
}


  /* ===================== ACEPTAR RETO ===================== */
  // ====== RetosService.aceptarReto (FIX idempotente) ======
async aceptarReto(id_reto: number, id_usuario_invitado: number) {
  const reto = await Reto.findOrFail(id_reto)

  // 1) Cargar/asegurar preguntas desde reglas_json
  let preguntas: any[] = []
  try {
    const reglas = typeof (reto as any).reglas_json === 'string'
      ? JSON.parse(String((reto as any).reglas_json))
      : (reto as any).reglas_json || {}
    if (Array.isArray(reglas?.preguntas)) preguntas = reglas.preguntas
  } catch {}
  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    const area = (reto as any).area as Area
    const pack = await this.ia.generarPreguntas({
      area, cantidad: 25,
      id_institucion: Number((reto as any).id_institucion) || undefined,
      time_limit_seconds: null,
    } as any)
    preguntas = (pack || []).map(mapPreguntaForClient)
    ;(reto as any).reglas_json = { limite_seg: null, preguntas }
    await reto.save()
  }

  // 2) Participantes: UNIÓN (existentes + creador + quien acepta)
  const creador = Number((reto as any).creado_por) || null

  const parseIds = (raw: any): number[] => {
    try {
      if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite)
      if (typeof raw === 'string') {
        try { const j = JSON.parse(raw); if (Array.isArray(j)) return j.map(Number).filter(Number.isFinite) } catch {}
        return raw.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
      }
    } catch {}
    return []
  }

  const existentes = parseIds((reto as any).participantes_json)
  const participantes = Array.from(
    new Set<number>([
      ...existentes,
      ...(creador ? [creador] : []),
      Number(id_usuario_invitado),
    ])
  )

  // 3) Leer mapeo sesiones guardado (si ya había)
  let mapSesiones: Array<{ id_usuario: number; id_sesion: number }> = []
  try {
    const raw = (reto as any).resultados_json
    const obj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    if (Array.isArray(obj?.sesiones_por_usuario)) mapSesiones = obj.sesiones_por_usuario
  } catch {}

  const yaTieneSesion = (uid: number) =>
    mapSesiones.some((x) => Number(x.id_usuario) === Number(uid))

  // 4) Crear sesión SOLO para el usuario que está aceptando (NO para todos)
  // IMPORTANTE: El creador NO debe tener sesión hasta que el OPONENTE acepte
  const usuarioQueAcepta = Number(id_usuario_invitado)
  const esCreador = creador === usuarioQueAcepta
  
    // IMPORTANTE: Cuando el OPONENTE acepta, automáticamente crear sesión para AMBOS y cambiar a 'en_curso'
    // El creador NO necesita aceptar explícitamente
    const esOponente = !esCreador
    
    // Si el oponente acepta, crear sesión para ambos y cambiar estado a 'en_curso'
    if (esOponente && (reto as any).estado === 'pendiente') {
      console.log(`[aceptarReto] Oponente ${usuarioQueAcepta} acepta el reto - creando sesiones para ambos participantes`)
      
      // Crear sesión para el oponente (quien acepta)
      if (!yaTieneSesion(usuarioQueAcepta)) {
        const sesOponente = await Sesion.create({
          id_usuario: usuarioQueAcepta,
          tipo: 'reto',
          modo: 'estandar',
          area: (reto as any).area || null,
          usa_estilo_kolb: false,
          inicio_at: DateTime.local(),
          total_preguntas: preguntas.length,
          correctas: 0,
        } as any)

        const id_sesion_oponente = Number((sesOponente as any).id_sesion)
        let orden = 1
        for (const p of preguntas) {
          await SesionDetalle.create({
            id_sesion: id_sesion_oponente,
            id_pregunta: Number((p as any).id_pregunta) || null,
            orden,
          } as any)
          orden++
        }
        mapSesiones.push({ id_usuario: usuarioQueAcepta, id_sesion: id_sesion_oponente })
        console.log(`[aceptarReto] Sesión creada para oponente ${usuarioQueAcepta}, id_sesion=${id_sesion_oponente}`)
      }
      
      // Crear sesión para el creador automáticamente
      if (!yaTieneSesion(creador)) {
        const sesCreador = await Sesion.create({
          id_usuario: creador,
          tipo: 'reto',
          modo: 'estandar',
          area: (reto as any).area || null,
          usa_estilo_kolb: false,
          inicio_at: DateTime.local(),
          total_preguntas: preguntas.length,
          correctas: 0,
        } as any)

        const id_sesion_creador = Number((sesCreador as any).id_sesion)
        let orden = 1
        for (const p of preguntas) {
          await SesionDetalle.create({
            id_sesion: id_sesion_creador,
            id_pregunta: Number((p as any).id_pregunta) || null,
            orden,
          } as any)
          orden++
        }
        mapSesiones.push({ id_usuario: creador, id_sesion: id_sesion_creador })
        console.log(`[aceptarReto] Sesión creada para creador ${creador}, id_sesion=${id_sesion_creador}`)
      }
      
      // Cambiar estado a 'en_curso' inmediatamente
      ;(reto as any).estado = 'en_curso'
      ;(reto as any).participantes_json = JSON.stringify(participantes)
      ;(reto as any).resultados_json = JSON.stringify({ sesiones_por_usuario: mapSesiones })
      await reto.save()
      
      console.log(`[aceptarReto] Reto ${id_reto} cambió a 'en_curso' - ambos participantes tienen sesión`)
      
      // Devolver preguntas inmediatamente ya que el estado es 'en_curso'
      return {
        reto: {
          id_reto: Number((reto as any).id_reto),
          estado: 'en_curso',
          participantes,
        },
        sesiones: mapSesiones,
        preguntas: preguntas, // Devolver preguntas inmediatamente
      }
    }
  
    // Si el creador intenta aceptar (aunque ya no debería ser necesario), solo crear su sesión si no la tiene
    if (esCreador) {
      console.log(`[aceptarReto] Creador ${creador} intenta aceptar - verificando si ya tiene sesión`)
    }
  
    // Solo crear sesión si el usuario que acepta aún no tiene una
    if (!yaTieneSesion(usuarioQueAcepta)) {
    const ses = await Sesion.create({
      id_usuario: usuarioQueAcepta,
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
        // tiempo_asignado_seg: (p as any).time_limit_seconds ?? null, // ⚠️ Comentado - columna no existe en BD producción
      } as any)
      orden++
    }
    mapSesiones.push({ id_usuario: usuarioQueAcepta, id_sesion })
  }

  // 5) Actualizar participantes_json
  ;(reto as any).participantes_json = JSON.stringify(participantes)
  ;(reto as any).resultados_json = JSON.stringify({ sesiones_por_usuario: mapSesiones })

  // 6) Cambiar estado a 'en_curso' SOLO cuando ambos hayan aceptado (ambos tienen sesión)
  // Verificar que ambos participantes (creador y oponente) tengan sesión
  const participantesEsperados = participantes.length
  const sesionesCreadas = mapSesiones.length
  
  // Verificar que ambos participantes únicos tienen sesión
  const idsConSesion = new Set(mapSesiones.map((s: any) => Number(s.id_usuario)))
  const todosTienenSesion = participantes.every((uid: number) => idsConSesion.has(uid))
  
  // Solo cambiar a 'en_curso' cuando ambos participantes tienen sesión
  if (todosTienenSesion && participantesEsperados >= 2) {
    ;(reto as any).estado = 'en_curso'
    console.log(`[aceptarReto] Reto ${id_reto} cambió a 'en_curso' - ambos participantes tienen sesión`)
  } else {
    // Si solo uno aceptó, mantener en 'pendiente'
    ;(reto as any).estado = 'pendiente'
    console.log(`[aceptarReto] Reto ${id_reto} se mantiene en 'pendiente' - solo ${sesionesCreadas} de ${participantesEsperados} tienen sesión`)
  }

  await reto.save()



  // 6) Respuesta que tu Android ya consume
  // IMPORTANTE: Solo devolver preguntas si el estado es 'en_curso' (ambos aceptaron)
  // Si el estado es 'pendiente', NO devolver preguntas
  const estadoFinal = String((reto as any).estado)
  const preguntasADevolver = estadoFinal === 'en_curso' ? preguntas : []
  
  // Obtener información del oponente (el otro participante)
  const otroId = participantes.find((id) => Number(id) !== Number(id_usuario_invitado)) ?? null
  let oponente_info = null as null | {
    id_usuario: number; nombre: string; grado: any; curso: any; foto_url: any
  }
  if (otroId) {
    const u = await Usuario.find(otroId)
    if (u) {
      const mkNom = (usuario: any) => {
        if (!usuario) return null
        return {
          id_usuario: Number((usuario as any).id_usuario),
          nombre: [ (usuario as any).nombre, (usuario as any).apellido ].filter(Boolean).join(' ').trim(),
          grado: (usuario as any).grado ?? null,
          curso: (usuario as any).curso ?? null,
          foto_url: (usuario as any).foto_url ?? null,
        }
      }
      oponente_info = mkNom(u) as any
    }
  }
  
  return {
    reto: {
      id_reto: Number((reto as any).id_reto),
      estado: estadoFinal,
      participantes,
    },
    sesiones: mapSesiones,
    preguntas: preguntasADevolver, // Solo devolver preguntas si el estado es 'en_curso'
    oponente: oponente_info, // Información del oponente con foto_url
  }
}



async responderRonda(d: {
  id_sesion: number
  respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }>
}) {
  const ses = await Sesion.findOrFail(d.id_sesion)

  // ===== Helpers locales (no cambian nada fuera de este método) =====
  const parseParticipantes = (raw: any): number[] => {
    if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite)
    if (typeof raw === 'string') {
      try { const a = JSON.parse(raw); if (Array.isArray(a)) return a.map(Number).filter(Number.isFinite) } catch {}
      return raw.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
    }
    return []
  }

  const findRetoBySesionId = async (idSesion: number) => {
    const retos = await Reto.query()
      .whereIn('estado', ['pendiente', 'en_curso', 'finalizado'])
      .orderBy('id_reto', 'desc')

    for (const r of retos as any[]) {
      try {
        const raw = (r as any).resultados_json
        const obj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
        const arr = Array.isArray(obj?.sesiones_por_usuario) ? obj.sesiones_por_usuario : []
        if (arr.some((x: any) => Number(x.id_sesion) === Number(idSesion))) return r
      } catch {}
    }
    return null
  }

  const buildResumen = async (reto: any) => {
    const participantes = parseParticipantes((reto as any).participantes_json).sort((a,b)=>a-b)

    // Leer el mapeo guardado
    let mapSes: Array<{ id_usuario: number; id_sesion: number; correctas?: number }> = []
    try {
      const raw = (reto as any).resultados_json
      const obj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
      if (Array.isArray(obj?.sesiones_por_usuario)) mapSes = obj.sesiones_por_usuario
    } catch {}

    // Armar stats iguales para ambos
    const jugadores: Array<{ id_usuario: number; correctas: number; tiempo_total_seg: number }> = []
    for (const uid of participantes) {
      const m = mapSes.find((x) => Number(x.id_usuario) === Number(uid))
      let sRow: any = m ? await Sesion.find(m.id_sesion) : null
      if (!sRow) {
        sRow = await Sesion.query()
          .where('tipo', 'reto')
          .where('id_usuario', uid)
          .orderBy('inicio_at', 'desc')
          .first()
      }
      if (!sRow) continue

      const dets = await SesionDetalle.query().where('id_sesion', Number((sRow as any).id_sesion))
      const corr = dets.filter((d: any) => d.es_correcta === true).length
      const ttot = dets.reduce((a: number, b: any) => a + (Number(b.tiempo_empleado_seg) || 0), 0)

      jugadores.push({ id_usuario: uid, correctas: corr, tiempo_total_seg: ttot })
    }

    // Ganador solo cuando ambos tienen datos
    let ganador: number | null = null
    if (jugadores.length >= 2) {
      const [a, b] = jugadores
      if (a.correctas > b.correctas) ganador = a.id_usuario
      else if (b.correctas > a.correctas) ganador = b.id_usuario
      else ganador = (a.tiempo_total_seg <= b.tiempo_total_seg) ? a.id_usuario : b.id_usuario
    }

    return { id_reto: Number((reto as any).id_reto), jugadores, ganador }
  }
  // ===== Fin helpers =====

  // === Detalles & banco ===
  const detalles = await SesionDetalle.query()
    .where('id_sesion', Number((ses as any).id_sesion))
    .orderBy('orden', 'asc')

  const ids = detalles.map((x: any) => Number(x.id_pregunta)).filter(Boolean)
  const banco = ids.length ? await BancoPregunta.query().whereIn('id_pregunta', ids) : []

  const correctaDe = new Map<number, string>()
  for (const b of banco) {
    correctaDe.set(Number((b as any).id_pregunta), String((b as any).respuesta_correcta || '').toUpperCase())
  }

  // === Procesar respuestas ===
  let correctas = 0
  let tiempo_total_seg = 0 // IMPORTANTE: Iniciar en 0, no en 60
  for (const r of d.respuestas || []) {
    const det = detalles.find((x: any) => Number(x.orden) === Number(r.orden))
    if (!det) continue

    ;(det as any).alternativa_elegida = r.opcion
    const t = Number(r.tiempo_empleado_seg)
    // IMPORTANTE: tiempo_empleado_seg es INTEGER en BD, redondear a entero
    const tOk = Number.isFinite(t) ? Math.round(t) : 0
    ;(det as any).tiempo_empleado_seg = tOk
    tiempo_total_seg += tOk // Sumar todos los tiempos reales
    ;(det as any).respondida_at = DateTime.local()

    const idp = Number((det as any).id_pregunta)
    // Si opcion es vacío o null, es incorrecta (valor 0) - no respondió
    const opcion = String(r.opcion || '').trim()
    const ok = opcion.length > 0 && String(opcion.toUpperCase()) === (correctaDe.get(idp) || '')
    ;(det as any).es_correcta = ok
    if (ok) correctas++

    await det.save()
  }

  // === Guardar resumen sesión ===
  ;(ses as any).correctas = correctas
  ;(ses as any).puntaje_porcentaje = Math.round(
    (correctas * 100) / Math.max(1, Number((ses as any).total_preguntas))
  )
  ;(ses as any).fin_at = DateTime.local()
  await ses.save()

  // === Ubicar el reto que contiene esta sesión (robusto y simétrico) ===
  let reto = await findRetoBySesionId(Number((ses as any).id_sesion))

  // Si por alguna razón no lo encontró, intentamos uno en curso reciente (fallback)
  if (!reto) {
    reto = await Reto.query().where('estado', 'en_curso').orderBy('id_reto', 'desc').first()
  }

  let resumenReto = { id_reto: null as number | null, jugadores: [] as Array<{id_usuario:number;correctas:number;tiempo_total_seg:number}>, ganador: null as number | null }

  if (reto) {
    // 1) Persistir/actualizar esta sesión en resultados_json
    let resObj: any = {}
    try {
      const raw = (reto as any).resultados_json
      resObj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    } catch {}
    if (!Array.isArray(resObj.sesiones_por_usuario)) resObj.sesiones_por_usuario = []

    const idx = resObj.sesiones_por_usuario.findIndex(
      (x: any) => Number(x.id_sesion) === Number((ses as any).id_sesion)
    )
    const payloadSes = {
      id_usuario: Number((ses as any).id_usuario),
      id_sesion: Number((ses as any).id_sesion),
      correctas,
      tiempo_total_seg,
      finalizada: true,
    }
    if (idx >= 0) resObj.sesiones_por_usuario[idx] = { ...resObj.sesiones_por_usuario[idx], ...payloadSes }
    else resObj.sesiones_por_usuario.push(payloadSes)

    // ...
;(reto as any).resultados_json = JSON.stringify(resObj) // << stringify SIEMPRE
await reto.save()

// Si ambos terminaron:
if (resumenReto.jugadores.length >= 2 && resumenReto.ganador != null) {
  ;(reto as any).estado = 'finalizado'
  try {
    const raw = (reto as any).resultados_json
    const obj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    obj.ganador_id = resumenReto.ganador
    ;(reto as any).resultados_json = JSON.stringify(obj) // << stringify
    await reto.save()
  } catch {}
}


    // 2) Construir SIEMPRE el mismo resumen para ambos
    const snap = await buildResumen(reto)
    resumenReto = { ...snap }

    // 3) Si ambos terminaron, cerrar reto y fijar ganador en resultados_json
   if (resumenReto.jugadores.length >= 2 && resumenReto.ganador != null) {
  ;(reto as any).estado = 'finalizado'
  try {
    const raw = (reto as any).resultados_json
    const obj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    obj.ganador_id = resumenReto.ganador
    ;(reto as any).resultados_json = obj
    await reto.save()
  } catch {}
  // ---> NUEVO: aplicar marcador (idempotente)
  await this._aplicarMarcadoresFinal(reto, resumenReto.ganador)
}



  // === Respuesta (misma estructura para los dos jugadores) ===
  return {
    id_sesion: Number((ses as any).id_sesion),
    correctas,
    puntaje: Number((ses as any).puntaje_porcentaje),
    resumenReto, // { id_reto, jugadores: [{id_usuario, correctas, tiempo_total_seg}], ganador }
  }
}
}


  /* ===================== ESTADO DEL RETO ===================== */
  async estadoReto(id_reto: number) {
    const reto = await Reto.findOrFail(id_reto)
    
    // IMPORTANTE: Verificar timeout SOLO para retos pendientes (no afectar retos en curso o finalizados)
    const estadoInicial = String((reto as any).estado || '')
    if (estadoInicial === 'pendiente') {
      await this.verificarTimeoutRetos()
      // Recargar el reto después de verificar timeout (puede haber cambiado a 'cancelado')
      await reto.refresh()
    }

    // Participantes
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

    // Sesiones mapeadas
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

    // IMPORTANTE: Solo calcular resumen si el reto está 'en_curso' o 'finalizado'
    // Si está 'pendiente', no buscar sesiones ni finalizar nada
    const estadoActual = String((reto as any).estado || '')
    
    if (estadoActual !== 'en_curso' && estadoActual !== 'finalizado') {
      // Si el reto está 'pendiente' o 'cancelado', solo devolver el estado sin calcular nada más
      return {
        id_reto: Number((reto as any).id_reto),
        estado: estadoActual,
        ganador: null,
        jugadores: [],
      }
    }

    // Resumen por jugador (solo si el reto está en curso o finalizado)
    const jugadores: Array<{ id_usuario: number; correctas: number; tiempo_total_seg: number; total_respuestas: number }> = []

    for (const uid of participantes) {
      const entry = mapSesiones.find((x) => Number(x.id_usuario) === Number(uid))
      let ses = null

      if (entry) {
        ses = await Sesion.find(entry.id_sesion)
      } else {
        // NO buscar sesiones de otros retos - solo las del mapeo
        continue
      }

      if (!ses) continue

      // IMPORTANTE: Solo contar jugadores que terminaron (sesión cerrada)
      const sesionCerrada = (ses as any).fin_at != null
      if (!sesionCerrada) {
        // El jugador aún no terminó, no incluirlo en el cálculo de ganador ni finalización
        continue
      }

      let correctas = Number((ses as any).correctas) || 0
      let tiempo = 0
      let totalRespuestas = 0

      const dets = await SesionDetalle.query().where('id_sesion', Number((ses as any).id_sesion))
      
      // Contar respuestas que realmente fueron respondidas (tienen alternativa_elegida o tiempo_empleado_seg)
      totalRespuestas = dets.filter((d: any) => 
        d.alternativa_elegida != null || d.tiempo_empleado_seg != null
      ).length
      
      // Si correctas no está en la sesión, calcularlo desde los detalles
      if (correctas === 0 || !correctas) {
        correctas = dets.filter((d: any) => d.es_correcta === true).length
      }
      tiempo = dets.reduce((a: number, b: any) => a + (Number(b.tiempo_empleado_seg) || 0), 0)

      jugadores.push({ id_usuario: uid, correctas, tiempo_total_seg: tiempo, total_respuestas: totalRespuestas })
    }

    // Obtener el total de preguntas esperadas del reto
    const totalPreguntasEsperadas = Number((reto as any).total_preguntas) || 
                                     (() => {
                                       try {
                                         const reglas = typeof (reto as any).reglas_json === 'string'
                                           ? JSON.parse((reto as any).reglas_json)
                                           : (reto as any).reglas_json || {}
                                         return Array.isArray(reglas?.preguntas) ? reglas.preguntas.length : 25
                                       } catch { return 25 }
                                     })()

    // Ganador (solo si hay jugadores con respuestas)
    let ganador: number | null = null
    if (jugadores.length >= 2) {
      const [a, b] = jugadores
      if (a.correctas > b.correctas) ganador = a.id_usuario
      else if (b.correctas > a.correctas) ganador = b.id_usuario
      else ganador = a.tiempo_total_seg <= b.tiempo_total_seg ? a.id_usuario : b.id_usuario
    }

    // Finaliza SOLO cuando todos respondieron TODAS las preguntas Y el reto está en curso
    // IMPORTANTE: Verificar que ambos jugadores hayan respondido TODAS las preguntas esperadas
    const todosRespondieronTodas = estadoActual === 'en_curso' && 
                                     jugadores.length >= participantes.length && 
                                     jugadores.every(j => j.total_respuestas >= totalPreguntasEsperadas)
    if (todosRespondieronTodas) {
      let resObj: any = {}
      try {
        const raw = (reto as any).resultados_json
        resObj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
      } catch {}
      resObj.ganador_id = ganador
      try {
        reto.merge({ estado: 'finalizado', resultados_json: JSON.stringify(resObj) })
        await reto.save()
      } catch {
        reto.merge({ estado: 'finalizado', resultados_json: JSON.stringify(resObj) })
        await reto.save()
      }
      await this._aplicarMarcadoresFinal(reto as any, ganador ?? null)
    }

    // Devolver solo id_usuario, correctas, tiempo_total_seg (sin total_respuestas)
    const jugadoresRespuesta = jugadores.map(j => ({
      id_usuario: j.id_usuario,
      correctas: j.correctas,
      tiempo_total_seg: j.tiempo_total_seg,
    }))

    return {
      id_reto: Number((reto as any).id_reto),
      estado: String((reto as any).estado),
      ganador: ganador ?? null,
      jugadores: jugadoresRespuesta,
    }
  }

  /* ===================== LISTAR RETOS (recibidos/enviados/todos) ===================== */
  async listarRetos(d: {
    id_institucion: number
    user_id: number
    tipo?: 'recibidos' | 'enviados' | 'todos'
    estado?: 'pendiente' | 'en_curso' | 'finalizado'
    q?: string
  }) {
    const tipo = (d.tipo || 'todos') as 'recibidos' | 'enviados' | 'todos'
    const estados = d.estado ? [d.estado] : ['pendiente', 'en_curso']

    const rows = await Reto.query()
      .where('id_institucion', d.id_institucion)
      .whereIn('estado', estados)
      .orderBy('id_reto', 'desc')

    const mine = rows.filter((r: any) => {
      const creadorId = Number(r.creado_por)
      const parts = parseIds(r.participantes_json)
      const soyParticipante = parts.includes(d.user_id)
      
      // Debug logs para recibidos
      if (tipo === 'recibidos') {
        console.log(`[listarRetos] tipo=recibidos, user_id=${d.user_id}, creadorId=${creadorId}, participantes=${JSON.stringify(parts)}, soyParticipante=${soyParticipante}, estado=${r.estado}`)
      }
      
      if (tipo === 'enviados')   return creadorId === d.user_id
      if (tipo === 'recibidos')  return creadorId !== d.user_id && soyParticipante
      return creadorId === d.user_id || soyParticipante
    })

    if (mine.length === 0) return []

    const idsUsuarios = new Set<number>()
    for (const r of mine) {
      idsUsuarios.add(Number((r as any).creado_por))
      parseIds((r as any).participantes_json).forEach((x) => idsUsuarios.add(x))
    }
    const usuarios = idsUsuarios.size
      ? await Usuario.query().whereIn('id_usuario', Array.from(idsUsuarios))
      : []
    const byId = new Map<number, any>()
    for (const u of usuarios) byId.set(Number((u as any).id_usuario), u)

    const res = mine.map((r: any) => {
      const idReto   = Number(r.id_reto)
      const area     = String(r.area || '')
      const estadoR  = String(r.estado || '')
      const creadorId = Number(r.creado_por)
      const parts    = parseIds(r.participantes_json)
      const oppId    = parts.find((id) => id !== creadorId)

      const creador  = mkNom(byId.get(creadorId))
      const oponente = (typeof oppId === 'number') ? mkNom(byId.get(oppId)) : null

      return {
        id_reto: idReto,
        area,
        estado: estadoR,
        creado_en: r.createdAt?.toISO?.() || r.created_at || null,
        creador,
        oponente,
      }
    })

    if (d.q && d.q.trim()) {
      const term = d.q.trim().toLowerCase()
      return res.filter((it) =>
        (it.area || '').toLowerCase().includes(term) ||
        (it.creador?.nombre || '').toLowerCase().includes(term) ||
        (it.oponente?.nombre || '').toLowerCase().includes(term),
      )
    }

    return res
  }

  // === Dentro de export default class RetosService { ... } ===

/** Arranca un reto para un usuario: valida pertenencia, localiza su sesión y entrega la siguiente pregunta */
async arranqueReto(id_reto: number, id_usuario: number) {
  const reto = await Reto.findOrFail(id_reto)

  // Helpers locales reutilizando utilidades ya declaradas arriba (parseIds, mkNom, mapPreguntaForClient)
  const participantes = ((): number[] => {
    const raw = (reto as any).participantes_json
    try {
      if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite)
      if (typeof raw === 'string') {
        try {
          const j = JSON.parse(raw)
          if (Array.isArray(j)) return j.map(Number).filter(Number.isFinite)
        } catch {
          return raw.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
        }
      }
    } catch {}
    return []
  })()

  if (!participantes.includes(Number(id_usuario))) {
    throw new Error('No perteneces a este reto.')
  }

  // Oponente (para UI)
  const otroId = participantes.find((id) => Number(id) !== Number(id_usuario)) ?? null
  let oponente = null as null | {
    id: number; nombre: string; grado: any; curso: any; foto_url: any
  }
  if (otroId) {
    const u = await Usuario.find(otroId)
    oponente = mkNom(u) as any
  }

  // Localizar mi sesión en resultados_json.sesiones_por_usuario
  let idSesion: number | null = null
  try {
    const raw = (reto as any).resultados_json
    const obj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    const arr = Array.isArray(obj?.sesiones_por_usuario) ? obj.sesiones_por_usuario : []
    const mine = arr.find((x: any) => Number(x.id_usuario) === Number(id_usuario))
    if (mine) idSesion = Number(mine.id_sesion)
  } catch {}

  // Si no hay sesión, debe aceptar primero
  if (!idSesion) {
    return {
      id_reto: Number((reto as any).id_reto),
      estado: String((reto as any).estado),
      requiere_aceptar: true,
      mensaje: 'Debes aceptar el reto para iniciar.',
      oponente,
    }
  }

  // Cargar sesión y detalles
  const ses = await Sesion.find(idSesion)
  if (!ses) {
    return {
      id_reto: Number((reto as any).id_reto),
      estado: String((reto as any).estado),
      requiere_aceptar: true,
      mensaje: 'Sesión no encontrada. Vuelve a aceptar el reto.',
      oponente,
    }
  }

  const detalles = await SesionDetalle.query()
    .where('id_sesion', Number(idSesion))
    .orderBy('orden', 'asc')

  const total = Number((ses as any).total_preguntas) || detalles.length || 0
  const respondidas = detalles.filter((d: any) => d.alternativa_elegida != null).length
  const siguiente = detalles.find((d: any) => d.alternativa_elegida == null) || null

  if (siguiente) {
    const banco = await BancoPregunta.find(Number((siguiente as any).id_pregunta))
    const base = banco
      ? {
          id_pregunta: Number((banco as any).id_pregunta),
          area: (banco as any).area,
          subtema: (banco as any).subtema,
          dificultad: (banco as any).dificultad,
          pregunta: (banco as any).pregunta,
          opciones: (banco as any).opciones,
          time_limit_seconds: (siguiente as any).tiempo_asignado_seg ?? null,
        }
      : {
          id_pregunta: Number((siguiente as any).id_pregunta) || null,
          area: null,
          subtema: null,
          dificultad: null,
          pregunta: null,
          opciones: null,
          time_limit_seconds: (siguiente as any).tiempo_asignado_seg ?? null,
        }

    return {
      id_reto: Number((reto as any).id_reto),
      estado: String((reto as any).estado),
      mi_sesion: {
        id_sesion: Number(idSesion),
        total_preguntas: total,
        respondidas,
        siguiente_orden: Number((siguiente as any).orden),
        progreso_porcentaje: Math.round((respondidas * 100) / Math.max(1, total)),
      },
      pregunta_actual: {
        orden: Number((siguiente as any).orden),
        ...mapPreguntaForClient(base),
      },
      oponente,
    }
  }

  // Si no hay siguiente pregunta, ya terminó: devolver resumen
  const resumen = await this.estadoReto(Number((reto as any).id_reto))

  return {
    id_reto: Number((reto as any).id_reto),
    estado: 'finalizado',
    mi_sesion: {
      id_sesion: Number(idSesion),
      total_preguntas: total,
      respondidas,
      siguiente_orden: null,
      progreso_porcentaje: 100,
    },
    resumenReto: resumen,
    oponente,
  }
}

  
// Dentro de export default class RetosService { ... }
private async _aplicarMarcadoresFinal(reto: any, ganadorId: number | null) {
  try {
    // Parse participantes desde el JSON flexible que ya usas
    const participantes = parseIds((reto as any).participantes_json);

    // Evitar doble conteo: marcamos en resultados_json
    let resObj: any = {};
    try {
      const raw = (reto as any).resultados_json;
      resObj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch {}

    if (resObj?._marcadores_aplicados) return; // ya se aplicó

    // Sumar 1 victoria al ganador y 1 derrota a los demás
    if (Number.isFinite(Number(ganadorId))) {
      const ganador = Number(ganadorId);
      // +1 victoria
      await Usuario.query().where('id_usuario', ganador).increment('victorias', 1);
      // +1 derrota a todo el que no sea el ganador
      const perdedores = participantes.filter((id) => Number(id) !== ganador);
      if (perdedores.length) {
        await Usuario.query().whereIn('id_usuario', perdedores).increment('derrotas', 1);
      }
    }

    // Persistir marca para no volver a contar
    resObj = { ...resObj, ganador_id: ganadorId ?? null, _marcadores_aplicados: true };
    (reto as any).resultados_json = resObj;
    await reto.save();
  } catch {
    // Silencioso: no rompas el cierre del reto si falla el conteo
  }
  }

  /* ===================== RECHAZAR RETO ===================== */
  async rechazarReto(id_reto: number, id_usuario: number) {
    const reto = await Reto.findOrFail(id_reto)
    
    // Parsear participantes
    const participantes = ((): number[] => {
      const raw = (reto as any).participantes_json
      try {
        if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite)
        if (typeof raw === 'string') {
          try {
            const j = JSON.parse(raw)
            if (Array.isArray(j)) return j.map(Number).filter(Number.isFinite)
          } catch {
            return raw.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
          }
        }
      } catch {}
      return []
    })()
    
    // Verificar que el usuario es participante (debe ser el invitado, no el creador)
    if (!participantes.includes(Number(id_usuario))) {
      throw new Error('No perteneces a este reto.')
    }
    
    // Solo permitir rechazar si el reto está en estado 'pendiente'
    const estado = String((reto as any).estado || '').toLowerCase()
    if (estado !== 'pendiente') {
      throw new Error('Solo se puede rechazar un reto pendiente.')
    }
    
    // Marcar reto como cancelado/rechazado
    ;(reto as any).estado = 'cancelado'
    await reto.save()
    
    return { message: 'Reto rechazado exitosamente', id_reto: Number((reto as any).id_reto) }
  }

  /* ===================== ABANDONAR RETO ===================== */
  async abandonarReto(id_reto: number, id_usuario: number) {
    const reto = await Reto.findOrFail(id_reto)
    
    // Parsear participantes
    const participantes = ((): number[] => {
      const raw = (reto as any).participantes_json
      try {
        if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite)
        if (typeof raw === 'string') {
          try {
            const j = JSON.parse(raw)
            if (Array.isArray(j)) return j.map(Number).filter(Number.isFinite)
          } catch {
            return raw.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
          }
        }
      } catch {}
      return []
    })()
    
    // Verificar que el usuario es participante
    if (!participantes.includes(Number(id_usuario))) {
      throw new Error('No perteneces a este reto.')
    }
    
    // Solo permitir abandonar si el reto está en estado 'pendiente' o 'en_curso'
    const estado = String((reto as any).estado || '').toLowerCase()
    if (estado !== 'pendiente' && estado !== 'en_curso') {
      throw new Error('No se puede abandonar un reto finalizado o cancelado.')
    }
    
    // Marcar reto como cancelado/abandonado
    ;(reto as any).estado = 'cancelado'
    await reto.save()
    
    return { message: 'Reto abandonado exitosamente', id_reto: Number((reto as any).id_reto) }
  }

  /* ===================== TIMEOUT DE 4 MINUTOS ===================== */
  // Este método puede ser llamado por un cron job o verificado en el estado del reto
  async verificarTimeoutRetos() {
    const ahora = DateTime.now()
    const limite = ahora.minus({ minutes: 4 })
    
    // Buscar retos pendientes que fueron creados hace más de 4 minutos
    const retosPendientes = await Reto.query()
      .where('estado', 'pendiente')
      .where('created_at', '<', limite.toJSDate() as any)
    
    for (const reto of retosPendientes) {
      ;(reto as any).estado = 'cancelado'
      await reto.save()
    }
    
    return { cancelados: retosPendientes.length }
  }

}
