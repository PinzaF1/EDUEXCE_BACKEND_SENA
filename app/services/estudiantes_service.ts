// app/services/estudiantes_service.ts
import type { HttpContext } from '@adonisjs/core/http'
import bcrypt from 'bcrypt'
import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'
import fs from 'node:fs/promises'
import * as xlsx from 'xlsx'
import { parse as parseCsv } from 'csv-parse/sync'
import jwt, { Secret } from 'jsonwebtoken'

const SECRET: Secret = (process.env.JWT_SECRET ?? 'secret123') as Secret
const IMPORT_FIRMA = 'svc-estudiantes-uni-global-v1' // opcional: para verificar versión

// ===== Helpers de normalización =====
const clean = (v: any) => {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}
const up = (v: any) => (clean(v)?.toUpperCase() ?? null)
const low = (v: any) => (clean(v)?.toLowerCase() ?? null)

function normGrado(g: any): string | null {
  const s = low(g)
  if (!s) return null
  if (s.includes('10')) return '10'
  if (s.includes('11')) return '11'
  const num = s.replace(/\D/g, '')
  if (num === '10' || num === '11') return num
  return null
}
function normCurso(c: any): string | null {
  const s = clean(c)
  return s ? s.toUpperCase() : null
}
function normJornada(j: any): string | null {
  const s = low(j)
  if (!s) return null
  if (['mañana', 'manana'].includes(s)) return 'mañana'
  if (s.includes('tarde')) return 'tarde'
  if (s.includes('completa')) return 'completa'
  return null
}
function normEmail(e: any): string | null {
  const s = low(e)
  return s && s.includes('@') ? s : null
}

export default class EstudiantesService {
  private claveInicial(numero_documento: string, apellido: string) {
    return `${numero_documento}${(apellido || '').toLowerCase().slice(-3)}`
  }


  // ===== Crear/actualizar 1 estudiante (admin) =====
  async crearUno(d: {
    id_institucion: number
    tipo_documento: string
    numero_documento: string
    nombre: string
    apellido: string
    correo?: string | null
    direccion?: string | null
    telefono?: string | null
    grado?: string | null
    curso?: string | null
    jornada?: string | null
  }) {
    // Normalizar
    const payload = {
      id_institucion: Number(d.id_institucion),
      tipo_documento: up(d.tipo_documento),
      numero_documento: clean(d.numero_documento),
      nombre: clean(d.nombre),
      apellido: clean(d.apellido),
      correo: normEmail(d.correo),
      direccion: clean(d.direccion),
      telefono: clean(d.telefono),
      grado: normGrado(d.grado),
      curso: normCurso(d.curso),
      jornada: normJornada(d.jornada),
    }

    // Validaciones mínimas
    const faltan: string[] = []
    if (!payload.tipo_documento) faltan.push('tipo_documento')
    if (!payload.numero_documento) faltan.push('numero_documento')
    if (!payload.nombre) faltan.push('nombre')
    if (!payload.apellido) faltan.push('apellido')
    if (faltan.length) {
      throw new Error(`Campos obligatorios: ${faltan.join(', ')}`)
    }

    // Unicidad GLOBAL por numero_documento
    const ya = await Usuario.query().where('numero_documento', payload.numero_documento!).first()
    if (ya && (ya as any).id_institucion !== payload.id_institucion) {
      throw new Error('El número de documento ya está registrado en otra institución')
    }

    const plano = this.claveInicial(payload.numero_documento!, payload.apellido!)
    const hash = await bcrypt.hash(plano, 10)

    const u = await Usuario.updateOrCreate(
      {
        id_institucion: payload.id_institucion,
        numero_documento: payload.numero_documento!,
      },
      {
        id_institucion: payload.id_institucion,
        rol: 'estudiante',
        tipo_documento: payload.tipo_documento!,
        numero_documento: payload.numero_documento!,
        nombre: payload.nombre!,
        apellido: payload.apellido!,
        correo: payload.correo ?? null,
        direccion: payload.direccion ?? null,
        telefono: payload.telefono ?? null,
        grado: payload.grado ?? null,
        curso: payload.curso ?? null,
        jornada: payload.jornada ?? null,
        password_hash: hash,
        is_active: true,
      } as any
    )

    return {
      id_usuario: u.id_usuario,
      usuario: payload.numero_documento,
      password_temporal: plano,
      estudiante: {
        id_usuario: u.id_usuario,
        id_institucion: payload.id_institucion,
        rol: 'estudiante',
        tipo_documento: payload.tipo_documento,
        numero_documento: payload.numero_documento,
        nombre: payload.nombre,
        apellido: payload.apellido,
        correo: payload.correo,
        direccion: payload.direccion,
        telefono: payload.telefono,
        grado: payload.grado,
        curso: payload.curso,
        jornada: payload.jornada,
        is_active: true
      },
    }
  }

