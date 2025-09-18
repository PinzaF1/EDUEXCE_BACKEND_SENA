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

function normGrado(g: any): string | null {
  if (g == null) return null
  const s = String(g).toLowerCase()
  if (s.includes('10')) return '10'
  if (s.includes('11')) return '11'
  const num = s.replace(/\D/g, '')
  if (num === '10' || num === '11') return num
  return null
}
function normCurso(c: any): string | null {
  if (c == null) return null
  const s = String(c).trim().toUpperCase()
  return s || null
}
function normJornada(j: any): string | null {
  if (j == null) return null
  const s = String(j).trim().toLowerCase()
  if (['mañana', 'manana'].includes(s)) return 'mañana'
  if (s.includes('tarde')) return 'tarde'
  if (s.includes('completa')) return 'completa'
  return null
}

export default class EstudiantesService {
  private claveInicial(numero_documento: string, apellido: string) {
    return `${numero_documento}${(apellido || '').toLowerCase().slice(-3)}`
  }

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
    // ► Unicidad GLOBAL por numero_documento
    const ya = await Usuario.query()
      .where('numero_documento', d.numero_documento)
      .first()

    if (ya && (ya as any).id_institucion !== d.id_institucion) {
      throw new Error('El número de documento ya está registrado en otra institución')
    }

    const plano = this.claveInicial(d.numero_documento, d.apellido)
    const hash = await bcrypt.hash(plano, 10)

    const u = await Usuario.updateOrCreate(
      {
        // Si ya existe en la misma institución, actualiza; si no, crea
        id_institucion: d.id_institucion,
        numero_documento: d.numero_documento,
      },
      {
        id_institucion: d.id_institucion,
        rol: 'estudiante',
        tipo_documento: d.tipo_documento,
        numero_documento: d.numero_documento,
        nombre: d.nombre,
        apellido: d.apellido,
        correo: d.correo ?? null,
        direccion: d.direccion ?? null,
        telefono: d.telefono ?? null,
        grado: d.grado ?? null,
        curso: d.curso ?? null,
        jornada: d.jornada ?? null,
        password_hash: hash,
        is_active: true,
      } as any
    )

