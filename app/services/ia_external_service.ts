import axios, { AxiosError } from 'axios'

// ============================================================================
// TIPOS
// ============================================================================

type EstiloKolb = 'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador'

interface PreguntaIARequest {
  area: string
  subtema: string
  estilo_kolb: EstiloKolb
  cantidad: number
  longitud_min?: number
  longitud_max?: number
  max_tokens_item?: number
  temperatura?: number
}

interface PreguntaIAResponse {
  area: string
  subtema: string
  estilo_kolb: string
  pregunta: string
  opciones: Record<string, string> // { "A": "texto", "B": "texto", ... }
  respuesta_correcta: string // "A" | "B" | "C" | "D"
  explicacion: string
  meta?: {
    modelo: string
    tokens_usados: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
  }
}

interface APIResponse {
  ok: boolean
  solicitadas: number
  generadas: number
  resultados: PreguntaIAResponse[]
  errores: string[]
  tokens?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface PreguntaTransformada {
  orden: number
  pregunta: string
  opciones: Record<string, string> // Objeto original para guardar en JSONB
  opcionesArray: string[] // Array formateado para enviar al móvil
  respuesta_correcta: string
  explicacion: string
  area: string
  subtema: string
  estilo_kolb: string
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const IA_API_URL =
  'https://eduexel-ia-python-generador-preguntas.onrender.com/icfes/generar_pack'
const IA_TIMEOUT = 10000 // 10 segundos - Fallback rápido si IA no responde

// ============================================================================
// SERVICIO
// ============================================================================

class IaExternalService {
  /**
   * Genera preguntas usando la API de IA externa
   */
  async generarPreguntasIA(params: {
    area: string
    subtema: string
    estilo_kolb: EstiloKolb
    cantidad: number
  }): Promise<PreguntaTransformada[]> {
    try {
      console.log('🤖 [IA External] ═══════════════════════════════════════')
      console.log('[IA External] Llamando API de IA (timeout: 10s):', {
        url: IA_API_URL,
        area: params.area,
        subtema: params.subtema,
        estilo_kolb: params.estilo_kolb,
        cantidad: params.cantidad,
      })
      console.log('═══════════════════════════════════════════════════════════')

      const requestBody: PreguntaIARequest = {
        area: params.area,
        subtema: params.subtema,
        estilo_kolb: params.estilo_kolb,
        cantidad: params.cantidad,
        longitud_min: 200,
        longitud_max: 350,
        max_tokens_item: 600,
        temperatura: 0.2,
      }

      const response = await axios.post<APIResponse>(
        `${IA_API_URL}?cantidad=${params.cantidad}`,
        requestBody,
        {
          timeout: IA_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      // Validar respuesta
      console.log('[IA External] 🔍 Validando respuesta de API...')
      console.log('[IA External] response.data:', JSON.stringify(response.data, null, 2))
      
      if (!response.data || !response.data.ok) {
        console.error('[IA External] ❌ VALIDACIÓN FALLÓ: API devolvió ok=false o sin data')
        console.error('[IA External] response.data.ok:', response.data?.ok)
        console.error('[IA External] response.data.errores:', response.data?.errores)
        throw new Error(`API de IA devolvió ok=false: ${JSON.stringify(response.data?.errores || 'sin detalles')}`)
      }

      if (!Array.isArray(response.data.resultados) || response.data.resultados.length === 0) {
        console.error('[IA External] ❌ VALIDACIÓN FALLÓ: Sin resultados')
        console.error('[IA External] resultados:', response.data.resultados)
        throw new Error('API de IA no devolvió preguntas')
      }

      console.log('═══════════════════════════════════════════════════════════')
      console.log(`✅ [IA External] VALIDACIÓN EXITOSA: API respondió con ${response.data.resultados.length} preguntas`)
      console.log('═══════════════════════════════════════════════════════════')

      // Transformar preguntas al formato interno
      const preguntasTransformadas = response.data.resultados.map((pregunta, index) =>
        this.transformarPreguntaIA(pregunta, index + 1)
      )

      return preguntasTransformadas
    } catch (error) {
      console.error('❌ [IA External] ═══════════════════════════════════════')
      console.error('[IA External] 🚨 CAPTURADO ERROR EN CATCH')
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError
        if (axiosError.code === 'ECONNABORTED') {
          console.error(`[IA External] TIPO ERROR: Timeout (${IA_TIMEOUT/1000}s) - Usando fallback`)
        } else if (axiosError.response) {
          console.error('[IA External] TIPO ERROR: API respondió con HTTP error:', {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            data: axiosError.response.data
          })
        } else if (axiosError.request) {
          console.error('[IA External] TIPO ERROR: No se pudo conectar con API de IA (sin respuesta)')
        }
      } else {
        console.error('[IA External] TIPO ERROR: Error inesperado (no axios)')
        console.error('[IA External] Error completo:', error)
        if (error instanceof Error) {
          console.error('[IA External] Error.message:', error.message)
          console.error('[IA External] Error.stack:', error.stack)
        }
      }
      
      console.error('═══════════════════════════════════════════════════════════')
      throw error
    }
  }

  /**
   * Transforma una pregunta de la API al formato interno
   */
  private transformarPreguntaIA(
    preguntaIA: PreguntaIAResponse,
    orden: number
  ): PreguntaTransformada {
    // Transformar opciones de objeto a array con formato "A. texto"
    const opcionesArray = this.transformarOpciones(preguntaIA.opciones)

    return {
      orden,
      pregunta: preguntaIA.pregunta,
      opciones: preguntaIA.opciones, // Guardar objeto original para JSONB
      opcionesArray, // Array formateado para enviar al móvil
      respuesta_correcta: preguntaIA.respuesta_correcta.toUpperCase(),
      explicacion: preguntaIA.explicacion || '',
      area: preguntaIA.area,
      subtema: preguntaIA.subtema,
      estilo_kolb: preguntaIA.estilo_kolb,
    }
  }

  /**
   * Transforma opciones de objeto a array con formato "A. texto"
   * Input: { "A": "texto A", "B": "texto B", "C": "texto C", "D": "texto D" }
   * Output: ["A. texto A", "B. texto B", "C. texto C", "D. texto D"]
   */
  private transformarOpciones(opciones: Record<string, string>): string[] {
    return Object.entries(opciones)
      .sort(([letraA], [letraB]) => letraA.localeCompare(letraB)) // Ordenar A, B, C, D
      .map(([letra, texto]) => `${letra}. ${texto}`)
  }

  /**
   * Prepara las preguntas para guardar en JSONB
   */
  prepararParaJSONB(preguntas: PreguntaTransformada[]): any[] {
    return preguntas.map((p) => ({
      orden: p.orden,
      pregunta: p.pregunta,
      opciones: p.opciones, // Guardar objeto original
      respuesta_correcta: p.respuesta_correcta,
      explicacion: p.explicacion,
      area: p.area,
      subtema: p.subtema,
      estilo_kolb: p.estilo_kolb,
    }))
  }

  /**
   * Prepara las preguntas para enviar al móvil (sin respuestas correctas)
   */
  prepararParaMovil(preguntas: PreguntaTransformada[]): any[] {
    return preguntas.map((p) => ({
      id_pregunta: null, // Las preguntas de IA no tienen id en BD
      area: p.area,
      subtema: p.subtema,
      enunciado: p.pregunta,
      opciones: p.opcionesArray, // Array con formato "A. texto"
    }))
  }
}

export default new IaExternalService()
