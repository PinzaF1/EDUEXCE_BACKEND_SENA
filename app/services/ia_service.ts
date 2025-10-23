// services/ia_service.ts
import BancoPregunta from '../models/banco_pregunta.js'

/* ====================== Tipos ====================== */
export type AreaUI =
  | 'Matematicas'
  | 'Lenguaje'
  | 'Ciencias Naturales'
  | 'sociales'
  | 'Ingles'

export type ParametrosGeneracion = {
  area: AreaUI
  subtemas?: string[]                 // si llega, se respeta; si no, se intenta 1 por nivel (ver LEVELS)
  estilo_kolb?: 'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador'
  cantidad: number
  time_limit_seconds?: number | null
  id_institucion?: number | null
  excluir_ids?: number[]
  longitud_min?: number
  longitud_max?: number
  max_tokens_item?: number
  temperatura?: number
}

export type PreguntaNormalizada = {
  id_pregunta: number
  area: string | null
  subtema: string | null
  estilo_kolb: string | null
  pregunta: string
  opciones: string[]
  respuesta_correcta?: string | null
  explicacion?: string | null
  time_limit_seconds?: number | null
}

/* ====================== Helpers ====================== */
const ABC = ['A', 'B', 'C', 'D', 'E', 'F']
const norm = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

/** Canon UI (lo que ve la app) */
const canonAreaUI = (s: string): AreaUI => {
  const t = norm(s)
  if (t.startsWith('mate')) return 'Matematicas'
  if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje'
  if (t.startsWith('cien')) return 'Ciencias Naturales'
  if (t.startsWith('soci')) return 'sociales' // <- minúscula, como pediste
  if (t.startsWith('ing')) return 'Ingles'
  // si viene exacto lo respetamos (por si ya es AreaUI)
  return (s as AreaUI)
}

/** Sinónimos que pueden existir en el banco (columna area) para cada área UI */
const areaSynonyms = (area: AreaUI): string[] => {
  switch (area) {
    case 'Matematicas':
      return ['Matematicas', 'Matemáticas']
    case 'Lenguaje':
      return ['Lenguaje', 'Lectura crítica', 'Lectura Critica', 'Lectura']
    case 'Ciencias Naturales':
      return ['Ciencias Naturales', 'Ciencias']
    case 'sociales':
      return ['sociales', 'Sociales', 'Sociales y Ciudadanas', 'Ciencias Sociales']
    case 'Ingles':
      return ['Ingles', 'Inglés', 'English']
  }
}

/** Subtemas (niveles) EXACTOS que definiste (UI) */
const LEVELS: Record<AreaUI, string[]> = {
  Lenguaje: [
    'Comprensión lectora (sentido global y local)',
    'Conectores lógicos (causa, contraste, condición, secuencia)',
    'Identificación de argumentos y contraargumentos',
    'Idea principal y propósito comunicativo',
    'Hecho vs. opinión e inferencias',
  ],
  Matematicas: [
    'Operaciones con números enteros',
    'Razones y proporciones',
    'Regla de tres simple y compuesta',
    'Porcentajes y tasas (aumento, descuento, interés simple)',
    'Ecuaciones lineales y sistemas 2×2',
  ],
  sociales: [
    'Constitución de 1991 y organización del Estado',
    'Historia de Colombia (Frente Nacional, conflicto y paz)',
    'Guerras Mundiales y Guerra Fría',
    'Geografía de Colombia (mapas, territorio y ambiente)',
    'Economía y ciudadanía económica (globalización y desigualdad)',
  ],
  'Ciencias Naturales': [
    'Indagación científica (variables, control e interpretación de datos)',
    'Fuerzas, movimiento y energía',
    'Materia y cambios (mezclas, reacciones y conservación)',
    'Genética y herencia',
    'Ecosistemas y cambio climático (CTS)',
  ],
  Ingles: [
    'Verb to be (am, is, are)',
    'Present Simple (afirmación, negación y preguntas)',
    'Past Simple (verbos regulares e irregulares)',
    'Comparatives and superlatives',
    'Subject/Object pronouns y possessive adjectives',
  ],
}

