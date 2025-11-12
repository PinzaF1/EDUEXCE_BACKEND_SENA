// app/services/ia_openai_service.ts
import OpenAI from 'openai'

type AnalisisSalida = {
  fortalezas: string[]
  mejoras: string[]
  recomendaciones: string[]
}

export default class IaOpenAIService {
  private client: OpenAI
  private model: string
  private timeoutMs: number

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || ''
    if (!apiKey) throw new Error('Falta OPENAI_API_KEY')
    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    })
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    this.timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 20000)
  }

  private agruparPorSubtema(preguntas: Array<{ subtema?: string | null; es_correcta?: boolean }>) {
    const mapa = new Map<string, { total: number; ok: number }>()
    for (const p of preguntas || []) {
      const key = String(p?.subtema ?? 'General').trim()
      const acc = mapa.get(key) || { total: 0, ok: 0 }
      acc.total += 1
      if (p?.es_correcta) acc.ok += 1
      mapa.set(key, acc)
    }
    return Array.from(mapa.entries()).map(([subtema, v]) => {
      const porcentaje = v.total ? Math.round((v.ok * 100) / v.total) : 0
      return { subtema, total: v.total, ok: v.ok, porcentaje }
    })
  }

  private fallback(preguntas: any[]): AnalisisSalida {
    const grupos = this.agruparPorSubtema(preguntas)
    const fortalezas: string[] = []
    const mejoras: string[] = []
    for (const g of grupos) {
      if (g.porcentaje >= 80) fortalezas.push(g.subtema)
      else mejoras.push(g.subtema)
    }
    return {
      fortalezas,
      mejoras,
      recomendaciones: [
        ...(mejoras.length ? [`Refuerza: ${mejoras.join(', ')}`] : []),
        'Repasa las preguntas falladas con autoexplicación.',
        'Practica 10-15 ítems diarios con repaso espaciado.',
        'Alterna sesiones cortas (25 min) con descansos (5 min).'
      ],
    }
  }

  public async analizarDesdeDetalleSesion(detalleSesion: any): Promise<AnalisisSalida> {
    const header = {
      materia: String(detalleSesion?.header?.materia ?? 'General'),
      nivel: String(detalleSesion?.header?.nivel ?? 'Básico'),
      correctas: Number(detalleSesion?.header?.correctas ?? 0),
      incorrectas: Number(detalleSesion?.header?.incorrectas ?? 0),
      total: Number(detalleSesion?.header?.total ?? 0),
      puntaje: Number(detalleSesion?.header?.puntaje ?? 0),
      escala: (detalleSesion?.header?.escala === 'ICFES' ? 'ICFES' : 'porcentaje') as 'ICFES' | 'porcentaje'
    }

    const preguntas = (Array.isArray(detalleSesion?.preguntas) ? detalleSesion.preguntas : []).map((p: any) => ({
      subtema: p?.subtema ?? 'General',
      es_correcta: !!p?.es_correcta
    }))

    const payload = {
      header,
      desempeño_por_subtema: this.agruparPorSubtema(preguntas),
    }

    const system = `Eres un tutor pedagógico. Devuelve SOLO JSON con esta forma:
{
  "fortalezas": string[],
  "mejoras": string[],
  "recomendaciones": string[]
}
3–6 recomendaciones, claras y accionables. No agregues texto fuera del JSON.`

    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), this.timeoutMs)

      const resp = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: 0.3,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: JSON.stringify(payload) },
          ],
          response_format: { type: 'json_object' },
        },
        // @ts-ignore
        { signal: controller.signal }
      )

      clearTimeout(t)

      const txt = resp.choices?.[0]?.message?.content || '{}'
      const parsed = JSON.parse(txt)
      const out: AnalisisSalida = {
        fortalezas: Array.isArray(parsed.fortalezas) ? parsed.fortalezas.slice(0, 10) : [],
        mejoras: Array.isArray(parsed.mejoras) ? parsed.mejoras.slice(0, 10) : [],
        recomendaciones: Array.isArray(parsed.recomendaciones) ? parsed.recomendaciones.slice(0, 10) : [],
      }

      if (!out.fortalezas.length && !out.mejoras.length && !out.recomendaciones.length) {
        return this.fallback(preguntas)
      }
      return out
    } catch {
      return this.fallback(preguntas)
    }
  }
}
