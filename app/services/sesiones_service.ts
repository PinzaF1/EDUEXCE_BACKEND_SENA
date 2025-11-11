// services/sesiones_service.ts
import Sesion from '../models/sesione.js'
import SesionDetalle from '../models/sesiones_detalle.js'
import IaService, { AreaUI } from './ia_service.js'
import IaExternalService from './ia_external_service.js'
import { mapearSubtema } from './subtemas_mapper.js'
import EstilosAprendizaje from '../models/estilos_aprendizaje.js'
import BancoPregunta from '../models/banco_pregunta.js'
import ProgresoNivel from '../models/progreso_nivel.js'
import Usuario from '../models/usuario.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'sociales' | 'Ingles'
type RespCierre = { id_pregunta: number; respuesta: string }

/* ====================== Helpers ====================== */
const ABC = ['A', 'B', 'C', 'D', 'E', 'F']
const norm = (s: string) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

const canonArea = (s?: string | null): Area | null => {
  const t = norm(String(s || ''))
  if (!t) return null
  if (t.startsWith('mate')) return 'Matematicas'
  if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje'
  if (t.startsWith('cien')) return 'Ciencias'
  if (t.startsWith('soci')) return 'sociales'
  if (t.startsWith('ing')) return 'Ingles'
  return null
}

function safeOpcCount(raw: any, fallback = 4): number {
  try {
    if (Array.isArray(raw)) return Math.max(2, Math.min(6, raw.length))
    if (raw != null) {
      const parsed = JSON.parse(String(raw))
      if (Array.isArray(parsed)) return Math.max(2, Math.min(6, parsed.length))
    }
  } catch {}
  return fallback
}

function toLetter(value: any, total: number): string {
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
    // también aceptar 'a','b','c' minúsculas
    if (v.length === 1) {
      const idx = letters.indexOf(v.toUpperCase())
      if (idx !== -1) return letters[idx]
    }
    return ''
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value
    if (n >= 1 && n <= max) return letters[n - 1]
    if (n >= 0 && n < max) return letters[n]
  }
  return ''
}

function extractCorrectLetter(b: any, totalOpc: number): string {
  const rawCorrect =
    b?.respuesta_correcta ?? b?.opcion_correcta ?? b?.correcta ?? b?.indice_correcto ?? null
  return toLetter(rawCorrect, totalOpc)
}


function stripLabel(s: any) {
  return String(s ?? '')
    .replace(/^\s*([A-F]|[1-6])[\.\)]\s*/i, '')
    .trim()
}

function fmtOpciones(opciones: any): string[] {
  // parsear si viene como texto
  try {
    if (typeof opciones === 'string') {
      const s = opciones.trim()
      if (s.startsWith('{') || s.startsWith('[')) opciones = JSON.parse(s)
    }
  } catch {
  }

  if (Array.isArray(opciones)) {
    
    if (opciones.length && typeof opciones[0] === 'object' && opciones[0] !== null) {
      return opciones.map((it: any, i: number) => {
        const key =
          toLetter(it?.key ?? it?.letra ?? it?.indice ?? i, opciones.length) || ABC[i] || 'A'
        const textRaw = String(it?.text ?? it?.texto ?? it?.label ?? it?.value ?? '').trim()
        const text = stripLabel(textRaw)
        return `${key}. ${text}`
      })
    }
    return opciones.map((txt: any, i: number) => `${ABC[i] || 'A'}. ${stripLabel(txt)}`)
  }

  if (opciones && typeof opciones === 'object') {
    const out: string[] = []
    for (let i = 0; i < ABC.length; i++) {
      const kLower = ABC[i].toLowerCase()
      const kUpper = ABC[i]
      const val = opciones[kLower] ?? opciones[kUpper]
      if (val == null) break
      out.push(`${ABC[i]}. ${stripLabel(String(val))}`)
    }
    if (out.length) return out
  }

  
  return []
}

async function upsertProgresoNivel(opts: {
  id_usuario: number
  area: string
  subtema: string
  nivel_orden?: number | null
  preguntas_por_intento?: number | null
}) {
  const { id_usuario } = opts
  const area = canonArea(opts.area)
  const subtema = String(opts.subtema || '').trim()
  if (!area || !subtema) return

  const nivel = Number.isFinite(Number(opts.nivel_orden)) ? Number(opts.nivel_orden) : 1
  const preguntas = Number.isFinite(Number(opts.preguntas_por_intento))
    ? Number(opts.preguntas_por_intento)
    : 5

  const payload = { id_usuario, area, subtema, nivel_orden: nivel, preguntas_por_intento: preguntas }

  try {
    const existing = await ProgresoNivel.query()
      .where('id_usuario', id_usuario)
      .andWhere('area', area)
      .andWhere('subtema', subtema)
      .first()
    if (existing) await (existing as any).merge(payload as any).save()
    else await ProgresoNivel.create(payload as any)
  } catch {
    try {
      await ProgresoNivel.query()
        .where('id_usuario', id_usuario)
        .andWhere('area', area)
        .andWhere('subtema', subtema)
        .update(payload as any)
    } catch {}
  }
}

export default class SesionesService {