/* ========= Normalización robusta de opciones ========= */

function pickText(v: any): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'object') {
    const cand = v.text ?? v.label ?? v.opcion ?? v.value ?? v.descripcion ?? v.nombre ?? null
    if (cand != null) return String(cand).trim()
    const first = Object.values(v)[0]
    return first != null ? String(first).trim() : ''
  }
  return ''
}

/** Exportamos para reusar en SesionesService (simulacros) */
export function normalizeOpciones(opc: any): string[] {
  try {
    if (typeof opc === 'string') {
      const s = opc.trim()
      try {
        const parsed = JSON.parse(s)
        return normalizeOpciones(parsed)
      } catch {
        const parts = s.split(/\r?\n|\s*\|\|\s*|;;/g).map((x) => x.trim()).filter(Boolean)
        return parts
      }
    }

    if (Array.isArray(opc)) {
      return opc.map(pickText).filter(Boolean).slice(0, 6)
    }

    if (opc && typeof opc === 'object') {
      const out: string[] = []
      for (const k of ABC) {
        if (Object.prototype.hasOwnProperty.call(opc, k)) out.push(pickText(opc[k]))
      }
      if (out.length) return out.filter(Boolean).slice(0, 6)

      const fromEntries = Object.entries(opc).map(([, v]) => pickText(v)).filter(Boolean)
      if (fromEntries.length) return fromEntries.slice(0, 6)
    }
  } catch {}
  return []
}

function toLetterFromValue(value: any, total: number): string {
  const max = Math.max(2, Math.min(6, Number(total) || 4))
  const letters = ABC.slice(0, max)
  if (typeof value === 'string') {
    const v = value.trim().toUpperCase()
    if (letters.includes(v)) return v
    const n = Number(v)
    if (Number.isFinite(n)) {
      if (n >= 1 && n <= max) return letters[n - 1]
      if (n >= 0 && n < max) return letters[n]
    }
    const m = v.match(/(\d+)/)
    if (m) {
      const n2 = Number(m[1])
      if (n2 >= 1 && n2 <= max) return letters[n2 - 1]
    }
    return v.length === 1 ? v : ''
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value
    if (n >= 1 && n <= max) return letters[n - 1]
    if (n >= 0 && n < max) return letters[n]
  }
  return ''
}

/* ====================== Query helpers ====================== */
function baseAreaQuery(areaUI: AreaUI) {
  const aliases = areaSynonyms(areaUI)
  const qb = BancoPregunta.query()
  return qb.where((q) => {
    for (const a of aliases) {
      q.orWhereRaw('unaccent(lower(area)) = unaccent(lower(?))', [a])
      q.orWhereILike('area', a)
    }
  })
}

async function pickOneFrom(
  areaUI: AreaUI,
  opts: { subtema?: string; estilo_kolb?: string; excluir: Set<number> }
) {
  const q = baseAreaQuery(areaUI)
    .if(!!opts.subtema, (qb) =>
      qb.where((qq) => {
        const st = String(opts.subtema)
        qq.whereRaw('unaccent(lower(subtema)) = unaccent(lower(?))', [st]).orWhereILike('subtema', st)
      })
    )
    .if(!!opts.estilo_kolb, (qb) =>
      qb.where((qq) => {
        const ek = String(opts.estilo_kolb)
        qq.whereRaw('unaccent(lower(estilo_kolb)) = unaccent(lower(?))', [ek]).orWhereILike('estilo_kolb', ek)
      })
    )
    .if(opts.excluir.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(opts.excluir)))
    .orderByRaw('random()')
  const rows = await q.limit(1)
  return rows[0] || null
}

async function pickRandomMany(
  areaUI: AreaUI,
  howMany: number,
  opts: { estilo_kolb?: string; excluir: Set<number> }
) {
  if (howMany <= 0) return []
  const q = baseAreaQuery(areaUI)
    .if(!!opts.estilo_kolb, (qb) =>
      qb.where((qq) => {
        const ek = String(opts.estilo_kolb)
        qq.whereRaw('unaccent(lower(estilo_kolb)) = unaccent(lower(?))', [ek]).orWhereILike('estilo_kolb', ek)
      })
    )
    .if(opts.excluir.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(opts.excluir)))
    .orderByRaw('random()')
    .limit(howMany)
  return await q
}

