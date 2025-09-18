import axios from 'axios'
import BancoPregunta from '../models/banco_pregunta.js'

export type ParametrosGeneracion = {
  area: 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
  subtemas?: string[]
  dificultad?: 'facil' | 'media' | 'dificil'
  estilo_kolb?: 'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador'
  cantidad: number
  time_limit_seconds?: number
  id_institucion?: number | null
  excluir_ids?: number[]
}

function mezclar<T>(xs: T[]) {
  return [...xs].sort(() => Math.random() - 0.5)
}

// 👇 mapa de variantes para cubrir acentos/sinónimos frecuentes
function variantesArea(area: ParametrosGeneracion['area']): string[] {
  switch (area) {
    case 'Matematicas':
      return ['Matematicas', 'Matemáticas', 'Matematica', 'Matemática']
    case 'Ingles':
      return ['Ingles', 'Inglés', 'English']
    case 'Lenguaje':
      return ['Lenguaje', 'Lengua', 'Lectura crítica', 'Lectura Critica']
    case 'Ciencias':
      return ['Ciencias', 'Ciencias naturales', 'Ciencia Naturales', 'Naturales']
    case 'Sociales':
      return ['Sociales', 'Ciencias sociales', 'Ciencias Sociales']
    default:
      return [area]
  }
}

export default class IaService {
  private async fetchLocal(p: ParametrosGeneracion, usarInstitucion: boolean) {
    const makeQuery = () => {
      // 🔁 Usar variantes con/ sin acento
      let q = BancoPregunta.query().whereIn('area', variantesArea(p.area))

      if (p.subtemas?.length) q = q.whereIn('subtema', p.subtemas)
      if (p.dificultad) q = q.where('dificultad', p.dificultad)
      if (p.estilo_kolb) q = q.where('estilo_kolb', p.estilo_kolb)
      if (p.excluir_ids?.length) q = q.whereNotIn('id_pregunta', p.excluir_ids)

      if (usarInstitucion && p.id_institucion) {
        q = q.where((builder) => {
          builder.where('id_institucion', p.id_institucion as number).orWhereNull('id_institucion')
        })
      }

      return q.orderBy('created_at', 'desc').limit(Math.max(10, p.cantidad * 3))
    }

    try {
      const candidatos = await makeQuery()
      return mezclar(candidatos).slice(0, p.cantidad)
    } catch (e: any) {
      if (String(e?.message || '').includes('column "id_institucion" does not exist')) {
        const candidatos = await BancoPregunta.query()
          .whereIn('area', variantesArea(p.area))
          .if(p.subtemas?.length, (q) => q.whereIn('subtema', p.subtemas!))
          .if(!!p.dificultad, (q) => q.where('dificultad', p.dificultad!))
          .if(!!p.estilo_kolb, (q) => q.where('estilo_kolb', p.estilo_kolb!))
          .if(p.excluir_ids?.length, (q) => q.whereNotIn('id_pregunta', p.excluir_ids!))
          .orderBy('created_at', 'desc')
          .limit(Math.max(10, p.cantidad * 3))

        return mezclar(candidatos).slice(0, p.cantidad)
      }
      throw e
    }
  }

  async generarPreguntas(p: ParametrosGeneracion) {
    const API_URL = process.env.AI_API_URL || ''
    const API_KEY = process.env.AI_API_KEY || ''

    // 1) IA externa (si está configurada)
    if (API_URL && API_KEY) {
      try {
        const { data } = await axios.post(`${API_URL}/generate/icfes`, p, {
          headers: { Authorization: `Bearer ${API_KEY}` },
          timeout: 12000,
        })
        if (Array.isArray(data) && data.length) return data
      } catch { /* fallback local */ }
    }

    // 2) Fallback local
    const lista = await this.fetchLocal(p, true)

    return lista.map((x: any) => ({
      id_pregunta: x.id_pregunta,
      area: x.area,
      subtema: x.subtema,
      dificultad: x.dificultad,
      estilo_kolb: x.estilo_kolb,
      pregunta: x.pregunta,
      opciones: x.opciones,
      respuesta_correcta: x.respuesta_correcta,
      explicacion: x.explicacion,
      time_limit_seconds: p.time_limit_seconds ?? null,
    }))
  }

  // 25 preguntas (5 por área), SIN tener en cuenta el estilo del estudiante
  async generarQuizInicial({ id_institucion = null }: { id_institucion?: number | null }) {
    const areas: ParametrosGeneracion['area'][] = [
      'Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles',
    ]

    const packs: any[] = []
    for (const area of areas) {
      const parte = await this.generarPreguntas({
        area,
        cantidad: 5,
        dificultad: 'media',
        id_institucion,
      } as ParametrosGeneracion)
      packs.push(...parte)
    }
    return mezclar(packs)
  }
}