  // Normaliza etiqueta para stats: fuerza "sociales" en minúscula
private areaKeyForStats(a?: string | null) {
  const t = String(a || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();
  if (t.startsWith('mate')) return 'Matemáticas';
  if (t.startsWith('leng') || t.startsWith('lect')) return 'Lenguaje';
  if (t.startsWith('cien')) return 'Ciencias Naturales';
  if (t.startsWith('soci')) return 'sociales';
  if (t.startsWith('ing'))  return 'Inglés';
  return 'Desconocida';
}

  private normalizeText(text: string): string {
    return text.trim().toLowerCase();
  }
  
  ia = new IaService()

  private ensureDetalleTable() {
    const expected = 'public.sesiones_detalles'
    if ((SesionDetalle as any).table !== expected) (SesionDetalle as any).table = expected
  }

  private applySlotWhere(
    q: ReturnType<typeof Sesion.query>,
    slot: { id_usuario: number; area?: string | null; tipo?: string | null; nivel_orden?: number | null }
  ) {
    q.where('id_usuario', slot.id_usuario)
    if (slot.area === null) q.whereNull('area')
    else if (slot.area !== undefined) q.where('area', slot.area)
    if (slot.tipo === null) q.whereNull('tipo')
    else if (slot.tipo !== undefined) q.where('tipo', slot.tipo)
    if (slot.nivel_orden === null) q.whereNull('nivel_orden')
    else if (slot.nivel_orden !== undefined) q.where('nivel_orden', slot.nivel_orden)
    return q
  }


  private async upStartOrReuse(p: {
    id_usuario: number
    total_preguntas: number
    area?: string | null
    tipo?: string | null
    nivel_orden?: number | null
    modo?: string | null
    subtema?: string | null
    usa_estilo_kolb?: boolean
  }) {
    const now = DateTime.local()
    let ses = await this.applySlotWhere(Sesion.query(), p)
      .whereNull('fin_at')                  
      .first()

    if (ses) {
      const id_sesion = Number((ses as any).id_sesion)
      await SesionDetalle.query().where('id_sesion', id_sesion).delete()
      ;(ses as any).modo = p.modo ?? 'estandar'
      ;(ses as any).area = p.area ?? null
      ;(ses as any).subtema = p.subtema ?? null
      ;(ses as any).tipo = p.tipo ?? null
      ;(ses as any).nivel_orden = p.nivel_orden ?? null
      ;(ses as any).usa_estilo_kolb = !!p.usa_estilo_kolb
      ;(ses as any).inicio_at = now
      ;(ses as any).fin_at = null
      ;(ses as any).total_preguntas = p.total_preguntas
      ;(ses as any).correctas = 0
      ;(ses as any).puntaje_porcentaje = null
      await (ses as any).save()
      return ses
    }

    ses = await Sesion.create({
      id_usuario: p.id_usuario,
      modo: p.modo ?? 'estandar',
      area: p.area ?? null,
      subtema: p.subtema ?? null,
      tipo: p.tipo ?? null,
      nivel_orden: p.nivel_orden ?? null,
      usa_estilo_kolb: !!p.usa_estilo_kolb,
      inicio_at: now,
      total_preguntas: p.total_preguntas,
      correctas: 0,
    } as any)
    return ses
  }

  private async upAttachPreguntas(id_sesion: number, preguntas: Array<any>) {
    await SesionDetalle.query().where('id_sesion', id_sesion).delete()
    let orden = 1
    for (const p of preguntas || []) {
      const idPregunta = (p as any).id_pregunta
      if (!Number.isFinite(Number(idPregunta))) continue
      
      await SesionDetalle.create({
        id_sesion,
        id_pregunta: Number(idPregunta),
        orden,
      } as any)
      orden++
    }
  }

 /* ========= QUIZ INICIAL ========= */
async crearQuizInicial({ id_usuario }: { id_usuario: number; id_institucion?: number | null }) {
  // Cerramos solo las sesiones de quiz inicial (mantenemos las de práctica)
  await Sesion.query()
    .where('id_usuario', id_usuario)
    .whereNull('fin_at')
    .where('tipo', 'diagnostico')
    .update({ fin_at: DateTime.now() })

  const AREAS: Area[] = ['Matematicas', 'Lenguaje', 'Ciencias', 'sociales', 'Ingles']
  const pack: any[] = []

  for (const area of AREAS) {
    const lote = await this.ia.generarPreguntas({ area, cantidad: 5 } as any)
    pack.push(...lote)
  }

  const sesion = await this.upStartOrReuse({
    id_usuario,
    area: 'Todas',
    tipo: 'diagnostico',
    nivel_orden: 0,
    subtema: 'Todos',
    total_preguntas: pack.length,
    modo: 'estandar',
    usa_estilo_kolb: false,
  })

  const id_sesion = Number((sesion as any).id_sesion)

  // ⬇⬇⬇ FIX: insertar detalles SIN tiempo_asignado_seg
  const detalles = pack.map((p: any, i: number) => ({
    id_pregunta: Number(p.id_pregunta),
    id_sesion,
    orden: i + 1,
  }))
  if (detalles.length) {
    await SesionDetalle.createMany(detalles as any)
  }
  // ⬆⬆⬆ FIN FIX

  return {
    id_sesion,
    preguntas: pack.map((p: any) => ({
      id_pregunta: p.id_pregunta,
      area: p.area,
      subtema: p.subtema,
      enunciado: p.pregunta,
      opciones: fmtOpciones(p.opciones),
    })),
  }
}

/* CIERRE */
public async cerrarQuizInicial({
  id_sesion,
  respuestas,
}: { id_sesion: number; respuestas: RespCierre[] }) {

  await Sesion.findOrFail(id_sesion)

  const detalles = await SesionDetalle.query()
    .where('id_sesion', id_sesion)
    .select(['id_pregunta'])
  const ids = detalles.map((d: any) => Number(d.id_pregunta)).filter(Boolean)

  if (!ids.length) {
    await Sesion.query().where('id_sesion', id_sesion).update({
      correctas: 0,
      puntaje_porcentaje: 0,
      fin_at: DateTime.now(),
    })
    return { id_sesion, puntajes_por_area: {}, puntaje_general: 0, detalle: [] }
  }

  const banco = await BancoPregunta.query().whereIn('id_pregunta', ids)

  const correctaDe = new Map<number, string>()
  const areaDe = new Map<number, string>()
  const explicacionDe = new Map<number, string>()
  const totalOpcDe = new Map<number, number>()
  const porId = new Map<number, any>()

  for (const b of banco as any[]) {
    const idp = Number(b.id_pregunta)
    const total = safeOpcCount((b as any).opciones, 4)
    totalOpcDe.set(idp, total)
    correctaDe.set(idp, extractCorrectLetter(b, total))
    areaDe.set(idp, String((b as any).area))
    if ((b as any).explicacion) explicacionDe.set(idp, String((b as any).explicacion))
    porId.set(idp, b)
  }

  const normalizadas = (Array.isArray(respuestas) ? respuestas : [])
    .map((r: any) => {
      const idp = Number(r.id_pregunta ?? r.idPregunta ?? r.id ?? null)
      const raw = String(r.respuesta ?? r.seleccion ?? r.opcion ?? r.alternativa ?? '').trim()
      return { id_pregunta: idp, respuesta: raw }
    })
    .filter((x) => Number.isFinite(x.id_pregunta))

  const porArea: Record<string, { total: number; ok: number }> = {}
  for (const idp of ids) {
    const aKey = this.areaKeyForStats(areaDe.get(idp))
    porArea[aKey] = porArea[aKey] || { total: 0, ok: 0 }
    porArea[aKey].total += 1
  }

  const detalle: Array<{
    id_pregunta: number
    area: string | null
    correcta: string | null
    marcada: string | null
    es_correcta: boolean
    explicacion?: string | null
  }> = []

  for (const r of normalizadas) {
    const idp = Number(r.id_pregunta)
    const totalOpc = totalOpcDe.get(idp) ?? 4
    const marcada = toLetter(r.respuesta, totalOpc)
    const correcta = correctaDe.get(idp) || null

    const areaRaw = areaDe.get(idp) || 'Desconocida'
    const areaKey = this.areaKeyForStats(areaRaw)
    if (!porArea[areaKey]) porArea[areaKey] = { total: 0, ok: 0 }

    const ok = !!(marcada && correcta && marcada === correcta)
    if (ok) porArea[areaKey].ok += 1

    detalle.push({
      id_pregunta: idp,
      area: areaRaw,
      correcta,
      marcada: marcada || null,
      es_correcta: ok,
      explicacion: explicacionDe.get(idp) ?? null,
      // extras informativos
      enunciado: String(porId.get(idp)?.pregunta ?? ''),
      opciones: fmtOpciones(porId.get(idp)?.opciones),
    } as any)
  }

  const puntajes: Record<string, number> = {}
  let totalCorrectas = 0, totalPreguntas = 0

  for (const [aKey, agg] of Object.entries(porArea)) {
    const score = agg.total > 0 ? Math.round((agg.ok / agg.total) * 100) : 0
    puntajes[aKey] = score
    totalCorrectas += agg.ok
    totalPreguntas += agg.total
  }

  const puntajeGeneral = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0

  // guarda marcado/corrección en detalles y cierra
  await this.persistirCierreEnDetalle(id_sesion, detalle)

  await Sesion.query().where('id_sesion', id_sesion).update({
    correctas: totalCorrectas,
    puntaje_porcentaje: puntajeGeneral,
    fin_at: DateTime.now(),
  })

  return { id_sesion, puntajes_por_area: puntajes, puntaje_general: puntajeGeneral, detalle }
}

private async persistirCierreEnDetalle(
  id_sesion: number,
  detalle: Array<{ id_pregunta: number; es_correcta: boolean; marcada?: string | null }>
) {
  for (const d of detalle) {
    const detalleRecord = await SesionDetalle.query()
      .where('id_sesion', id_sesion)
      .where('id_pregunta', d.id_pregunta)
      .first()
    
    if (detalleRecord) {
      console.log(`Actualizando detalle: sesion=${id_sesion}, pregunta=${d.id_pregunta}, es_correcta=${d.es_correcta}`)
      detalleRecord.es_correcta = d.es_correcta
      detalleRecord.alternativa_elegida = (d.marcada ?? '').trim().toUpperCase().slice(0, 1) || undefined
      detalleRecord.respondida_at = DateTime.now()
      await detalleRecord.save()
      console.log(`Detalle guardado: es_correcta=${detalleRecord.es_correcta}`)
    } else {
      console.log(`NO se encontró registro para sesion=${id_sesion}, pregunta=${d.id_pregunta}`)
    }
  }
}

// ===================== /quizz/progreso (solo progreso) =====================
public async ProgresoDiagnostico(
  { id_usuario, id_sesion }: { id_usuario: number; id_sesion?: number }
) {
  // === Canon de salida fijo (coincide con tu UI) ===
  const OUT_KEYS = ['Matemáticas','Lenguaje','Ciencias Naturales','sociales','Inglés'] as const;
  type OutKey = typeof OUT_KEYS[number];

  // Normaliza nombres de área a una de las 5 claves anteriores
  const canonArea = (s: any): OutKey | null => {
    const t = String(s || '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '') // sin tildes
      .trim().toLowerCase();

    if (t.startsWith('mate')) return 'Matemáticas';
    if (t.startsWith('leng') || t.startsWith('lect') || t.includes('comun')) return 'Lenguaje';
    if (t.startsWith('cien')) return 'Ciencias Naturales'; 
    if (t.startsWith('soci')) return 'sociales';           
    if (t.startsWith('ingl') || t.includes('english')) return 'Inglés';
    return null;
  };

  // Interpreta booleanos/enteros/cadenas para es_correcta
  const isTrue = (v: any) => {
    if (v === true) return true;
    const s = String(v ?? '').trim().toLowerCase();
    return s === '1' || s === 't' || s === 'true' || s === 'yes';
  };

  // 1) Resolver la sesión de diagnóstico (la indicada o la última cerrada)
  let diag: any;
  if (id_sesion) {
    diag = await Sesion.query()
      .where('id_sesion', id_sesion)
      .where('id_usuario', id_usuario)
      .where('tipo', 'diagnostico')
      .first();
  } else {
    diag = await Sesion.query()
      .where('id_usuario', id_usuario)
      .where('tipo', 'diagnostico')
      .whereNotNull('fin_at')
      .orderBy('fin_at', 'desc')
      .first();
  }

  // 2) Sin diagnóstico → estructura en ceros
  const emptyOut = () => {
    const progreso_por_area = Object.fromEntries(
      OUT_KEYS.map(k => [k, { inicial: 0, actual: 0, delta: 0 }])
    ) as Record<OutKey, { inicial: number; actual: number; delta: number }>;
    return {
      tiene_diagnostico: false,
      progreso_por_area,
      progreso_general: { inicial: 0, actual: 0, delta: 0 }
    };
  };

  if (!diag) return emptyOut();

  const idDiag  = Number(diag.id_sesion);
  const finDiag = diag.fin_at;

  // 3) INICIAL = lo que quedó guardado en sesiones_detalles de ESA sesión
  const iniRows = await SesionDetalle.query()
    .from('sesiones_detalles as sd')
    .join('banco_preguntas as bp', 'bp.id_pregunta', 'sd.id_pregunta')
    .where('sd.id_sesion', idDiag)
    .select(['bp.area as area', 'sd.es_correcta as es_correcta'] as any);

  console.log(`[ProgresoDiagnostico] idDiag=${idDiag}, iniRows count=${iniRows.length}`)
  if (iniRows.length > 0) {
    console.log(`[ProgresoDiagnostico] Primer registro:`, iniRows[0])
  }

  const iniAgg: Record<OutKey, { t: number; o: number }> = {
    'Matemáticas': { t:0, o:0 },
    'Lenguaje': { t:0, o:0 },
    'Ciencias Naturales': { t:0, o:0 },
    'sociales': { t:0, o:0 },
    'Inglés': { t:0, o:0 },
  };

  let iniT = 0, iniO = 0;
  for (const r of iniRows as any[]) {
    const areaValue = (r as any).$extras?.area || (r as any).area
    const k = canonArea(areaValue);
    console.log(`[ProgresoDiagnostico] Procesando: area=${areaValue}, canonArea=${k}, es_correcta=${r.es_correcta}, isTrue(${r.es_correcta})=${isTrue(r.es_correcta)}`)
    if (!k) continue;
    iniAgg[k].t++; iniT++;
    if (isTrue(r.es_correcta)) { iniAgg[k].o++; iniO++; }
  }

  const inicialPorArea = {} as Record<OutKey, number>;
  for (const k of OUT_KEYS) {
    const v = iniAgg[k];
    inicialPorArea[k] = v.t ? Math.round((v.o * 100) / v.t) : 0;
  }
  const inicialGeneral = iniT ? Math.round((iniO * 100) / iniT) : 0;

  // 4) ACTUAL = desempeño en TODO lo respondido DESPUÉS del diagnóstico
  const postRows = await SesionDetalle.query()
    .from('sesiones_detalles as sd')
    .join('sesiones as s', 's.id_sesion', 'sd.id_sesion')
    .join('banco_preguntas as bp', 'bp.id_pregunta', 'sd.id_pregunta')
    .where('s.id_usuario', id_usuario)
    .whereNotNull('s.fin_at')
    .where('s.fin_at', '>', finDiag)
    .select(['bp.area as area', 'sd.es_correcta as es_correcta'] as any);

  const postAgg: Record<OutKey, { t: number; o: number }> = {
    'Matemáticas': { t:0, o:0 },
    'Lenguaje': { t:0, o:0 },
    'Ciencias Naturales': { t:0, o:0 },
    'sociales': { t:0, o:0 },
    'Inglés': { t:0, o:0 },
  };

  let postT = 0, postO = 0;
  for (const r of postRows as any[]) {
    const areaValue = (r as any).$extras?.area || (r as any).area
    const k = canonArea(areaValue);
    if (!k) continue;
    postAgg[k].t++; postT++;
    if (isTrue(r.es_correcta)) { postAgg[k].o++; postO++; }
  }

  const actualPorArea = {} as Record<OutKey, number>;
  if (!postT) {
    // si no ha practicado después del diagnóstico: actual = inicial
    for (const k of OUT_KEYS) actualPorArea[k] = inicialPorArea[k];
  } else {
    for (const k of OUT_KEYS) {
      const v = postAgg[k];
      actualPorArea[k] = v.t ? Math.round((v.o * 100) / v.t) : inicialPorArea[k];
    }
  }
  const actualGeneral = postT ? Math.round((postO * 100) / postT) : inicialGeneral;

  // 5) Salida
  const progreso_por_area = Object.fromEntries(
    OUT_KEYS.map(k => {
      const ini = inicialPorArea[k] ?? 0;
      const act = actualPorArea[k] ?? ini;
      return [k, { inicial: ini, actual: act, delta: act - ini }];
    })
  ) as Record<OutKey, { inicial: number; actual: number; delta: number }>;

  return {
    tiene_diagnostico: true,
    progreso_por_area,
    progreso_general: {
      inicial: inicialGeneral,
      actual: actualGeneral,
      delta: actualGeneral - inicialGeneral,
    },
  };
}


  /* ========= PARADA ========= */

    async crearParada(d: {
  id_usuario: number;
  area: Area;
  subtema: string;
  nivel_orden: number;
  usa_estilo_kolb: boolean;
  intento_actual?: number;
  estilo_kolb?: 'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador';
}) {
  this.ensureDetalleTable();

  // Normalización de los valores
  const area = this.normalizeText(String(d.area ?? '').trim());
  const subtema = this.normalizeText(String(d.subtema ?? '').trim());

  // Validar que se haya proporcionado un área y un subtema
  if (!area || !subtema) throw new Error('area y subtema son obligatorios');

  // NO cerramos sesiones previas para permitir múltiples áreas activas

  // Evitar repetir preguntas de sesiones previas del mismo subtema
  const prev = await Sesion.query()
    .where('id_usuario', d.id_usuario)
    .where('area', area)
    .where('subtema', subtema)
    .orderBy('inicio_at', 'asc')
    .first();

  const excludeIds: number[] = [];
  if (prev) {
    const detPrev = await SesionDetalle.query().where('id_sesion', (prev as any).id_sesion);
    excludeIds.push(...detPrev.map((x) => Number((x as any).id_pregunta)).filter(Boolean));
  }

  // Determinar el estilo Kolb a aplicar
  let estilo_kolb: 'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador' | undefined;
  if (d.estilo_kolb) estilo_kolb = d.estilo_kolb;
  else if (d.usa_estilo_kolb) {
    try {
      const k = await EstilosAprendizaje.findBy('id_usuario', d.id_usuario);
      const raw = String((k as any)?.estilo || '').toLowerCase();
      if (raw.startsWith('diver')) estilo_kolb = 'Divergente';
      else if (raw.startsWith('asim')) estilo_kolb = 'Asimilador';
      else if (raw.startsWith('conv')) estilo_kolb = 'Convergente';
      else if (raw.startsWith('acom')) estilo_kolb = 'Acomodador';
    } catch {}
  }

  // Normalizar área para IA (Ciencias -> Ciencias Naturales; Sociales OK)
  const areaUI: AreaUI =
    area.toLowerCase().startsWith('cien')
      ? ('Ciencias Naturales' as AreaUI)
      : area.toLowerCase().startsWith('soci')
      ? ('sociales' as AreaUI)
      : (area as AreaUI);

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`[crearParada] INICIO - Usuario: ${d.id_usuario}`)
  console.log(`[crearParada] Área: ${area} → ${areaUI}`)
  console.log(`[crearParada] Subtema: ${subtema}`)
  console.log(`[crearParada] Nivel: ${d.nivel_orden}`)
  console.log('═══════════════════════════════════════════════════════════')

  // ========== INTEGRACIÓN CON API DE IA ==========
  let preguntasIA: any[] = []
  let usandoIA = false
  let preguntasGeneradasJSONB: any = null

  // 1) Intentar generar preguntas con API de IA
  // NOTA: El estilo Kolb es OPCIONAL y completamente independiente del sistema de niveles
  // Si no hay estilo Kolb, la API de IA genera preguntas genéricas sin adaptación
  const estiloParaIA = estilo_kolb || 'Asimilador'  // Fallback solo para compatibilidad con API
  
  // Mapear subtema a formato que acepta la API de IA
  const subtemaParaAPI = mapearSubtema(areaUI, subtema)
  
  try {
    console.log(`[crearParada] 🤖 Intentando generar preguntas con API de IA...`)
    console.log(`[crearParada] Subtema original: "${subtema}"`)
    console.log(`[crearParada] Subtema para API: "${subtemaParaAPI}"`)
    
    const preguntasTransformadas = await IaExternalService.generarPreguntasIA({
      area: areaUI,
      subtema: subtemaParaAPI,
      estilo_kolb: estiloParaIA,
      cantidad: 5,
    })

    console.log(`[crearParada] 🔍 Preguntas recibidas de API:`, preguntasTransformadas?.length ?? 0)
    console.log(`[crearParada] 🔍 Tipo:`, typeof preguntasTransformadas)
    console.log(`[crearParada] 🔍 Es array:`, Array.isArray(preguntasTransformadas))

    if (preguntasTransformadas && preguntasTransformadas.length > 0) {
      console.log(`[crearParada] ✅ VALIDACIÓN EXITOSA: API de IA generó ${preguntasTransformadas.length} preguntas`)
      preguntasIA = IaExternalService.prepararParaMovil(preguntasTransformadas)
      preguntasGeneradasJSONB = IaExternalService.prepararParaJSONB(preguntasTransformadas)
      usandoIA = true
      console.log(`[crearParada] ✅ Preguntas preparadas para móvil:`, preguntasIA.length)
      console.log(`[crearParada] ✅ Preguntas preparadas para JSONB:`, preguntasGeneradasJSONB.length)
    } else {
      console.warn(`[crearParada] ⚠️ VALIDACIÓN FALLÓ: preguntasTransformadas vacío o undefined`)
    }
  } catch (error) {
    console.error('[crearParada] ❌ ERROR CAPTURADO: Al llamar API de IA, usando fallback a BD local')
    console.error('[crearParada] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[crearParada] Error message:', error instanceof Error ? error.message : String(error))
  }

  // 2) Fallback: Si API de IA falló o no hay estilo Kolb, usar BD local
  let locales: any[] = []
  if (!usandoIA) {
    console.log('[crearParada] Usando banco de preguntas local')
    locales = await this.ia.generarPreguntas({
      area: areaUI,
      subtemas: [subtema],
      estilo_kolb,
      cantidad: 5,
      excluir_ids: excludeIds,
    } as any)

    // Plan B: Si no hay suficientes preguntas por subtema, intentar obtener preguntas aleatorias por área
    if (!locales.length) {
      locales = await this.ia.generarPreguntas({
        area: areaUI,
        cantidad: 5,
        excluir_ids: excludeIds,
      } as any)
    }
  }

  // 3) Crear sesión
  const totalPreguntas = usandoIA ? preguntasIA.length : locales.length
  const sesion = await this.upStartOrReuse({
    id_usuario: d.id_usuario,
    area,
    tipo: 'practica',
    nivel_orden: d.nivel_orden ?? null,
    subtema,
    total_preguntas: totalPreguntas,
    modo: 'estandar',
    usa_estilo_kolb: !!d.usa_estilo_kolb,
  })

  const id_sesion = Number((sesion as any).id_sesion)

  // 4) Guardar preguntas según la fuente
  if (usandoIA) {
    // Guardar preguntas de IA en JSONB
    ;(sesion as any).preguntas_generadas = preguntasGeneradasJSONB
    await sesion.save()
    console.log(`[crearParada] Preguntas de IA guardadas en JSONB para sesión ${id_sesion}`)
  } else {
    // Guardar referencias en sesiones_detalles (BD local)
    if (locales.length) {
      await this.upAttachPreguntas(id_sesion, locales)
    }

    // Sembrado en segundo plano (no bloquea)
    void (async () => {
      await this.ia.generarYSembrarEnBancoBackground({
        area: areaUI,
        subtemas: [subtema],
        estilo_kolb,
        cantidad: 5,
        excluir_ids: excludeIds,
      } as any)
    })()
  }

  // 5) Actualizar el progreso de nivel del usuario
  await upsertProgresoNivel({
    id_usuario: d.id_usuario,
    area: d.area,
    subtema: d.subtema,
    nivel_orden: d.nivel_orden,
    preguntas_por_intento: totalPreguntas ?? 1,
  })

  // 6) Devolver los resultados de la sesión
  const preguntasParaMovil = usandoIA
    ? preguntasIA
    : (locales || []).map((p: any) => ({
        id_pregunta: p.id_pregunta,
        area: p.area ?? area,
        subtema,
        enunciado: p.pregunta,
        opciones: fmtOpciones(p.opciones),
      }))

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`[crearParada] RESULTADO FINAL:`)
  console.log(`[crearParada] Sesión ID: ${id_sesion}`)
  console.log(`[crearParada] Usando IA: ${usandoIA ? '✅ SÍ' : '❌ NO (banco local)'}`)
  console.log(`[crearParada] Total preguntas: ${preguntasParaMovil.length}`)
  console.log(`[crearParada] Primer pregunta id_pregunta: ${preguntasParaMovil[0]?.id_pregunta ?? 'null'}`)
  console.log('═══════════════════════════════════════════════════════════')

  return {
    sesion,
    preguntas: preguntasParaMovil,
    usandoIA, // Flag para debugging
  }
}