function mapRow(b: any, timeLimit: number | null | undefined): PreguntaNormalizada {
  const id = Number(b.id_pregunta)
  const opciones = normalizeOpciones((b as any).opciones)
  const correcta = toLetterFromValue(
    (b as any).respuesta_correcta,
    Math.max(2, Math.min(6, opciones.length || 4))
  )

  return {
    id_pregunta: id,
    area: (b as any).area ?? null,
    subtema: (b as any).subtema ?? null,
    estilo_kolb: (b as any).estilo_kolb ?? null,
    pregunta: (b as any).pregunta ?? '',
    opciones,
    respuesta_correcta: correcta || null,
    explicacion: (b as any).explicacion ?? null,
    time_limit_seconds: timeLimit ?? null,
  }
}

/* ====================== Servicio ====================== */
export default class IaService {
  /**
   * Desde el banco:
   * - Si NO hay subtemas y la cantidad >= 5 → intenta 1 por cada nivel del área.
   * - Si hay subtemas → trae en ese orden (1 por subtema) y completa al azar si faltan.
   * - Respeta estilo_kolb (si hay columna en la fila) y evita ids en `excluir_ids`.
   */
  async generarPreguntas(p: ParametrosGeneracion): Promise<PreguntaNormalizada[]> {
    const areaUI = canonAreaUI(p.area)
    const excluir = new Set<number>((p.excluir_ids || []).map((x) => Number(x)).filter(Number.isFinite))
    const estilo = p.estilo_kolb ? String(p.estilo_kolb) : undefined
    const timeLimit = p.time_limit_seconds ?? null

    const out: PreguntaNormalizada[] = []

    // 1) Subtemas explícitos
    if (Array.isArray(p.subtemas) && p.subtemas.length > 0) {
      for (const stRaw of p.subtemas) {
        if (out.length >= p.cantidad) break
        const row = await pickOneFrom(areaUI, { subtema: stRaw, estilo_kolb: estilo, excluir })
        if (row) {
          const id = Number((row as any).id_pregunta)
          if (!excluir.has(id)) {
            excluir.add(id)
            out.push(mapRow(row, timeLimit))
          }
        }
      }
      // Completar si faltan
      if (out.length < p.cantidad) {
        const faltan = p.cantidad - out.length
        const extra = await pickRandomMany(areaUI, faltan, { estilo_kolb: estilo, excluir })
        for (const r of extra) {
          const id = Number((r as any).id_pregunta)
          if (!excluir.has(id)) {
            excluir.add(id)
            out.push(mapRow(r, timeLimit))
          }
        }
      }
      return out
    }

    // 2) Sin subtemas: 1 por nivel definido para el área
    const niveles = LEVELS[areaUI] || []
    for (const nivelSubtema of niveles) {
      if (out.length >= p.cantidad) break
      const row = await pickOneFrom(areaUI, { subtema: nivelSubtema, estilo_kolb: estilo, excluir })
      if (row) {
        const id = Number((row as any).id_pregunta)
        if (!excluir.has(id)) {
          excluir.add(id)
          out.push(mapRow(row, timeLimit))
        }
      }
    }

    // Completar si el banco no tiene todos los niveles
    if (out.length < p.cantidad) {
      const faltan = p.cantidad - out.length
      const extra = await pickRandomMany(areaUI, faltan, { estilo_kolb: estilo, excluir })
      for (const r of extra) {
        const id = Number((r as any).id_pregunta)
        if (!excluir.has(id)) {
          excluir.add(id)
          out.push(mapRow(r, timeLimit))
        }
      }
    }

    return out
  }

  /** Placeholder: sin IA externa */
  async generarYSembrarEnBancoBackground(_p: ParametrosGeneracion): Promise<void> {
    return
  }
}