  /** ===== Importación por ARCHIVO (multipart) ===== */
  async subirCSV({ request, response }: HttpContext) {
    try {
      const auth = (request as any).authUsuario
      const id_institucion = Number(auth.id_institucion)

      const file =
        request.file('file', { size: '20mb' }) ??
        request.file('archivo', { size: '20mb' }) ??
        request.file('estudiantes', { size: '20mb' })

      if (!file) {
        return response.badRequest({
          error: 'Sube un CSV/XLSX en el campo "file" (o "archivo" o "estudiantes")',
        })
      }
      if (!file.isValid) {
        return response.badRequest({ error: 'Archivo inválido', detalle: file.errors })
      }
      if (!file.tmpPath) {
        return response.badRequest({ error: 'No se pudo leer el archivo temporal' })
      }

      let rows: any[] = []
      let parseadoComo: 'xlsx' | 'csv' | null = null

      // Excel
      try {
        const buf = await fs.readFile(file.tmpPath)
        const wb = xlsx.read(buf, { type: 'buffer' })
        if (wb.SheetNames?.length) {
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = xlsx.utils.sheet_to_json(ws, { defval: '', raw: false })
          if (Array.isArray(data) && data.length) {
            rows = data as any[]
            parseadoComo = 'xlsx'
          }
        }
      } catch {
        // pasamos a CSV
      }

      // CSV
      if (!rows.length) {
        let text = (await fs.readFile(file.tmpPath)).toString('utf8')
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
        const header = text.split(/\r?\n/)[0] || ''
        const delimiter =
          (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ';' : ','
        rows = parseCsv(text, { columns: true, skip_empty_lines: true, trim: true, delimiter })
        parseadoComo = 'csv'
      }

      // DEBUG opcional
      const wantsDebug =
        String(request.header('x-debug') || request.qs().debug || '').toLowerCase() === '1'
      if (wantsDebug) {
        console.log('[import][dbg] parseadoComo =>', parseadoComo)
        console.log('[import][dbg] rows.length =>', rows.length)
        if (rows[0]) console.log('[import][dbg] headers (crudos) =>', Object.keys(rows[0]))
      }

      if (!rows.length) {
        return response.badRequest({ error: 'Archivo vacío o ilegible (CSV/XLSX)' })
      }

      // normalizar keys → lower
      rows = rows.map((obj: any) => {
        const out: any = {}
        for (const k of Object.keys(obj)) out[String(k).trim().toLowerCase()] = obj[k]
        return out
      })

      if (wantsDebug && rows[0]) {
        console.log('[import][dbg] headers normalizados =>', Object.keys(rows[0]))
      }

      const mapVal = (r: any, ...keys: string[]) => {
        for (const k of keys) {
          if (r[k] != null && r[k] !== '') return String(r[k]).trim()
        }
        return ''
      }

      // construir candidatos
      const vistos = new Set<string>()
      let duplicados_en_archivo = 0
      const candidatos: any[] = []

      for (const r of rows) {
        const numero_documento = mapVal(r, 'numero_documento', 'documento')
        if (!numero_documento) continue

        if (vistos.has(numero_documento)) {
          duplicados_en_archivo++
          continue
        }
        vistos.add(numero_documento)

        candidatos.push({
          id_institucion,
          tipo_documento: mapVal(r, 'tipo_documento', 'tipo').toUpperCase(),
          numero_documento,
          nombre: mapVal(r, 'nombre', 'nombres', 'nombre_usuario'),
          apellido: mapVal(r, 'apellido', 'apellidos'),
          correo: normEmail(mapVal(r, 'correo', 'email')),
          direccion: clean(mapVal(r, 'direccion')),
          telefono: clean(mapVal(r, 'telefono', 'tel')),
          grado: normGrado(mapVal(r, 'grado')),
          curso: normCurso(mapVal(r, 'curso')),
          jornada: normJornada(mapVal(r, 'jornada')),
        })
      }

      if (wantsDebug) {
        console.log('[import][dbg] candidatos =>', candidatos.length)
        if (candidatos[0]) console.log('[import][dbg] candidato[0] =>', candidatos[0])
      }

      if (!candidatos.length) {
        return response.badRequest({ error: 'No hay registros válidos para importar' })
      }

      // EXISTENTES globalmente (sin filtrar institución)
      const documentos = candidatos.map((c) => c.numero_documento)
      const existentesRows = await Usuario.query()
        .whereIn('numero_documento', documentos)
        .select(['id_usuario', 'numero_documento', 'id_institucion'])

      const existePorDoc = new Map<string, { id_usuario: number; id_institucion: number }>()
      for (const r of existentesRows) {
        existePorDoc.set(String((r as any).numero_documento), {
          id_usuario: (r as any).id_usuario,
          id_institucion: (r as any).id_institucion,
        })
      }

      const aInsertar: any[] = []
      const aActualizar: any[] = []
      const conflictosOtraInst: any[] = []

      for (const c of candidatos) {
        const ex = existePorDoc.get(c.numero_documento)
        if (!ex) aInsertar.push(c)
        else if (ex.id_institucion === id_institucion) aActualizar.push(c)
        else conflictosOtraInst.push({ ...c, id_institucion_existente: ex.id_institucion })
      }

      // insertar (solo los que NO existen en ninguna institución)
      const creadosDocs: string[] = []
      for (const e of aInsertar) {
        const plano = this.claveInicial(e.numero_documento, e.apellido)
        const hash = await bcrypt.hash(plano, 10)
        const u = await Usuario.create({
          id_institucion: e.id_institucion,
          rol: 'estudiante',
          tipo_documento: e.tipo_documento,
          numero_documento: e.numero_documento,
          nombre: e.nombre,
          apellido: e.apellido,
          correo: e.correo,
          direccion: e.direccion,
          telefono: e.telefono,
          grado: e.grado,
          curso: e.curso,
          jornada: e.jornada,
          password_hash: hash,
          is_active: true,
        } as any)
        if (u?.id_usuario) creadosDocs.push(e.numero_documento)
      }

      // actualizar (misma institución; no toca password)
      let actualizados = 0
      for (const e of aActualizar) {
        const ex = existePorDoc.get(e.numero_documento)!
        const u = await Usuario.findOrFail(ex.id_usuario)
        let camb = 0
        const set = (k: keyof any, val: any) => {
          if ((u as any)[k] !== val) { (u as any)[k] = val; camb++ }
        }
        set('tipo_documento', up(e.tipo_documento))
        set('nombre', clean(e.nombre))
        set('apellido', clean(e.apellido))
        set('correo', normEmail(e.correo))
        set('direccion', clean(e.direccion))
        set('telefono', clean(e.telefono))
        set('grado', normGrado(e.grado))
        set('curso', normCurso(e.curso))
        set('jornada', normJornada(e.jornada))
        if (camb) { await u.save(); actualizados++ }
      }

      const omitidos_por_existir =
        candidatos.length - aInsertar.length - aActualizar.length - conflictosOtraInst.length
      const omitidos_por_otras_instituciones = conflictosOtraInst.length
      const omitidos = omitidos_por_existir + omitidos_por_otras_instituciones

      return response.ok({
        firma: IMPORT_FIRMA,
        creados: creadosDocs,
        mensaje: 'Importación finalizada',
        parseado_como: parseadoComo,
        insertados: creadosDocs.length,
        actualizados,
        duplicados_en_archivo,
        duplicados: duplicados_en_archivo, // alias FE
        omitidos_por_existir,
        omitidos_por_otras_instituciones,
        documentos_en_otras_instituciones: conflictosOtraInst.slice(0, 10).map(x => x.numero_documento),
        total_leidos: rows.length,
        omitidos,
      })
    } catch (err: any) {
      return response.badRequest({ error: 'Error al importar', detalle: err?.message || String(err) })
    }
  }

  /** ===== Importación por JSON plano: { filas: [...] } ===== */
  async importarMasivo(id_institucion: number, filas: any[]) {
    const vistos = new Set<string>()
    const candidatos = (Array.isArray(filas) ? filas : []).map((r) => {
      const numero_documento = clean(r.numero_documento ?? r.documento)
      const tipo_documento = up(r.tipo_documento ?? r.tipo)
      const nombre = clean(r.nombre ?? r.nombres)
      const apellido = clean(r.apellido ?? r.apellidos)
      return {
        id_institucion,
        tipo_documento,
        numero_documento,
        nombre,
        apellido,
        correo: normEmail(r.correo),
        direccion: clean(r.direccion),
        telefono: clean(r.telefono),
        grado: normGrado(r.grado),
        curso: normCurso(r.curso),
        jornada: normJornada(r.jornada),
      }
    }).filter((c) => {
      if (!c.numero_documento) return false
      if (vistos.has(c.numero_documento)) return false
      vistos.add(c.numero_documento)
      return true
    })

    // EXISTENTES globalmente
    const existentesRows = await Usuario
      .query()
      .whereIn('numero_documento', candidatos.map((c) => c.numero_documento as string))
      .select(['id_usuario', 'numero_documento', 'id_institucion'])

    const existePorDoc = new Map<string, { id_usuario: number; id_institucion: number }>()
    for (const r of existentesRows) {
      existePorDoc.set(String((r as any).numero_documento), {
        id_usuario: (r as any).id_usuario,
        id_institucion: (r as any).id_institucion,
      })
    }

    const aInsertar: any[] = []
    const aActualizar: any[] = []
    const conflictosOtraInst: any[] = []

    for (const c of candidatos) {
      const ex = existePorDoc.get(c.numero_documento!)
      if (!ex) aInsertar.push(c)
      else if (ex.id_institucion === id_institucion) aActualizar.push(c)
      else conflictosOtraInst.push({ ...c, id_institucion_existente: ex.id_institucion })
    }

    const creadosDocs: string[] = []
    for (const e of aInsertar) {
      const plano = this.claveInicial(e.numero_documento!, e.apellido!)
      const hash = await bcrypt.hash(plano, 10)
      const u = await Usuario.create({ ...e, rol: 'estudiante', password_hash: hash, is_active: true } as any)
      if (u?.id_usuario) creadosDocs.push(e.numero_documento!)
    }

    let actualizados = 0
    for (const e of aActualizar) {
      const ex = existePorDoc.get(e.numero_documento)!
      const u = await Usuario.findOrFail(ex.id_usuario)
      let camb = 0
      const set = (k: keyof any, val: any) => {
        if ((u as any)[k] !== val) { (u as any)[k] = val; camb++ }
      }
      set('tipo_documento', up(e.tipo_documento))
      set('nombre', clean(e.nombre))
      set('apellido', clean(e.apellido))
      set('correo', normEmail(e.correo))
      set('direccion', clean(e.direccion))
      set('telefono', clean(e.telefono))
      set('grado', normGrado(e.grado))
      set('curso', normCurso(e.curso))
      set('jornada', normJornada(e.jornada))
      if (camb) { await u.save(); actualizados++ }
    }

    const omitidos_por_existir =
      candidatos.length - aInsertar.length - aActualizar.length - conflictosOtraInst.length
    const omitidos_por_otras_instituciones = conflictosOtraInst.length
    const omitidos = omitidos_por_existir + omitidos_por_otras_instituciones

    return {
      firma: IMPORT_FIRMA,
      creados: creadosDocs,
      insertados: creadosDocs.length,
      actualizados,
      omitidos_por_existir,
      omitidos_por_otras_instituciones,
      documentos_en_otras_instituciones: conflictosOtraInst.slice(0, 10).map(x => x.numero_documento),
      total_recibidos: filas?.length ?? 0,
      duplicados: 0, // JSON no tiene duplicados de archivo
      omitidos,
    }
  }

  // ===== Listado con filtros =====
  async listar(d: { id_institucion: number; grado?: string; curso?: string; jornada?: string; busqueda?: string }) {
    let q = Usuario.query().where('rol', 'estudiante').where('id_institucion', d.id_institucion)
    if (d.grado) q = q.where('grado', d.grado)
    if (d.curso) q = q.where('curso', d.curso)
    if (d.jornada) q = q.where('jornada', d.jornada)
    if (d.busqueda) {
      const s = `%${String(d.busqueda).toLowerCase()}%`
      q = q.where((builder) => {
        builder
          .whereILike('numero_documento', s)
          .orWhereILike('nombre', s)
          .orWhereILike('apellido', s)
          .orWhereILike('correo', s)
      })
    }
    return await q.orderBy('apellido', 'asc').orderBy('nombre', 'asc')
  }

    // GET /estudiante/perfil (por token)
async perfilDesdeToken(token: string) {
  try {
    const payload: any = jwt.verify(token, SECRET)

    const rol = String(payload?.rol ?? '').toLowerCase()
    const esEst = rol === 'estudiante' || rol === 'usuario' || rol === 'student' || rol === 'user'
    if (!esEst) return { error: 'No autorizado: el token no corresponde a un estudiante' }

    const idUsuario = payload.id_usuario ?? payload.id ?? payload.user_id ?? payload.userId
    if (!idUsuario) return { error: 'Token sin identificador de usuario' }

    const u = await Usuario.query()
      .where('id_usuario', Number(idUsuario))
      .preload('institucion', (q) => q.select(['id_institucion', 'nombre_institucion']))
      .first()

    if (!u) return { error: 'Perfil no encontrado' }

    return {
      id_usuario:          (u as any).id_usuario,
      nombre_institucion:  (u as any).institucion?.nombre_institucion ?? null, // ← aquí el nombre
      nombre:              (u as any).nombre ?? null,
      apellido:            (u as any).apellido ?? null,
      numero_documento:    (u as any).numero_documento ?? null,
      tipo_documento:      (u as any).tipo_documento ?? null,
      grado:               (u as any).grado ?? null,
      curso:               (u as any).curso ?? null,
      jornada:             (u as any).jornada ?? null,
      correo:              (u as any).correo ?? null,
      telefono:            (u as any).telefono ?? null,
      direccion:           (u as any).direccion ?? null,
      foto_url:            (u as any).foto_url ?? null,
      is_active:           (u as any).is_active ?? true,
    }
  } catch {
    return { error: 'Token inválido o expirado' }
  }
}

// usado tras actualizar contacto, etc.
private async perfilDesdeId(id_usuario: number) {
  const u = await Usuario.query()
    .where('id_usuario', id_usuario)
    .preload('institucion', (q) => q.select(['id_institucion', 'nombre_institucion']))
    .first()

  if (!u) throw new Error('Perfil no encontrado')

  return {
    id_usuario:          (u as any).id_usuario,
    nombre_institucion:  (u as any).institucion?.nombre_institucion ?? null, // ← nombre
    nombre:              (u as any).nombre ?? null,
    apellido:            (u as any).apellido ?? null,
    numero_documento:    (u as any).numero_documento ?? null,
    tipo_documento:      (u as any).tipo_documento ?? null,
    grado:               (u as any).grado ?? null,
    curso:               (u as any).curso ?? null,
    jornada:             (u as any).jornada ?? null,
    correo:              (u as any).correo ?? null,
    telefono:            (u as any).telefono ?? null,
    direccion:           (u as any).direccion ?? null,
    foto_url:            (u as any).foto_url ?? null,
    is_active:           (u as any).is_active ?? true,
  }
}

  // PUT /estudiante/perfil  (solo contacto)
  // PUT /estudiante/perfil  (solo contacto)
async actualizarContacto(id_usuario: number, body: any) {
  const u = await Usuario.findBy('id_usuario', id_usuario)
  if (!u) throw new Error('Perfil no encontrado')

  // Validaciones sencillas
  if (body.correo !== undefined) {
    const mail = normEmail(body.correo)
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      throw new Error('Correo inválido')
    }
    ;(u as any).correo = mail
  }

  if (body.telefono !== undefined) {
    const tel = String(body.telefono ?? '').replace(/\D+/g, '')
    if (tel && (tel.length < 7 || tel.length > 15)) {
      throw new Error('Teléfono inválido')
    }
    ;(u as any).telefono = tel || null
  }

  if (body.direccion !== undefined) {
    const dir = clean(body.direccion)
    ;(u as any).direccion = dir || null
  }

  // 🔹 NUEVO: permitir actualizar/eliminar la foto
  if (body.foto_url !== undefined) {
    const val = body.foto_url == null ? null : String(body.foto_url).trim()
    ;(u as any).foto_url = val || null
  }

  await u.save()
  return await this.perfilDesdeId((u as any).id_usuario)
}



