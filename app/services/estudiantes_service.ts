// app/services/estudiantes_service.ts
import type { HttpContext } from '@adonisjs/core/http'
import bcrypt from 'bcrypt'
import Usuario from '../models/usuario.js'
import Institucion from '../models/institucione.js'
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

// Normaliza nombres de columnas: quita acentos, pasa a lower y reemplaza
// espacios, guiones, puntos o slashes por guion_bajo. Colapsa múltiples _.
function normalizeKeyName(key: string): string {
  const base = String(key).trim().toLowerCase()
  const sinAcentos = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return sinAcentos
    .replace(/[\s\-\./]+/g, '_')
    .replace(/__+/g, '_')
}

function normalizeKeysRecord<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {}
  for (const k of Object.keys(obj || {})) {
    out[normalizeKeyName(k)] = (obj as any)[k]
  }
  return out
}

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
  /**
   * Genera la contraseña inicial: número de documento + 3 últimas letras del apellido
   * Remueve tildes pero mantiene la ñ
   * Ejemplo: "12345678" + "Muñoz" -> "12345678ñoz"
   * Ejemplo: "12345678" + "García" -> "12345678cia" (sin tilde)
   * Ejemplo: "12345678" + "Muñ" -> "12345678uñ" (si tiene menos de 3 letras, usa todas)
   */
  private claveInicial(numero_documento: string, apellido: string): string {
    // Validar número de documento
    const doc = String(numero_documento || '').trim()
    if (!doc) {
      throw new Error('El número de documento es requerido para generar la contraseña')
    }
    
    // Validar apellido
    const apellidoStr = String(apellido || '').trim()
    if (!apellidoStr) {
      throw new Error('El apellido es requerido para generar la contraseña')
    }
    
    // Convertir a minúsculas
    let apellidoLower = apellidoStr.toLowerCase()
    
    // Remover tildes pero mantener ñ
    // Reemplazar vocales con tilde por vocales sin tilde
    // PERO mantener la ñ (ñ no se reemplaza)
    apellidoLower = apellidoLower
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/Á/g, 'a')
      .replace(/É/g, 'e')
      .replace(/Í/g, 'i')
      .replace(/Ó/g, 'o')
      .replace(/Ú/g, 'u')
      .replace(/Ü/g, 'u')
      // La ñ se mantiene tal cual (no se reemplaza)
    
    // Tomar las últimas 3 letras
    let ultimas3Letras = apellidoLower.slice(-3)
    
    // Si el apellido tiene menos de 3 letras, usar todas las disponibles
    if (ultimas3Letras.length < 3 && apellidoLower.length > 0) {
      ultimas3Letras = apellidoLower
    }
    
    // Si aún no hay letras (caso muy raro), usar un fallback
    if (!ultimas3Letras || ultimas3Letras.length === 0) {
      ultimas3Letras = 'xxx' // Fallback si no hay apellido válido
    }
    
    // Concatenar: número de documento + últimas 3 letras
    return `${doc}${ultimas3Letras}`
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
    
    // Si existe en otra institución, retornar información completa
    if (ya && (ya as any).id_institucion !== payload.id_institucion) {
      const institucion = await Institucion.find((ya as any).id_institucion)
      throw {
        error: 'DUPLICADO_OTRA_INSTITUCION',
        mensaje: 'El número de documento ya está registrado en otra institución',
        estudiante_nuevo: {
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
        },
        estudiante_existente: {
          id_usuario: (ya as any).id_usuario,
          tipo_documento: (ya as any).tipo_documento,
          numero_documento: (ya as any).numero_documento,
          nombre: (ya as any).nombre,
          apellido: (ya as any).apellido,
          correo: (ya as any).correo,
          direccion: (ya as any).direccion,
          telefono: (ya as any).telefono,
          grado: (ya as any).grado,
          curso: (ya as any).curso,
          jornada: (ya as any).jornada,
        },
        institucion: institucion ? {
          id_institucion: (institucion as any).id_institucion,
          nombre_institucion: (institucion as any).nombre_institucion,
          codigo_dane: (institucion as any).codigo_dane,
          ciudad: (institucion as any).ciudad,
          departamento: (institucion as any).departamento,
        } : null,
      }
    }
    
    // Si existe en la misma institución, retornar información completa
    if (ya && (ya as any).id_institucion === payload.id_institucion) {
      throw {
        error: 'DUPLICADO_MISMA_INSTITUCION',
        mensaje: 'El estudiante ya está registrado en esta institución',
        estudiante_nuevo: {
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
        },
        estudiante_existente: {
          id_usuario: (ya as any).id_usuario,
          tipo_documento: (ya as any).tipo_documento,
          numero_documento: (ya as any).numero_documento,
          nombre: (ya as any).nombre,
          apellido: (ya as any).apellido,
          correo: (ya as any).correo,
          direccion: (ya as any).direccion,
          telefono: (ya as any).telefono,
          grado: (ya as any).grado,
          curso: (ya as any).curso,
          jornada: (ya as any).jornada,
        },
      }
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

      // Buscar archivo en campos comunes (case-insensitive) y fallback al primer archivo cargado
      const variants = [
        'file', 'archivo', 'estudiantes',
        'File', 'Archivo', 'Estudiantes',
        'FILE', 'ARCHIVO', 'ESTUDIANTES'
      ]
      let file = null as any
      for (const v of variants) {
        file = request.file(v as any, { size: '20mb' })
        if (file) break
      }
      if (!file) {
        try {
          const anyFiles =
            ((request as any).allFiles?.() || (request as any).files?.() || []) as any[]
          if (Array.isArray(anyFiles) && anyFiles.length) {
            file = anyFiles.find((f) => f && (f.tmpPath || f.isValid != null)) || anyFiles[0]
          }
        } catch {}
      }

      if (!file) {
        return response.badRequest({
          error: 'Sube un CSV/XLSX como archivo (form-data). Usa el campo file/archivo/estudiantes.',
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

      // Normalizar keys → lower y variantes (espacios/guiones → _)
      rows = rows.map((obj: any) => {
        const out: any = {}
        for (const k of Object.keys(obj)) out[normalizeKeyName(k)] = obj[k]
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
      const vistos = new Set<string>() // clave: TIPO|NUMERO (para detectar duplicados dentro del archivo)
      let duplicados_en_archivo = 0
      const candidatos: any[] = []

      for (const r of rows) {
        const numero_documento = mapVal(r, 'numero_documento', 'documento')
        if (!numero_documento) continue
        const tipo_doc_norm = mapVal(r, 'tipo_documento', 'tipo').toUpperCase()
        const keyVisto = `${tipo_doc_norm}|${numero_documento}`

        if (vistos.has(keyVisto)) {
          duplicados_en_archivo++
          continue
        }
        vistos.add(keyVisto)

        const correoNorm = normEmail(mapVal(r, 'correo', 'email'))
        const correoFinal = correoNorm || (numero_documento ? `${numero_documento}@noemail.local` : null)
        candidatos.push({
          id_institucion,
          tipo_documento: tipo_doc_norm,
          numero_documento,
          nombre: mapVal(r, 'nombre', 'nombres', 'nombre_usuario'),
          apellido: mapVal(r, 'apellido', 'apellidos'),
          correo: correoFinal,
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
        .select(['id_usuario', 'numero_documento', 'tipo_documento', 'id_institucion'])

      const existePorDoc = new Map<string, { id_usuario: number; id_institucion: number }>()
      const existePorNumero = new Map<string, { id_usuario: number; id_institucion: number }>()
      for (const r of existentesRows) {
        const k = `${String((r as any).tipo_documento || '').toUpperCase()}|${String((r as any).numero_documento)}`
        existePorDoc.set(k, {
          id_usuario: (r as any).id_usuario,
          id_institucion: (r as any).id_institucion,
        })
        existePorNumero.set(String((r as any).numero_documento), {
          id_usuario: (r as any).id_usuario,
          id_institucion: (r as any).id_institucion,
        })
      }

      const aInsertar: any[] = []
      const aActualizar: any[] = []
      const conflictosOtraInst: any[] = []
      const idsUsuariosDuplicados = new Set<number>()
      const idsUsuariosConflictos = new Set<number>()
      const idsInstitucionesConflictos = new Set<number>()

      for (const c of candidatos) {
        const k = `${String(c.tipo_documento || '').toUpperCase()}|${c.numero_documento}`
        const ex = existePorDoc.get(k)
        if (!ex) {
          const exNum = existePorNumero.get(String(c.numero_documento))
          if (exNum && exNum.id_institucion === id_institucion) {
            aActualizar.push({ ...c, _updateByNumero: true })
            idsUsuariosDuplicados.add(exNum.id_usuario)
          }
          else if (exNum) {
            conflictosOtraInst.push({ ...c, id_usuario_existente: exNum.id_usuario, id_institucion_existente: exNum.id_institucion })
            idsUsuariosConflictos.add(exNum.id_usuario)
            idsInstitucionesConflictos.add(exNum.id_institucion)
          }
          else aInsertar.push(c)
        } else if (ex.id_institucion === id_institucion) {
          aActualizar.push(c)
          idsUsuariosDuplicados.add(ex.id_usuario)
        }
        else {
          conflictosOtraInst.push({ ...c, id_usuario_existente: ex.id_usuario, id_institucion_existente: ex.id_institucion })
          idsUsuariosConflictos.add(ex.id_usuario)
          idsInstitucionesConflictos.add(ex.id_institucion)
        }
      }

      // Pre-cargar todos los estudiantes duplicados y conflictos de una vez
      const usuariosDuplicadosMap = new Map<number, any>()
      const usuariosConflictosMap = new Map<number, any>()
      const institucionesMap = new Map<number, any>()

      if (idsUsuariosDuplicados.size > 0) {
        const usuarios = await Usuario.query().whereIn('id_usuario', Array.from(idsUsuariosDuplicados))
        for (const u of usuarios) {
          usuariosDuplicadosMap.set((u as any).id_usuario, u)
        }
      }

      if (idsUsuariosConflictos.size > 0) {
        const usuarios = await Usuario.query().whereIn('id_usuario', Array.from(idsUsuariosConflictos))
        for (const u of usuarios) {
          usuariosConflictosMap.set((u as any).id_usuario, u)
        }
      }

      if (idsInstitucionesConflictos.size > 0) {
        const instituciones = await Institucion.query().whereIn('id_institucion', Array.from(idsInstitucionesConflictos))
        for (const inst of instituciones) {
          institucionesMap.set((inst as any).id_institucion, inst)
        }
      }

      // Construir arrays de duplicados y conflictos completos
      const duplicadosMismaInst: any[] = []
      for (const c of candidatos) {
        const k = `${String(c.tipo_documento || '').toUpperCase()}|${c.numero_documento}`
        const ex = existePorDoc.get(k)
        const exNum = existePorNumero.get(String(c.numero_documento))
        const idUsuario = ex?.id_usuario || exNum?.id_usuario
        if (idUsuario && (ex?.id_institucion === id_institucion || (exNum?.id_institucion === id_institucion))) {
          const estudianteExistente = usuariosDuplicadosMap.get(idUsuario)
          if (estudianteExistente) {
            duplicadosMismaInst.push({
              ...c,
              estudiante_existente: {
                id_usuario: (estudianteExistente as any).id_usuario,
                tipo_documento: (estudianteExistente as any).tipo_documento,
                numero_documento: (estudianteExistente as any).numero_documento,
                nombre: (estudianteExistente as any).nombre,
                apellido: (estudianteExistente as any).apellido,
                correo: (estudianteExistente as any).correo,
                direccion: (estudianteExistente as any).direccion,
                telefono: (estudianteExistente as any).telefono,
                grado: (estudianteExistente as any).grado,
                curso: (estudianteExistente as any).curso,
                jornada: (estudianteExistente as any).jornada,
              }
            })
          }
        }
      }

      // Pre-cargar correos existentes de la institución para validación (optimización)
      const correosExistentes = new Set<string>()
      if (aInsertar.length > 0) {
        const correosAConsultar = aInsertar.map(e => e.correo || `${e.numero_documento}@noemail.local`).filter(Boolean)
        if (correosAConsultar.length > 0) {
          const usuariosConCorreo = await Usuario.query()
            .where('id_institucion', id_institucion)
            .whereIn('correo', correosAConsultar)
            .select('correo')
          for (const u of usuariosConCorreo) {
            if ((u as any).correo) correosExistentes.add((u as any).correo)
          }
        }
      }

      // insertar (solo los que NO existen en ninguna institución)
      const creadosDocs: string[] = []
      
      // Preparar todos los hashes en paralelo (más rápido)
      const hashesPromises = aInsertar.map(async (e) => {
        const plano = this.claveInicial(e.numero_documento, e.apellido)
        return { hash: await bcrypt.hash(plano, 10), e }
      })
      const hashes = await Promise.all(hashesPromises)
      
      for (const { hash, e } of hashes) {
        try {
          // Validar correo usando Set pre-cargado (más rápido)
          let correoSeguro = e.correo || `${e.numero_documento}@noemail.local`
          if (correosExistentes.has(correoSeguro)) {
            correoSeguro = `${e.numero_documento}@noemail.local`
          }

          const u = await Usuario.create({
            id_institucion: e.id_institucion,
            rol: 'estudiante',
            tipo_documento: e.tipo_documento,
            numero_documento: e.numero_documento,
            nombre: e.nombre,
            apellido: e.apellido,
            correo: correoSeguro,
            direccion: e.direccion,
            telefono: e.telefono,
            grado: e.grado,
            curso: e.curso,
            jornada: e.jornada,
            password_hash: hash,
            is_active: true,
          } as any)
          if (u?.id_usuario) {
            creadosDocs.push(e.numero_documento)
            // Agregar el correo a correosExistentes para evitar conflictos en el mismo batch
            if (correoSeguro) correosExistentes.add(correoSeguro)
          }
        } catch (createErr: any) {
          // Si falla por constraint único, intentar verificar si ya existe
          if (createErr?.code === '23505' || createErr?.message?.includes('unique') || createErr?.message?.includes('duplicate')) {
            // Verificar si ya existe en la base de datos
            const existente = await Usuario.query()
              .where('numero_documento', e.numero_documento)
              .where('id_institucion', e.id_institucion)
              .first()
            
            if (existente) {
              // Ya existe, agregar a actualizar en lugar de crear
              aActualizar.push({ ...e, _updateByNumero: true })
              idsUsuariosDuplicados.add((existente as any).id_usuario)
            }
          } else {
            // Otro error, loguearlo pero continuar
            console.error(`[subirCSV] Error al crear usuario ${e.numero_documento}:`, createErr?.message || createErr)
          }
        }
      }

      // Función para procesar actualizaciones (reutilizable después de manejar errores)
      const procesarActualizaciones = async (listaActualizar: any[]) => {
        if (listaActualizar.length === 0) return 0
        
        // Pre-cargar todos los usuarios a actualizar de una vez
        const idsUsuariosActualizar = new Set<number>()
        for (const e of listaActualizar) {
          const k = `${String(e.tipo_documento || '').toUpperCase()}|${e.numero_documento}`
          const ex = existePorDoc.get(k) || existePorNumero.get(String(e.numero_documento))
          if (ex) idsUsuariosActualizar.add(ex.id_usuario)
        }

        // Si hay nuevos IDs agregados por errores, cargarlos también
        for (const e of listaActualizar) {
          if (e._updateByNumero) {
            const existente = await Usuario.query()
              .where('numero_documento', e.numero_documento)
              .where('id_institucion', id_institucion)
              .first()
            if (existente) {
              idsUsuariosActualizar.add((existente as any).id_usuario)
              existePorNumero.set(String(e.numero_documento), {
                id_usuario: (existente as any).id_usuario,
                id_institucion: id_institucion
              })
            }
          }
        }

        const usuariosActualizarMap = new Map<number, any>()
        if (idsUsuariosActualizar.size > 0) {
          const usuarios = await Usuario.query().whereIn('id_usuario', Array.from(idsUsuariosActualizar))
          for (const u of usuarios) {
            usuariosActualizarMap.set((u as any).id_usuario, u)
          }
        }

        // Pre-cargar correos existentes para validación de actualizaciones
        const correosNuevos = listaActualizar
          .map(e => normEmail(e.correo))
          .filter((c): c is string => !!c && c !== '')
        const correosExistentesActualizar = new Set<string>()
        if (correosNuevos.length > 0) {
          const usuariosConCorreo = await Usuario.query()
            .where('id_institucion', id_institucion)
            .whereIn('correo', correosNuevos)
            .select(['id_usuario', 'correo'])
          for (const u of usuariosConCorreo) {
            if ((u as any).correo) correosExistentesActualizar.add((u as any).correo)
          }
        }

        // actualizar (misma institución; no toca password)
        let actualizados = 0
        for (const e of listaActualizar) {
          const k = `${String(e.tipo_documento || '').toUpperCase()}|${e.numero_documento}`
          let ex = existePorDoc.get(k) || existePorNumero.get(String(e.numero_documento))
          
          // Si no existe en los mapas, buscar directamente
          if (!ex) {
            const existente = await Usuario.query()
              .where('numero_documento', e.numero_documento)
              .where('id_institucion', id_institucion)
              .first()
            if (existente) {
              ex = {
                id_usuario: (existente as any).id_usuario,
                id_institucion: id_institucion
              }
              existePorNumero.set(String(e.numero_documento), ex)
            }
          }
          
          if (!ex) continue
          
          let u = usuariosActualizarMap.get(ex.id_usuario)
          if (!u) {
            u = await Usuario.find(ex.id_usuario)
            if (u) usuariosActualizarMap.set(ex.id_usuario, u)
          }
          
          if (!u) continue
          
          let camb = 0
          const set = (k: keyof any, val: any) => {
            if ((u as any)[k] !== val) { (u as any)[k] = val; camb++ }
          }
          set('tipo_documento', up(e.tipo_documento))
          set('nombre', clean(e.nombre))
          set('apellido', clean(e.apellido))
          // correo: intentar actualizar solo si no genera conflicto de unicidad
          {
            const nuevo = normEmail(e.correo)
            if (nuevo && nuevo !== (u as any).correo) {
              if (!correosExistentesActualizar.has(nuevo)) {
                set('correo', nuevo)
              }
            }
          }
          set('direccion', clean(e.direccion))
          set('telefono', clean(e.telefono))
          set('grado', normGrado(e.grado))
          set('curso', normCurso(e.curso))
          set('jornada', normJornada(e.jornada))
          if (camb) { await u.save(); actualizados++ }
        }
        
        return actualizados
      }

      // Procesar actualizaciones iniciales
      let actualizados = await procesarActualizaciones(aActualizar)
      
      // Re-procesar actualizaciones si se agregaron nuevos después de errores de creación
      if (aActualizar.length > 0) {
        const nuevosActualizados = await procesarActualizaciones(aActualizar)
        actualizados = Math.max(actualizados, nuevosActualizados)
      }

      // Obtener información completa de estudiantes en otras instituciones (ya pre-cargados)
      const conflictosCompletos: any[] = []
      for (const conflicto of conflictosOtraInst) {
        const estudianteExistente = usuariosConflictosMap.get(conflicto.id_usuario_existente)
        if (estudianteExistente) {
          const institucion = institucionesMap.get(conflicto.id_institucion_existente)
          conflictosCompletos.push({
            estudiante_nuevo: {
              tipo_documento: conflicto.tipo_documento,
              numero_documento: conflicto.numero_documento,
              nombre: conflicto.nombre,
              apellido: conflicto.apellido,
              correo: conflicto.correo,
              direccion: conflicto.direccion,
              telefono: conflicto.telefono,
              grado: conflicto.grado,
              curso: conflicto.curso,
              jornada: conflicto.jornada,
            },
            estudiante_existente: {
              id_usuario: (estudianteExistente as any).id_usuario,
              tipo_documento: (estudianteExistente as any).tipo_documento,
              numero_documento: (estudianteExistente as any).numero_documento,
              nombre: (estudianteExistente as any).nombre,
              apellido: (estudianteExistente as any).apellido,
              correo: (estudianteExistente as any).correo,
              direccion: (estudianteExistente as any).direccion,
              telefono: (estudianteExistente as any).telefono,
              grado: (estudianteExistente as any).grado,
              curso: (estudianteExistente as any).curso,
              jornada: (estudianteExistente as any).jornada,
            },
            institucion: institucion ? {
              id_institucion: (institucion as any).id_institucion,
              nombre_institucion: (institucion as any).nombre_institucion,
              codigo_dane: (institucion as any).codigo_dane,
              ciudad: (institucion as any).ciudad,
              departamento: (institucion as any).departamento,
            } : null,
          })
        }
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
        duplicados_misma_institucion: duplicadosMismaInst,
        conflictos_otras_instituciones: conflictosCompletos,
      })
    } catch (err: any) {
      return response.badRequest({ error: 'Error al importar', detalle: err?.message || String(err) })
    }
  }

  /** ===== Importación por JSON plano: { filas: [...] } ===== */
  async importarMasivo(id_institucion: number, filas: any[]) {
    const vistos = new Set<string>() // TIPO|NUMERO para duplicados dentro de JSON
    const candidatos = (Array.isArray(filas) ? filas : []).map((r) => {
      const row = normalizeKeysRecord(r)
      const numero_documento = clean(row.numero_documento ?? row.documento)
      const tipo_documento = up(row.tipo_documento ?? row.tipo)
      const nombre = clean(row.nombre ?? row.nombres ?? row.nombre_usuario)
      const apellido = clean(row.apellido ?? row.apellidos)
      const correoNorm = normEmail(row.correo ?? row.email)
      const correoFinal = correoNorm || (numero_documento ? `${numero_documento}@noemail.local` : null)
      return {
        id_institucion,
        tipo_documento,
        numero_documento,
        nombre,
        apellido,
        correo: correoFinal,
        direccion: clean(row.direccion),
        telefono: clean(row.telefono ?? row.tel),
        grado: normGrado(row.grado),
        curso: normCurso(row.curso),
        jornada: normJornada(row.jornada),
      }
    }).filter((c) => {
      if (!c.numero_documento) return false
      const key = `${String(c.tipo_documento || '').toUpperCase()}|${c.numero_documento}`
      if (vistos.has(key)) return false
      vistos.add(key)
      return true
    })

    // EXISTENTES globalmente
    const existentesRows = await Usuario
      .query()
      .whereIn('numero_documento', candidatos.map((c) => c.numero_documento as string))
      .select(['id_usuario', 'numero_documento', 'tipo_documento', 'id_institucion'])

    const existePorDoc = new Map<string, { id_usuario: number; id_institucion: number }>()
    const existePorNumero = new Map<string, { id_usuario: number; id_institucion: number }>()
    for (const r of existentesRows) {
      const k = `${String((r as any).tipo_documento || '').toUpperCase()}|${String((r as any).numero_documento)}`
      existePorDoc.set(k, {
        id_usuario: (r as any).id_usuario,
        id_institucion: (r as any).id_institucion,
      })
      existePorNumero.set(String((r as any).numero_documento), {
        id_usuario: (r as any).id_usuario,
        id_institucion: (r as any).id_institucion,
      })
    }

    const aInsertar: any[] = []
    const aActualizar: any[] = []
    const conflictosOtraInst: any[] = []

    for (const c of candidatos) {
      const k = `${String(c.tipo_documento || '').toUpperCase()}|${c.numero_documento}`
      const ex = existePorDoc.get(k)
      if (!ex) {
        const exNum = existePorNumero.get(String(c.numero_documento))
        if (exNum && exNum.id_institucion === id_institucion) aActualizar.push({ ...c, _updateByNumero: true })
        else if (exNum) conflictosOtraInst.push({ ...c, id_institucion_existente: exNum.id_institucion })
        else aInsertar.push(c)
      } else if (ex.id_institucion === id_institucion) aActualizar.push(c)
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
      const k = `${String(e.tipo_documento || '').toUpperCase()}|${e.numero_documento}`
      const ex = existePorDoc.get(k) || existePorNumero.get(String(e.numero_documento))!
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
    const estudiantes = await q.orderBy('apellido', 'asc').orderBy('nombre', 'asc')
    
    // Agregar última actividad desde sesiones
    const estudiantesConActividad = await Promise.all(
      estudiantes.map(async (e: any) => {
        const ultimaSesion = await Sesion.query()
          .where('id_usuario', e.id_usuario)
          .orderBy('inicio_at', 'desc')
          .first()
        return {
          ...e.toJSON(),
          ultima_actividad: ultimaSesion?.inicio_at ?? null
        }
      })
    )
    
    return estudiantesConActividad
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
      usuario.is_active = true;
      await usuario.save();
      return { estado: 'activado' as const };
  }

  // Función para inactivar o eliminar un estudiante
  public async eliminarOInactivar(id_usuario: number) {
  const sesiones = await Sesion.query().where('id_usuario', id_usuario).limit(1);
 
  if (sesiones.length > 0) {
      const usuario = await Usuario.findOrFail(id_usuario);
      usuario.is_active = false;
      await usuario.save();
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
    is_active?: boolean | string | number   // único campo admitido
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

  // Extraer is_active del payload y convertir a boolean (estándar único)
  const isActivePayload = cambios.is_active
  
  if (isActivePayload !== undefined) {
    const toBool = (v: any): boolean => {
      if (v === true || v === false) return v
      if (v == null) return false
      const s = String(v).trim().toLowerCase()
      if (['true','1','sí','si','yes'].includes(s)) return true
      if (['false','0','no','n'].includes(s)) return false
      return false
    }
    cambios.is_active = toBool(isActivePayload)
  }
  
  // Asegurar que no queden alias antiguos
  delete (cambios as any).is_activo

  const est = await Usuario.find(id)
  if (!est) throw new Error('Estudiante no encontrado')

  if (ctx?.id_institucion != null) {
    const mismoColegio = Number((est as any).id_institucion) === Number(ctx.id_institucion)
    if (!mismoColegio) throw new Error('No autorizado para editar estudiantes de otra institución')
  }

  // Aplicar cambios directamente al modelo
  // Asignar campos conocidos explícitamente para asegurar que se guarden
  if (cambios.tipo_documento !== undefined) (est as any).tipo_documento = cambios.tipo_documento
  if (cambios.numero_documento !== undefined) (est as any).numero_documento = cambios.numero_documento
  if (cambios.correo !== undefined) (est as any).correo = cambios.correo
  if (cambios.direccion !== undefined) (est as any).direccion = cambios.direccion
  if (cambios.telefono !== undefined) (est as any).telefono = cambios.telefono
  if (cambios.grado !== undefined) (est as any).grado = cambios.grado
  if (cambios.curso !== undefined) (est as any).curso = cambios.curso
  if (cambios.jornada !== undefined) (est as any).jornada = cambios.jornada
  if (cambios.nombre !== undefined) (est as any).nombre = cambios.nombre
  if (cambios.apellido !== undefined) (est as any).apellido = cambios.apellido
  if (cambios.is_active !== undefined) (est as any).is_active = cambios.is_active
  
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



