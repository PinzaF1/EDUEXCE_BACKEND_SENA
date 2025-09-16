import axios from 'axios'
import BancoPregunta from '../models/banco_pregunta.js'

export type ParametrosGeneracion = {
  area: 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'
  subtemas?: string[]
  dificultad?: 'facil' | 'media' | 'dificil'
  estilo_kolb?: 'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador'
  cantidad: number
  time_limit_seconds?: number
  id_institucion?: number | null        // ← pásalo desde el token del admin/estudiante
}

function mezclar<T>(xs: T[]) {
  return [...xs].sort(() => Math.random() - 0.5)
}

export default class IaService {
  async generarPreguntas(p: ParametrosGeneracion) {
    const API_URL = process.env.AI_API_URL || ''
    const API_KEY = process.env.AI_API_KEY || ''

    // 1) IA interna (si está configurada)
    try {
      if (API_URL && API_KEY) {
        const { data } = await axios.post(
          `${API_URL}/generate/icfes`,
          p,
          { headers: { Authorization: `Bearer ${API_KEY}` }, timeout: 12000 }
        )
        if (Array.isArray(data) && data.length) return data
      }
    } catch { /* fallback local */ }

    // 2) Fallback local: banco_preguntas (global + propias de la institución)
    let q = BancoPregunta.query().where('area', p.area)

    if (p.subtemas?.length) q = q.whereIn('subtema', p.subtemas)
    if (p.dificultad) q = q.where('dificultad', p.dificultad)
    if (p.estilo_kolb) q = q.where('estilo_kolb', p.estilo_kolb)

    // Preferir preguntas de la institución y permitir globales (id_institucion null)
    if (p.id_institucion && Number(p.id_institucion) > 0) {
      q = q.where((builder) => {
        builder.where('id_institucion', p.id_institucion!).orWhereNull('id_institucion')
      })
    }

    const candidatos = await q.orderBy('created_at', 'desc').limit(Math.max(10, p.cantidad * 3))
    const lista = mezclar(candidatos).slice(0, p.cantidad)

    return lista.map((x) => ({
      id_pregunta: x.id_pregunta,
      area: x.area,
      subtema: x.subtema,
      dificultad: x.dificultad,
      estilo_kolb: x.estilo_kolb,
      pregunta: x.pregunta,
      opciones: x.opciones,                 // [{key:'A', text:'...'}, ...]
      respuesta_correcta: x.respuesta_correcta,
      explicacion: x.explicacion,
      time_limit_seconds: x.time_limit_seconds || p.time_limit_seconds || null,
      origen: 'local',
    }))
  }
}