  // ===== Eliminar si no tiene historial, si no → inactivar =====

 async activarEstudiante(id_usuario: number) {
    const usuario = await Usuario.findOrFail(id_usuario);
    usuario.is_active = true; // Cambiar is_active a true
    await usuario.save();
    return { estado: 'activado' as const }; // Devuelve un mensaje indicando que se activó
  }

  // Función para inactivar o eliminar un estudiante
  public async eliminarOInactivar(id_usuario: number) {
  const sesiones = await Sesion.query().where('id_usuario', id_usuario).limit(1);
 
  if (sesiones.length > 0) {
      const usuario = await Usuario.findOrFail(id_usuario);
      usuario.is_active = false;  // Desactivar el usuario
      await usuario.save();  // Guardar cambios
      return { estado: 'inactivado' as const };
  } else {
      const usuario = await Usuario.findOrFail(id_usuario);
      await usuario.delete();  // Eliminar el usuario si no tiene historial
      return { estado: 'eliminado' as const };
  }
}



     /** ADMIN: puede editar todos estos campos (ajusta is_activo/is_active según tu DB) */
  // app/services/estudiantes_service.ts
public async editarComoAdmin(
  id: number,
  payload: {
    tipo_documento?: string
    numero_documento?: string
    correo?: string
    direccion?: string
    telefono?: string
    grado?: string | number | null
    curso?: string | null
    jornada?: string | null
    nombre?: string
    apellido?: string
    is_activo?: boolean | string | number   // aceptamos alias entrante
    is_active?: boolean | string | number
  },
  ctx?: { id_institucion?: number }
) {
  if (!Number.isFinite(id)) throw new Error('ID inválido')

  const cambios: any = { ...payload }
  if (typeof cambios.correo === 'string')            cambios.correo            = normEmail(cambios.correo)
  if (typeof cambios.numero_documento === 'string')  cambios.numero_documento  = clean(cambios.numero_documento)
  if (typeof cambios.tipo_documento === 'string')    cambios.tipo_documento    = up(cambios.tipo_documento)
  if (typeof cambios.nombre === 'string')            cambios.nombre            = clean(cambios.nombre)
  if (typeof cambios.apellido === 'string')          cambios.apellido          = clean(cambios.apellido)
  if (typeof cambios.direccion === 'string')         cambios.direccion         = clean(cambios.direccion)
  if (typeof cambios.telefono === 'string')          cambios.telefono          = clean(cambios.telefono)
  if (typeof cambios.grado !== 'undefined')          cambios.grado             = normGrado(cambios.grado)
  if (typeof cambios.curso !== 'undefined')          cambios.curso             = normCurso(cambios.curso)
  if (typeof cambios.jornada !== 'undefined')        cambios.jornada           = normJornada(cambios.jornada)

  // parseo robusto del boolean
  const toBool = (v: any): boolean | undefined => {
    if (v === true || v === false) return v
    if (v == null) return undefined
    const s = String(v).trim().toLowerCase()
    if (['true','1','sí','si'].includes(s)) return true
    if (['false','0','no'].includes(s))     return false
    return undefined
  }
  let nextActive = toBool(cambios.is_active)
  if (typeof nextActive === 'undefined') nextActive = toBool(cambios.is_activo)
  delete cambios.is_active
  delete cambios.is_activo

  const est = await Usuario.find(id)
  if (!est) throw new Error('Estudiante no encontrado')

  if (ctx?.id_institucion != null) {
    const mismoColegio = Number((est as any).id_institucion) === Number(ctx.id_institucion)
    if (!mismoColegio) throw new Error('No autorizado para editar estudiantes de otra institución')
  }

  // aplica estado (DB tiene is_active)
  if (typeof nextActive !== 'undefined') {
    (est as any).is_active = nextActive
  }

  est.merge(cambios)
  await est.save()
  await est.refresh()
  return est
}