    async cerrarSesion(d: {
  id_sesion: number
  respuestas: Array<{
    orden?: number
    opcion?: string
    id_pregunta?: number
    respuesta?: string
    seleccion?: string
    alternativa?: string
    tiempo_empleado_seg?: number
  }>
}) {
  this.ensureDetalleTable()

  const ses = await Sesion.findOrFail(d.id_sesion)

  // ========== DETECTAR SI USA PREGUNTAS DE IA (JSONB) ==========
  const preguntasGeneradas = (ses as any).preguntas_generadas
  const usandoIA = preguntasGeneradas && Array.isArray(preguntasGeneradas) && preguntasGeneradas.length > 0

  if (usandoIA) {
    console.log(`[cerrarSesion] Sesión ${d.id_sesion} usa preguntas de IA (JSONB)`)
  } else {
    console.log(`[cerrarSesion] Sesión ${d.id_sesion} usa banco de preguntas local`)
  }

  const detalles = await SesionDetalle.query()
    .where('id_sesion', (ses as any).id_sesion)
    .orderBy('orden', 'asc')

  // mapa id_pregunta -> orden
  const ordenDeId = new Map<number, number>()
  for (const det of detalles as any[]) {
    const idp = Number(det.id_pregunta)
    const ord = Number(det.orden)
    if (Number.isFinite(idp) && Number.isFinite(ord)) ordenDeId.set(idp, ord)
  }

  // ---------- Normalización de respuestas ----------
  type RespNorm = {
    orden: number | null
    id_pregunta: number | null
    opcion: string
    tiempo_empleado_seg: number | null
  }

  const respuestas: RespNorm[] = (Array.isArray(d.respuestas) ? d.respuestas : [])
    .map((r: any): RespNorm | null => {
      const opcion = String(r.opcion ?? r.respuesta ?? r.seleccion ?? r.alternativa ?? '')
        .trim()
        .toUpperCase()

      const idp = Number(r.id_pregunta ?? r.idPregunta ?? r.id ?? NaN)
      const ord = Number(r.orden ?? NaN)
      const tiempo = Number.isFinite(Number(r.tiempo_empleado_seg))
        ? Number(r.tiempo_empleado_seg)
        : null

      if (Number.isFinite(ord)) {
        return { orden: ord, id_pregunta: Number.isFinite(idp) ? idp : null, opcion, tiempo_empleado_seg: tiempo }
      }
      if (Number.isFinite(idp)) {
        const mapeado = ordenDeId.get(idp) ?? null
        return { orden: mapeado, id_pregunta: idp, opcion, tiempo_empleado_seg: tiempo }
      }
      return null
    })
    .filter((x): x is RespNorm => x !== null)
  // -----------------------------------------------

  // Si no llegó nada útil: cerrar en cero
  if (respuestas.length === 0) {
    ;(ses as any).correctas = 0
    ;(ses as any).puntaje_porcentaje = 0
    ;(ses as any).fin_at = DateTime.now()
    await ses.save()

    const inicio = (ses as any).inicio_at ? DateTime.fromISO(String((ses as any).inicio_at)) : null
    const fin = (ses as any).fin_at ? DateTime.fromISO(String((ses as any).fin_at)) : null
    const duracionSegundos = inicio && fin ? Math.max(0, Math.round(fin.diff(inicio, 'seconds').seconds)) : 0

    return {
      aprueba: false,
      correctas: 0,
      puntaje: 0,
      finAt: (ses as any).fin_at,
      puntajePorcentaje: 0,
      duracionSegundos,
      resultado: 'no_aprobado',
      detalleResumen: [],
      createdAt: (ses as any).created_at ?? (ses as any).createdAt ?? null,
      updatedAt: (ses as any).updated_at ?? (ses as any).updatedAt ?? null,
    }
  }

  // Fallback: si 'detalles' está vacío, generar ordenes por ids recibidos
  if ((detalles as any[]).length === 0) {
    const idsDeRespuestas = respuestas.map((x) => Number(x.id_pregunta)).filter((x) => Number.isFinite(x))
    const bancoTmp = idsDeRespuestas.length
      ? await BancoPregunta.query().whereIn('id_pregunta', idsDeRespuestas)
      : []
    let idx = 1
    for (const b of bancoTmp as any[]) {
      const idp = Number(b.id_pregunta)
      ;(detalles as any[]).push({ id_pregunta: idp, orden: idx })
      ordenDeId.set(idp, idx)
      idx++
    }
  }

  // ========== CARGAR RESPUESTAS CORRECTAS ==========
  const totalOpcDe = new Map<number, number>()
  const correctaDe = new Map<number, string>()
  const correctaPorOrden = new Map<number, string>() // Para preguntas de IA

  if (usandoIA) {
    // Cargar respuestas correctas desde JSONB
    for (const pregIA of preguntasGeneradas) {
      const orden = Number(pregIA.orden)
      const respuestaCorrecta = String(pregIA.respuesta_correcta || '').trim().toUpperCase()
      const totalOpc = pregIA.opciones ? Object.keys(pregIA.opciones).length : 4
      
      correctaPorOrden.set(orden, respuestaCorrecta)
      totalOpcDe.set(orden, totalOpc)
      
      console.log(`[cerrarSesion] Pregunta IA orden ${orden}: correcta=${respuestaCorrecta}`)
    }
  } else {
    // Precargar banco (lógica original)
    const idsPreg = (detalles as any[]).map((x: any) => Number(x.id_pregunta)).filter((x) => Number.isFinite(x))
    const banco = idsPreg.length ? await BancoPregunta.query().whereIn('id_pregunta', idsPreg) : []

    for (const b of banco as any[]) {
      const idp = Number(b.id_pregunta)
      const totalOpc = safeOpcCount((b as any).opciones, 4)
      const letraCorrecta = extractCorrectLetter(b, totalOpc)
      totalOpcDe.set(idp, totalOpc)
      correctaDe.set(idp, letraCorrecta)
    }
  }

  let correctas = 0
  const detalleResumen: Array<{
    id_pregunta: number
    orden: number
    correcta: string | null
    marcada: string | null
    es_correcta: boolean
  }> = []

  // Helper si no encontramos el detalle pero sí tenemos id_pregunta
  const evaluaPorId = async (idp: number, marcadaRaw: string) => {
    if (!totalOpcDe.has(idp) || !correctaDe.has(idp)) {
      const b = await BancoPregunta.query().where('id_pregunta', idp).first()
      if (b) {
        const totalOpc = safeOpcCount((b as any).opciones, 4)
        const letraCorrecta = extractCorrectLetter(b, totalOpc)
        totalOpcDe.set(idp, totalOpc)
        correctaDe.set(idp, letraCorrecta)
      }
    }
    const totalOpc = totalOpcDe.get(idp) ?? 4
    const correcta = (correctaDe.get(idp) || '') as string
    const marcada = toLetter(marcadaRaw, totalOpc)
    const esCorrecta = !!(correcta && marcada && marcada === correcta)
    if (esCorrecta) correctas++
    const ord = ordenDeId.get(idp) ?? (detalleResumen.length + 1)
    detalleResumen.push({ id_pregunta: idp, orden: ord, correcta: correcta || null, marcada: marcada || null, es_correcta: esCorrecta })
  }

  // ---------- Procesar cada respuesta ----------
  for (const r of respuestas) {
    const orden = Number(r.orden ?? NaN)
    const idp = Number(r.id_pregunta ?? NaN)

    // ========== EVALUACIÓN PARA PREGUNTAS DE IA ==========
    if (usandoIA && Number.isFinite(orden)) {
      const alternativa_elegida = String(r.opcion || '').trim().toUpperCase().slice(0, 1)
      const correcta = correctaPorOrden.get(orden) || ''
      const totalOpc = totalOpcDe.get(orden) ?? 4
      const marcada = toLetter(alternativa_elegida, totalOpc)
      
      const esCorrecta = !!correcta && !!marcada && marcada === correcta
      if (esCorrecta) correctas++

      detalleResumen.push({
        id_pregunta: null, // Las preguntas de IA no tienen id en BD
        orden,
        correcta: correcta || null,
        marcada: marcada || null,
        es_correcta: esCorrecta,
      })
      
      console.log(`[cerrarSesion] Orden ${orden}: marcada=${marcada}, correcta=${correcta}, es_correcta=${esCorrecta}`)
      continue
    }

    // ========== EVALUACIÓN PARA BANCO LOCAL (LÓGICA ORIGINAL) ==========
    // localizar detalle por orden o por id
    let det: any = null
    if (r.orden != null) det = (detalles as any[]).find((x) => Number(x.orden) === Number(r.orden))
    if (!det && Number.isFinite(idp)) det = (detalles as any[]).find((x) => Number(x.id_pregunta) === idp)

    // si no hay det pero sí id, evaluar por id y seguir
    if (!det && Number.isFinite(idp)) {
      await evaluaPorId(idp, r.opcion)
      continue
    }
    if (!det) continue

    const alternativa_elegida = String(r.opcion || '').trim().toUpperCase().slice(0, 1)
    const tiempo_empleado_seg = r.tiempo_empleado_seg

    const limite = (det as any).tiempo_asignado_seg
    const excedioTiempo = limite != null && tiempo_empleado_seg != null && tiempo_empleado_seg > Number(limite)

    const totalOpc = totalOpcDe.get(Number(det.id_pregunta)) ?? 4
    const correcta = (correctaDe.get(Number(det.id_pregunta)) || '') as string
    const marcada = toLetter(alternativa_elegida, totalOpc)

    const esCorrecta = !excedioTiempo && !!correcta && !!marcada && marcada === correcta
    if (esCorrecta) correctas++

    // Guardar con el MODELO (acepta Luxon porque tienes @column.dateTime())
    ;(det as any).alternativa_elegida = alternativa_elegida
    ;(det as any).tiempo_empleado_seg = tiempo_empleado_seg ?? null
    ;(det as any).es_correcta = esCorrecta
    ;(det as any).respondida_at = DateTime.now()
    await det.save()

    detalleResumen.push({
      id_pregunta: Number(det.id_pregunta),
      orden: Number(det.orden),
      correcta: correcta || null,
      marcada: marcada || null,
      es_correcta: esCorrecta,
    })
  }
  // ---------------------------------------------

  ;(ses as any).correctas = correctas
  ;(ses as any).puntaje_porcentaje = Math.round(
    (correctas * 100) / Math.max(1, Number((ses as any).total_preguntas) || 5)
  )
  ;(ses as any).fin_at = DateTime.now()
  await ses.save()

  const inicio = (ses as any).inicio_at ? DateTime.fromISO(String((ses as any).inicio_at)) : null
  const fin = (ses as any).fin_at ? DateTime.fromISO(String((ses as any).fin_at)) : null
  const duracionSegundos = inicio && fin ? Math.max(0, Math.round(fin.diff(inicio, 'seconds').seconds)) : 0
  const horas = Math.floor(duracionSegundos / 3600)
  const minutos = Math.floor((duracionSegundos % 3600) / 60)
  const segundos = duracionSegundos % 60

  const aprueba = correctas >= 4
  const resultado = aprueba ? 'aprobado' : 'no_aprobado'

  if ((ses as any).area && (ses as any).subtema) {
    await upsertProgresoNivel({
      id_usuario: (ses as any).id_usuario,
      area: (ses as any).area,
      subtema: (ses as any).subtema,
      nivel_orden: (ses as any).nivel_orden ?? 1,
      preguntas_por_intento: (ses as any).total_preguntas ?? 5,
    })
  }

  // ========== TRIGGER: Notificación en tiempo real si puntaje bajo ==========
  const puntajeFinal = (ses as any).puntaje_porcentaje ?? 0
  if (puntajeFinal < 40 && (ses as any).area && (ses as any).id_usuario) {
    // Ejecutar de forma asíncrona sin bloquear la respuesta
    import('../services/notificaciones_realtime_service.js')
      .then(async (module) => {
        const NotificacionesRealtimeService = module.default
        const realtimeService = new NotificacionesRealtimeService()
        
        // Obtener id_institucion del usuario
        const usuario = await Usuario.query()
          .where('id_usuario', (ses as any).id_usuario)
          .select('id_institucion')
          .first()
        
        if (usuario) {
          await realtimeService.notificarPuntajeBajoInmediato(
            (ses as any).id_usuario,
            (ses as any).area,
            puntajeFinal,
            (usuario as any).id_institucion
          )
        }
      })
      .catch((error) => {
        console.error('[Trigger] Error notificando puntaje bajo:', error)
      })
  }
  // ==========================================================================

  return {
    aprueba,
    correctas,
    puntaje: (ses as any).puntaje_porcentaje,
    finAt: (ses as any).fin_at,
    puntajePorcentaje: (ses as any).puntaje_porcentaje,
    duracionSegundos,
    duracion: { horas, minutos, segundos },
    resultado,
    detalleResumen,
    createdAt: (ses as any).created_at ?? (ses as any).createdAt ?? null,
    updatedAt: (ses as any).updated_at ?? (ses as any).updatedAt ?? null,
  }
}