    return {
      id_usuario: u.id_usuario,
      usuario: d.numero_documento,
      password_temporal: plano,
      estudiante: {
        id_usuario: u.id_usuario,
        id_institucion: d.id_institucion,
        rol: 'estudiante',
        tipo_documento: d.tipo_documento,
        numero_documento: d.numero_documento,
        nombre: d.nombre,
        apellido: d.apellido,
        correo: d.correo ?? null,
        direccion: d.direccion ?? null,
        telefono: d.telefono ?? null,
        grado: d.grado ?? null,
        curso: d.curso ?? null,
        jornada: d.jornada ?? null,
        is_active: true,
        created_at: (u as any).created_at,
        updated_at: (u as any).updated_at,
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

      // ===== DEBUG OPCIONAL =====
      const wantsDebug =
        String(request.header('x-debug') || request.qs().debug || '').toLowerCase() === '1'
      if (wantsDebug) {
        console.log('[import][dbg] parseadoComo =>', parseadoComo)
        console.log('[import][dbg] rows.length =>', rows.length)
        if (rows[0]) console.log('[import][dbg] headers (crudos) =>', Object.keys(rows[0]))
      }
      // ==========================

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
          correo: mapVal(r, 'correo', 'email') || null,
          direccion: mapVal(r, 'direccion') || null,
          telefono: mapVal(r, 'telefono', 'tel') || null,
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

      // ► EXISTENTES en cualquier institución (SIN filtrar por institución)
      const documentos = candidatos.map((c) => c.numero_documento)
      const existentesRows = await Usuario.query()
        .whereIn('numero_documento', documentos)
        .select(['id_usuario', 'numero_documento', 'id_institucion'])

      const existePorDoc = new Map<
        string,
        { id_usuario: number; id_institucion: number }
      >()
      for (const r of existentesRows) {
        existePorDoc.set(String((r as any).numero_documento), {
          id_usuario: (r as any).id_usuario,
          id_institucion: (r as any).id_institucion,
        })
      }

      // Clasificar
      const aInsertar: any[] = []
      const aActualizar: any[] = []
      const conflictosOtraInst: any[] = []

      for (const c of candidatos) {
        const ex = existePorDoc.get(c.numero_documento)
        if (!ex) {
          aInsertar.push(c)
        } else if (ex.id_institucion === id_institucion) {
          aActualizar.push(c)
        } else {
          conflictosOtraInst.push({ ...c, id_institucion_existente: ex.id_institucion })
        }
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

      // actualizar (solo si existe en la MISMA institución; no tocar password)
      let actualizados = 0
      for (const e of aActualizar) {
        const ex = existePorDoc.get(e.numero_documento)!
        const u = await Usuario.findOrFail(ex.id_usuario)
        let camb = 0
        const set = (k: keyof any, val: any) => {
          if ((u as any)[k] !== val) { (u as any)[k] = val; camb++ }
        }
        set('tipo_documento', e.tipo_documento)
        set('nombre', e.nombre)
        set('apellido', e.apellido)
        set('correo', e.correo)
        set('direccion', e.direccion)
        set('telefono', e.telefono)
        set('grado', e.grado)
        set('curso', e.curso)
        set('jornada', e.jornada)
        if (camb) { await u.save(); actualizados++ }
      }

      return response.ok({
        creados: creadosDocs,
        mensaje: 'Importación finalizada',
        parseado_como: parseadoComo,
        insertados: creadosDocs.length,
        actualizados,
        duplicados_en_archivo,
        // mantenemos tu campo y sumamos el nuevo sin romper nada
        omitidos_por_existir:
          candidatos.length - aInsertar.length - aActualizar.length - conflictosOtraInst.length,
        omitidos_por_otras_instituciones: conflictosOtraInst.length,
        documentos_en_otras_instituciones: conflictosOtraInst.slice(0, 10).map((x) => x.numero_documento),
        total_leidos: rows.length,
      })
    } catch (err: any) {
      return response.badRequest({ error: 'Error al importar', detalle: err?.message || String(err) })
    }
  }

  /** ===== Importación por JSON plano: { filas: [...] } ===== */
  async importarMasivo(id_institucion: number, filas: any[]) {
    const vistos = new Set<string>()
    const candidatos = (Array.isArray(filas) ? filas : []).map((r) => {
      const numero_documento = String(r.numero_documento ?? r.documento ?? '').trim()
      const tipo_documento = String(r.tipo_documento ?? r.tipo ?? '').trim().toUpperCase()
      const nombre = String(r.nombre ?? r.nombres ?? '').trim()
      const apellido = String(r.apellido ?? r.apellidos ?? '').trim()
      return {
        id_institucion,
        tipo_documento,
        numero_documento,
        nombre,
        apellido,
        correo: r.correo ? String(r.correo).trim() : null,
        direccion: r.direccion ? String(r.direccion).trim() : null,
        telefono: r.telefono ? String(r.telefono).trim() : null,
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

    // ► EXISTENTES globalmente
    const existentesRows = await Usuario
      .query()
      .whereIn('numero_documento', candidatos.map((c) => c.numero_documento))
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
      if (!ex) {
        aInsertar.push(c)
      } else if (ex.id_institucion === id_institucion) {
        aActualizar.push(c)
      } else {
        conflictosOtraInst.push({ ...c, id_institucion_existente: ex.id_institucion })
      }
    }

    const creadosDocs: string[] = []
    for (const e of aInsertar) {
      const plano = this.claveInicial(e.numero_documento, e.apellido)
      const hash = await bcrypt.hash(plano, 10)
      const u = await Usuario.create({ ...e, rol: 'estudiante', password_hash: hash, is_active: true } as any)
      if (u?.id_usuario) creadosDocs.push(e.numero_documento)
    }

    let actualizados = 0
    for (const e of aActualizar) {
      const ex = existePorDoc.get(e.numero_documento)!
      const u = await Usuario.findOrFail(ex.id_usuario)
      let camb = 0
      const set = (k: keyof any, val: any) => {
        if ((u as any)[k] !== val) { (u as any)[k] = val; camb++ }
      }
      set('tipo_documento', e.tipo_documento)
      set('nombre', e.nombre)
      set('apellido', e.apellido)
      set('correo', e.correo)
      set('direccion', e.direccion)
      set('telefono', e.telefono)
      set('grado', e.grado)
      set('curso', e.curso)
      set('jornada', e.jornada)
      if (camb) { await u.save(); actualizados++ }
    }

    return {
      creados: creadosDocs,
      insertados: creadosDocs.length,
      actualizados,
      omitidos_por_existir:
        candidatos.length - aInsertar.length - aActualizar.length - conflictosOtraInst.length,
      omitidos_por_otras_instituciones: conflictosOtraInst.length,
      documentos_en_otras_instituciones: conflictosOtraInst.slice(0, 10).map((x) => x.numero_documento),
      total_recibidos: filas?.length ?? 0,
    }
  }

  async listar(d: { id_institucion: number; grado?: string; curso?: string; jornada?: string; busqueda?: string }) {
    let q = Usuario.query().where('rol', 'estudiante').where('id_institucion', d.id_institucion)
    if (d.grado) q = q.where('grado', d.grado)
    if (d.curso) q = q.where('curso', d.curso)
    if (d.jornada) q = q.where('jornada', d.jornada)
    if (d.busqueda) {
      const s = `%${d.busqueda.toLowerCase()}%`
      q = q.where((builder) => {
        builder
          .whereILike('numero_documento', s)
          .orWhereILike('nombre', s)
          .orWhereILike('apellido', s)
          .orWhereILike('correo', s)
      })
    }
    return await q.orderBy('apellido', 'asc')
  }

  /** ====== CORREGIDO: lectura de perfil desde token de estudiante ====== */
  async perfilEstudiante(token: string) {
    try {
      const payload: any = jwt.verify(token, SECRET)

      // aceptar varias etiquetas de rol
      const rol = String(payload?.rol ?? '').toLowerCase()
      const esEst =
        rol === 'estudiante' ||
        rol === 'usuario' ||
        rol === 'student' ||
        rol === 'user'

      if (!esEst) {
        return { error: 'No autorizado, el token no corresponde a un estudiante' }
      }

      // identificar id de usuario con distintas claves posibles
      const idUsuario =
        payload.id_usuario ?? payload.id ?? payload.user_id ?? payload.userId

      if (!idUsuario) {
        return { error: 'Token sin identificador de usuario' }
      }

      const est = await Usuario.findBy('id_usuario', idUsuario)
      if (!est) {
        return { error: 'Perfil no encontrado' }
      }

      // verificación adicional por seguridad
      if (String((est as any).rol ?? '').toLowerCase() !== 'estudiante') {
        return { error: 'El usuario no es de tipo estudiante' }
      }

      return {
        nombre_usuario:   est.nombre ?? null,
        apellido:         est.apellido ?? null,
        numero_documento: est.numero_documento ?? payload.documento ?? null,
        grado:            est.grado ?? null,
        curso:            est.curso ?? null,
        jornada:          est.jornada ?? null,
        correo:           est.correo ?? null,
      }
    } catch {
      return { error: 'Token INVÁLIDO o expirado' }
    }
  }

  async editar(id_usuario: number, cambios: Partial<{
    tipo_documento: string
    numero_documento: string
    correo: string | null
    direccion: string | null
    telefono: string | null
    grado: string | null
    curso: string | null
    jornada: string | null
    nombre: string | null
    apellido: string | null
    is_active: boolean
  }>) {
    const u = await Usuario.findOrFail(id_usuario)

    if (cambios.tipo_documento !== undefined) {
      ;(u as any).tipo_documento = String(cambios.tipo_documento).trim().toUpperCase()
    }

    if (cambios.numero_documento !== undefined) {
      const nuevoDoc = String(cambios.numero_documento).trim()
      if (nuevoDoc && nuevoDoc !== (u as any).numero_documento) {
        // ► Unicidad GLOBAL al editar
        const existe = await Usuario.query()
          .where('numero_documento', nuevoDoc)
          .whereNot('id_usuario', id_usuario)
          .first()
        if (existe) throw new Error('El número de documento ya existe (en esta u otra institución)')
        ;(u as any).numero_documento = nuevoDoc
      }
    }

    if (cambios.correo !== undefined) (u as any).correo = cambios.correo
    if (cambios.direccion !== undefined) (u as any).direccion = cambios.direccion
    if (cambios.telefono !== undefined) (u as any).telefono = cambios.telefono
    if (cambios.grado !== undefined) (u as any).grado = cambios.grado
    if (cambios.curso !== undefined) (u as any).curso = cambios.curso
    if (cambios.jornada !== undefined) (u as any).jornada = cambios.jornada
    if (cambios.nombre !== undefined) (u as any).nombre = cambios.nombre
    if (cambios.apellido !== undefined) (u as any).apellido = cambios.apellido
    if (cambios.is_active !== undefined) (u as any).is_active = cambios.is_active

    await u.save()
    return u
  }

  async eliminarOInactivar(id_usuario: number) {
    const sesiones = await Sesion.query().where('id_usuario', id_usuario).limit(1)
    if (sesiones.length > 0) {
      const u = await Usuario.findOrFail(id_usuario)
      ;(u as any).is_active = false
      await u.save()
      return { estado: 'inactivado' as const }
    } else {
      const u = await Usuario.findOrFail(id_usuario)
      await u.delete()
      return { estado: 'eliminado' as const }
    }
  }
}