  /** ESTUDIANTE: solo puede editar correo, direccion y telefono */
  public async editarComoEstudiante(
  id: number,
  payload: { correo?: string; direccion?: string; telefono?: string; foto_url?: string | null },
  ctx: { id_usuario: number } // para validar que sea su propio registro
) {
  if (!Number.isFinite(id)) throw new Error('ID inválido')

  // normalizar
  const cambios: any = {}
  if (payload?.correo !== undefined)   cambios.correo   = normEmail(payload.correo)
  if (payload?.direccion !== undefined) cambios.direccion = clean(payload.direccion)
  if (payload?.telefono !== undefined)  cambios.telefono  = clean(payload.telefono)

  // 🔹 NUEVO: foto (permite setear URL o limpiar a null)
  if (payload?.foto_url !== undefined) {
    const val = payload.foto_url == null ? null : String(payload.foto_url).trim()
    cambios.foto_url = val || null
  }

  const est = await Usuario.find(id)
  if (!est) throw new Error('Estudiante no encontrado')

  // asegurar que edita su propio registro
  const esPropio = Number((est as any).id_usuario) === Number(ctx.id_usuario)
  if (!esPropio) throw new Error('No autorizado para editar este estudiante')

  est.merge(cambios)
  await est.save()
  return est
}


   public async cambiarPasswordEstudiante(id_usuario: number, actual: string, nueva: string) {
  if (!Number.isFinite(id_usuario)) throw new Error('Usuario inválido');
  if (!actual || !nueva) throw new Error('actual y nueva son obligatorias');

  const user = await Usuario.findOrFail(id_usuario);
  const storedHash =
    (user as any).password_hash ??
    (user as any).password ??
    (user as any).clave ??
    null;

  if (!storedHash || typeof storedHash !== 'string' || storedHash.length < 20) {
    throw new Error('El usuario no tiene una contraseña registrada');
  }

  const coincide = await bcrypt.compare(String(actual), storedHash);
  if (!coincide) {
    console.log(' Contraseña actual incorrecta');
    return false;
  }

  (user as any).password_hash = await bcrypt.hash(String(nueva), 10);

  await user.save();
  console.log(' Contraseña actualizada correctamente para el usuario:', id_usuario);

  return true;
}

}