  /* ========= SIMULACRO POR ÁREA ========= */
  async crearSimulacroArea(d: { id_usuario: number; area: Area }) {
    this.ensureDetalleTable()

    const area = String(d.area ?? '').trim() as Area
    const TARGET = 25

    // NO cerramos sesiones previas para permitir múltiples áreas activas

    const elegidas: any[] = []
    const ya = new Set<number>()

    const mapBanco = (rows: any[]) =>
      rows.map((b: any) => ({
        id_pregunta: b.id_pregunta,
        area: b.area,
        subtema: b.subtema,
        pregunta: (b as any).pregunta,
        opciones: fmtOpciones((b as any).opciones),
        time_limit_seconds: (b as any).tiempo_limite_seg ?? null,
      }))

    try {
      const base = await BancoPregunta.query()
        .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
        .orderByRaw('random()')
        .limit(TARGET * 2)
      for (const r of base) {
        const id = Number((r as any).id_pregunta)
        if (!ya.has(id) && elegidas.length < TARGET) {
          ya.add(id)
          elegidas.push(...mapBanco([r]))
        }
      }
    } catch {
      const base = await BancoPregunta.query().whereILike('area', `%${area}%`).orderByRaw('random()').limit(TARGET * 2)
      for (const r of base) {
        const id = Number((r as any).id_pregunta)
        if (!ya.has(id) && elegidas.length < TARGET) {
          ya.add(id)
          elegidas.push(...mapBanco([r]))
        }
      }
    }

    const faltan = () => TARGET - elegidas.length
    if (faltan() > 0) {
      const extra = await BancoPregunta.query().orderByRaw('random()').limit(faltan())
      for (const r of extra) {
        const id = Number((r as any).id_pregunta)
        if (!ya.has(id) && elegidas.length < TARGET) {
          ya.add(id)
          elegidas.push(...mapBanco([r]))
        }
      }
    }

    const sesion = await this.upStartOrReuse({
      id_usuario: d.id_usuario,
      area,
      tipo: 'simulacro',
      nivel_orden: 6,
      subtema: 'todos los subtemas',
      total_preguntas: elegidas.length,
      modo: 'estandar',
      usa_estilo_kolb: false,
    })

    await this.upAttachPreguntas(Number((sesion as any).id_sesion), elegidas)

    return {
      sesion,
      totalPreguntas: elegidas.length,
      preguntas: elegidas.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        area: p.area,
        subtema: p.subtema,
        enunciado: p.pregunta,
        opciones: fmtOpciones(p.opciones),
      })),
    }
  }

  /* ========= CERRAR SIMULACRO ========= */
  async cerrarSesionSimulacro(d: { id_sesion: number; respuestas: Array<{ orden: number; opcion: string; tiempo_empleado_seg?: number }> }) {
    return this.cerrarSesion(d)
  }

  /* ========= SIMULACRO MIXTO ========= */
  private icfesScore(porcentaje: number) {
    const p = Math.max(0, Math.min(100, porcentaje))
    return Math.round((p / 100) * 500)
  }

  // 🔧 FIX 2: helper para hacer match robusto por área (Ciencias/Ciencias Naturales; Sociales/ciencias sociales)
  private matchArea(qb: any, area: string) {
    const t = String(area || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

    if (t.startsWith('cien')) {
      qb.whereRaw("unaccent(lower(area)) LIKE 'ciencias%'")
      return
    }
    if (t.startsWith('soci')) {
      qb.whereRaw("unaccent(lower(area)) LIKE 'social%'")
      return
    }
    qb.whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
  }

  async crearSimulacroMixto(d: { id_usuario: number; modalidad: 'facil' | 'dificil' }) {
      this.ensureDetalleTable()

      const TARGET = 25
      const AREAS: Array<'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'> = [
        'Matematicas',
        'Lenguaje',
        'Ciencias',
        'Sociales',
        'Ingles',
      ]
      const porArea = 5
      const mod = d.modalidad === 'dificil' ? 'dificil' : 'facil'
      const nivelOrden = mod === 'dificil' ? 8 : 7

      // NO cerramos sesiones previas para permitir múltiples áreas activas

      const ya = new Set<number>()
      const elegidas: any[] = []

      const mapBanco = (rows: any[]) =>
        rows.map((b: any) => ({
          id_pregunta: b.id_pregunta,
          area: b.area,
          subtema: b.subtema,
          pregunta: (b as any).pregunta,
          opciones: fmtOpciones((b as any).opciones),
          time_limit_seconds: mod === 'dificil' ? 60 : null,
        }))

      for (const area of AREAS) {
      const faltan = () => porArea - elegidas.filter((x) => (x as any).area === area).length
      if (faltan() <= 0) continue

      let base: any[] = []
      try {
        base = await BancoPregunta.query()
          
          .where((qb) => this.matchArea(qb, area))
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(faltan())
      } catch {
        base = await BancoPregunta.query()
        
          .whereILike('area', `%${area}%`)
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(faltan())
      }

        for (const r of base) {
          const id = Number((r as any).id_pregunta)
          if (elegidas.length < TARGET && !ya.has(id)) {
            ya.add(id)
            elegidas.push(...mapBanco([r]))
          }
        }
      }

      if (elegidas.length < TARGET) {
        const extra = await BancoPregunta.query()
          .if(ya.size > 0, (qb) => qb.whereNotIn('id_pregunta', Array.from(ya)))
          .orderByRaw('random()')
          .limit(TARGET - elegidas.length)
        for (const r of extra) {
          const id = Number((r as any).id_pregunta)
          if (elegidas.length < TARGET && !ya.has(id)) {
            ya.add(id)
            elegidas.push(...mapBanco([r]))
          }
        }
      }

      const sesion = await this.upStartOrReuse({
        id_usuario: d.id_usuario,
        area: 'Todas las areas',
        tipo: 'simulacro_mixto',
        nivel_orden: nivelOrden,
        subtema: 'Todos los subtemas',
        total_preguntas: elegidas.length,
        modo: 'estandar',
        usa_estilo_kolb: false,
      })

      await this.upAttachPreguntas(Number((sesion as any).id_sesion), elegidas)

      return {
        sesion,
        totalPreguntas: elegidas.length,
        preguntas: elegidas.map((p: any) => {
          const base: any = {
            id_pregunta: p.id_pregunta,
            area: p.area,
            subtema: p.subtema,
            enunciado: p.pregunta,
            opciones: fmtOpciones(p.opciones),
          };
          if (p.time_limit_seconds != null) {
            base.time_limit_seconds = p.time_limit_seconds;
          }
          return base;
        }),
      }
    }

  async cerrarSimulacroMixto(d: {
    id_sesion: number;
    respuestas: Array<
      | { orden: number; opcion?: string; respuesta?: string; seleccion?: string; alternativa?: string; tiempo_empleado_seg?: number }
      | { id_pregunta: number; opcion?: string; respuesta?: string; seleccion?: string; alternativa?: string; tiempo_empleado_seg?: number }
    >
  }) {
    // 1) Cierra sesión base (esto te da correctas y detalleResumen)
    const res = await this.cerrarSesion(d as any);

    // 2) Carga sesión y detalles para mapear id/orden -> área
    const ses = await Sesion.findOrFail(d.id_sesion);
    const detalles = await SesionDetalle.query().where('id_sesion', d.id_sesion);

    const ids = detalles.map((x: any) => Number(x.id_pregunta)).filter(Boolean);
    const banco = ids.length ? await BancoPregunta.query().whereIn('id_pregunta', ids) : [];

    // Mapas de área
    const areaPorId = new Map<number, string>();
    for (const b of banco as any[]) {
      areaPorId.set(Number(b.id_pregunta), String((b as any).area || 'Desconocida'));
    }
    const areaPorOrden = new Map<number, string>();
    for (const det of detalles as any[]) {
      const ord = Number(det.orden);
      const idp = Number(det.id_pregunta);
      const rawArea = areaPorId.get(idp) || 'Desconocida';
      areaPorOrden.set(ord, rawArea);
    }

    // 3) Fuente de verdad: detalleResumen de cerrarSesion
    type DR = { id_pregunta?: number; orden?: number; es_correcta?: boolean };
    const dr: DR[] = Array.isArray((res as any).detalleResumen) ? (res as any).detalleResumen : [];

    const areasAgg: Record<string, { total: number; ok: number }> = {};
    for (const item of dr) {
      const idp = Number((item as any).id_pregunta ?? NaN);
      const ord = Number((item as any).orden ?? NaN);

      // Resolver área por id o por orden
      const rawArea =
        (Number.isFinite(idp) ? areaPorId.get(idp) : undefined) ??
        (Number.isFinite(ord) ? areaPorOrden.get(ord) : undefined) ??
        'Desconocida';

      const area = this.areaKeyForStats(rawArea); // normaliza etiquetas
      if (!areasAgg[area]) areasAgg[area] = { total: 0, ok: 0 };
      areasAgg[area].total += 1;
      if (item.es_correcta === true) areasAgg[area].ok += 1;
    }

    // 4) Armar resumen por área
    const resumenAreas: Record<string, { total: number; correctas: number; porcentaje: number; puntaje_icfes: number }> = {};
    for (const [a, v] of Object.entries(areasAgg)) {
      const pct = v.total > 0 ? Math.round((v.ok / v.total) * 100) : 0;
      resumenAreas[a] = { total: v.total, correctas: v.ok, porcentaje: pct, puntaje_icfes: this.icfesScore(pct) };
    }

    // 5) Global consistente
    const total = Number((ses as any).total_preguntas) || 0;
    const correctas = Number((res as any).correctas ?? 0);
    const globalPct = total > 0 ? Math.round((correctas / total) * 100) : 0;

    return {
      ...res,
      nivelOrden: Number((ses as any).nivel_orden) || null,
      resumenAreas,
      global: {
        total,
        correctas,
        porcentaje: globalPct,
        puntaje_icfes: this.icfesScore(globalPct),
      },
    };
  }


  /* ========= DETALLE SESIÓN ========= */
  private nivelNombre(p: number) {
    if (p >= 91) return 'Experto'
    if (p >= 76) return 'Avanzado'
    if (p >= 51) return 'Intermedio'
    return 'Básico'
  }

  private icfes(p: number) {
    const clamped = Math.max(0, Math.min(100, Number(p) || 0))
    return Math.round(300 + clamped * 2)
  }

  private async ultimaSesionAnteriorPractica(row: any) {
    const area = String(row.area ?? '').trim()
    const subtema = String(row.subtema ?? '').trim()

    try {
      return await Sesion.query()
        .where('id_usuario', row.id_usuario)
        .where('tipo', 'practica')
        .whereRaw('unaccent(lower(area)) = unaccent(lower(?))', [area])
        .whereRaw('unaccent(lower(subtema)) = unaccent(lower(?))', [subtema])
        .where('inicio_at', '<', row.inicio_at)
        .whereNot('id_sesion', row.id_sesion)
        .whereNotNull('fin_at')
        .orderBy('inicio_at', 'desc')
        .first()
    } catch {
      return await Sesion.query()
        .where('id_usuario', row.id_usuario)
        .where('tipo', 'practica')
        .whereILike('area', area)
        .whereILike('subtema', subtema)
        .where('inicio_at', '<', row.inicio_at)
        .whereNot('id_sesion', row.id_sesion)
        .whereNotNull('fin_at')
        .orderBy('inicio_at', 'desc')
        .first()
    }
  }

  async detalleSesion(id_sesion: number) {
    this.ensureDetalleTable()

    const ses = await Sesion.find(id_sesion)
    if (!ses) return null
    const row: any = ses

    const detalles = await SesionDetalle.query().where('id_sesion', id_sesion).orderBy('orden', 'asc')

    const ids = detalles.map((d: any) => Number(d.id_pregunta)).filter(Boolean)
    const banco = ids.length ? await BancoPregunta.query().whereIn('id_pregunta', ids) : []

    const totalOpcDe = new Map<number, number>()
    const correctaDe = new Map<number, string>()
    const enunDe = new Map<number, string>()
    const areaDe = new Map<number, string>()
    const subtemaDe = new Map<number, string>()
    const explicacionDe = new Map<number, string>()

    for (const b of banco as any[]) {
      const idp = Number(b.id_pregunta)
      const total = safeOpcCount((b as any).opciones, 4)
      totalOpcDe.set(idp, total)
      correctaDe.set(idp, extractCorrectLetter(b, total))
      enunDe.set(idp, String((b as any).pregunta ?? ''))
      areaDe.set(idp, String((b as any).area ?? ''))
      subtemaDe.set(idp, String((b as any).subtema ?? ''))
      if ((b as any).explicacion) explicacionDe.set(idp, String((b as any).explicacion))
    }

   const preguntas = detalles.map((det: any) => {
  console.log(`det: ${JSON.stringify(det)}`);  // Verifica si alternativa_elegida está presente
  const idp = Number(det.id_pregunta);
  const total = totalOpcDe.get(idp) ?? 4;

  // Aquí se asegura que si no hay alternativa elegida, se asigna un valor vacío.
  const alternativaElegida = det.alternativa_elegida ? det.alternativa_elegida : '';
  
  const marcada = toLetter(alternativaElegida, total); // Aquí debería tener la respuesta seleccionada
  const correcta = correctaDe.get(idp) || null;

  // Verifica si la respuesta es correcta, comparando ambas en mayúsculas
  const es_correcta = marcada.trim().toUpperCase() === correcta?.trim().toUpperCase();

  return {
    orden: Number(det.orden),
    id_pregunta: idp,
    area: areaDe.get(idp) ?? null,
    subtema: subtemaDe.get(idp) ?? null,
    enunciado: enunDe.get(idp) ?? null,
    correcta,
    marcada,
    es_correcta,
    explicacion: explicacionDe.get(idp) ?? null,
    tiempo_empleado_seg: det.tiempo_empleado_seg ?? null,
  }
});



    const correctas = preguntas.filter((p) => p.es_correcta).length
    const total = Number(row.total_preguntas || preguntas.length || 0)
    const porcentaje = Number(row.puntaje_porcentaje ?? Math.round((correctas * 100) / Math.max(1, total)))
    const nivelActual = this.nivelNombre(porcentaje)

    const tiempoSum = detalles.reduce((acc: number, d: any) => acc + (Number(d.tiempo_empleado_seg) || 0), 0)
    const tiempoTotalSeg =
      tiempoSum > 0
        ? tiempoSum
        : (() => {
            const ini = row.inicio_at ? DateTime.fromISO(String(row.inicio_at)) : null
            const fin = row.fin_at ? DateTime.fromISO(String(row.fin_at)) : null
            if (ini && fin) return Math.max(0, Math.round(fin.diff(ini, 'seconds').seconds))
            return null
          })()

    const porSubtema = new Map<string, { total: number; ok: number }>()
    for (const p of preguntas) {
      const st = p.subtema || 'General'
      const v = porSubtema.get(st) || { total: 0, ok: 0 }
      v.total += 1
      if (p.es_correcta) v.ok += 1
      porSubtema.set(st, v)
    }

    const fortalezas: string[] = []
    const mejoras: string[] = []
    for (const [st, agg] of porSubtema.entries()) {
      const pct = agg.total ? Math.round((agg.ok / agg.total) * 100) : 0
      if (pct >= 80) fortalezas.push(st)
      else mejoras.push(st)
    }
    const recomendaciones = [
      ...(mejoras.length ? [`Refuerza: ${mejoras.join(', ')}`] : []),
      'Repite el intento con foco en tus áreas de mejora',
    ]

    let cambioNivel: 'mejora' | 'empeora' | 'igual' = 'igual'
    let nivelActualNum: number | null = Number(row.nivel_orden ?? null)
    let labelCambio = ''

    if (String(row.tipo).toLowerCase() === 'practica') {
      const prev = await this.ultimaSesionAnteriorPractica(row)
      if (prev) {
        const nivelAnterior = Number((prev as any).nivel_orden ?? null)
        if (Number.isFinite(nivelAnterior) && Number.isFinite(nivelActualNum as any)) {
          if ((nivelActualNum as number) > nivelAnterior) cambioNivel = 'mejora'
          else if ((nivelActualNum as number) < nivelAnterior) cambioNivel = 'empeora'
          else cambioNivel = 'igual'
        }
      }
      labelCambio = cambioNivel === 'mejora' ? 'Mejoraste' : cambioNivel === 'empeora' ? 'Empeoraste' : 'Te mantuviste'
    }

    const esMixto = String(row.tipo) === 'simulacro_mixto'
    const esSimArea = String(row.tipo) === 'simulacro'
    const headerMateria = esMixto ? 'Todas las áreas' : String(row.area || 'General')
    const puntajeGlobal = esMixto || esSimArea ? this.icfes(porcentaje) : porcentaje

    return {
      header: {
        materia: headerMateria,
        fecha: row.fin_at ?? row.inicio_at,
        nivel: nivelActual,
        nivelOrden: nivelActualNum,
        puntaje: puntajeGlobal,
        escala: esMixto || esSimArea ? 'ICFES' : 'porcentaje',
        tiempo_total_seg: tiempoTotalSeg,
        correctas,
        incorrectas: total - correctas,
        total,
      },
      resumen: {
        cambio: cambioNivel,
        mensaje: labelCambio,
        nivelActual: nivelActualNum,
      },
      preguntas,
      analisis: {
        fortalezas,
        mejoras,
        recomendaciones,
      },
    }
  }
}
