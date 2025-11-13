// app/services/ia_preguntas_service.ts
import OpenAI from 'openai'

// ============================================================================
// TIPOS
// ============================================================================

type EstiloKolb = 'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador'

interface PreguntaGenerada {
  pregunta: string
  opciones: Record<string, string> // { "A": "texto", "B": "texto", ... }
  respuesta_correcta: string
  explicacion: string
}

interface RespuestaOpenAI {
  preguntas: PreguntaGenerada[]
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
// SERVICIO
// ============================================================================

export default class IaPreguntasService {
  private client: OpenAI
  private model: string
  private timeoutMs: number
  private enabled: boolean

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || ''
    
    // Si no hay API key, deshabilitamos el servicio (usará fallback)
    if (!apiKey) {
      console.warn('⚠️ [IA Preguntas] OPENAI_API_KEY no configurada - usando fallback a banco local')
      this.enabled = false
      return
    }

    this.enabled = true
    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    })
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    this.timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 20000)

    console.log('✅ [IA Preguntas] SDK de OpenAI inicializado correctamente')
    console.log(`   - Modelo: ${this.model}`)
    console.log(`   - Timeout: ${this.timeoutMs}ms`)
  }

  /**
   * Verifica si el servicio está habilitado
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Genera preguntas usando OpenAI directamente
   */
  async generarPreguntas(params: {
    area: string
    subtema: string
    estilo_kolb: EstiloKolb
    cantidad: number
  }): Promise<PreguntaTransformada[]> {
    if (!this.enabled) {
      throw new Error('Servicio de IA no habilitado - API key no configurada')
    }

    console.log('🤖 [IA Preguntas] ═══════════════════════════════════════')
    console.log('[IA Preguntas] Generando preguntas con OpenAI SDK directo:')
    console.log('   - Área:', params.area)
    console.log('   - Subtema:', params.subtema)
    console.log('   - Estilo Kolb:', params.estilo_kolb)
    console.log('   - Cantidad:', params.cantidad)
    console.log('   - Modelo:', this.model)
    console.log('   - Timeout:', this.timeoutMs, 'ms')
    console.log('═══════════════════════════════════════════════════════════')

    try {
      const systemPrompt = this.construirSystemPrompt(params.estilo_kolb)
      const userPrompt = this.construirUserPrompt(params)

      // Control de timeout con AbortController
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)

      const startTime = Date.now()

      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: 0.2, // Baja temperatura para respuestas más consistentes
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' }, // Forzar respuesta en JSON
        },
        // @ts-ignore - signal es válido pero no está en los tipos
        { signal: controller.signal }
      )

      clearTimeout(timer)

      const duration = Date.now() - startTime

      console.log('═══════════════════════════════════════════════════════════')
      console.log(`✅ [IA Preguntas] Respuesta recibida en ${duration}ms`)
      console.log('═══════════════════════════════════════════════════════════')

      // Parsear y validar respuesta
      const content = response.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('OpenAI no devolvió contenido')
      }

      const parsed: RespuestaOpenAI = JSON.parse(content)

      if (!Array.isArray(parsed.preguntas) || parsed.preguntas.length === 0) {
        throw new Error('OpenAI no devolvió preguntas válidas')
      }

      console.log(`✅ [IA Preguntas] Parseadas ${parsed.preguntas.length} preguntas correctamente`)

      // Transformar preguntas al formato interno
      const preguntasTransformadas = parsed.preguntas.map((pregunta, index) =>
        this.transformarPregunta(pregunta, index + 1, params)
      )

      console.log('═══════════════════════════════════════════════════════════')
      console.log(`✅ [IA Preguntas] ÉXITO: ${preguntasTransformadas.length} preguntas generadas`)
      console.log('═══════════════════════════════════════════════════════════')

      return preguntasTransformadas

    } catch (error) {
      console.error('❌ [IA Preguntas] ═══════════════════════════════════════')
      console.error('[IA Preguntas] 🚨 ERROR al generar preguntas')

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`[IA Preguntas] TIPO: Timeout (${this.timeoutMs}ms excedido)`)
        } else {
          console.error('[IA Preguntas] TIPO:', error.name)
          console.error('[IA Preguntas] MENSAJE:', error.message)
        }
      } else {
        console.error('[IA Preguntas] Error desconocido:', error)
      }

      console.error('═══════════════════════════════════════════════════════════')
      throw error
    }
  }

  /**
   * Construye el prompt del sistema según el estilo de aprendizaje Kolb
   */
  private construirSystemPrompt(estiloKolb: EstiloKolb): string {
    const caracteristicasEstilo = {
      Divergente: 'Enfócate en situaciones problema que requieran pensamiento creativo, análisis desde múltiples perspectivas y reflexión. Usa contextos cotidianos y preguntas abiertas que inviten a imaginar soluciones.',
      Asimilador: 'Prioriza la comprensión de teorías, modelos conceptuales y relaciones lógicas entre ideas. Incluye definiciones claras, explicaciones sistemáticas y preguntas que requieran razonamiento abstracto.',
      Convergente: 'Presenta problemas con una solución práctica y concreta. Enfócate en aplicación directa de conocimientos, resolución eficiente de problemas y preguntas con respuesta única y definida.',
      Acomodador: 'Usa escenarios reales, experimentación práctica y situaciones que requieran tomar decisiones rápidas. Incluye contextos dinámicos donde se aprende haciendo y ajustando sobre la marcha.'
    }

    return `Eres un experto generador de preguntas tipo ICFES (examen de estado colombiano) para estudiantes de grado 11.

CONTEXTO EDUCATIVO COLOMBIANO:
El ICFES (Instituto Colombiano para la Evaluación de la Educación) evalúa competencias en 5 áreas fundamentales.
Debes generar preguntas que evalúen competencias, no solo memorización.

ÁREAS Y SUBTEMAS OFICIALES:

📐 MATEMÁTICAS:
  - Operaciones con números enteros
  - Razones y proporciones
  - Regla de tres simple y compuesta
  - Porcentajes y tasas (aumento, descuento, interés simple)
  - Ecuaciones lineales y sistemas 2×2

📚 LENGUAJE:
  - Comprensión lectora (sentido global y local)
  - Conectores lógicos (causa, contraste, condición, secuencia)
  - Identificación de argumentos y contraargumentos
  - Idea principal y propósito comunicativo
  - Hecho vs. opinión e inferencias

🌍 SOCIALES:
  - Constitución de 1991 y organización del Estado
  - Historia de Colombia - Frente Nacional
  - Guerras Mundiales y Guerra Fría
  - Geografía de Colombia (mapas, territorio y ambiente)

🔬 CIENCIAS NATURALES:
  - Indagación científica (variables, control e interpretación de datos)
  - Fuerzas, movimiento y energía
  - Materia y cambios (mezclas, reacciones y conservación)
  - Genética y herencia
  - Ecosistemas y cambio climático (CTS)

🌐 INGLÉS:
  - Verb to be (am, is, are)
  - Present Simple (afirmación, negación y preguntas)
  - Past Simple (verbos regulares e irregulares)
  - Comparatives and superlatives
  - Subject/Object pronouns & Possessive adjectives

ESTILO DE APRENDIZAJE KOLB: ${estiloKolb}
${caracteristicasEstilo[estiloKolb]}

CARACTERÍSTICAS DE LAS PREGUNTAS:
- Nivel: Educación media (grado 10-11)
- Formato: Pregunta tipo ICFES (opción múltiple con única respuesta)
- Opciones: Exactamente 4 opciones (A, B, C, D)
- Longitud: 200-350 caracteres por pregunta
- Distracción: Las opciones incorrectas deben ser plausibles pero claramente erróneas
- Explicación: Breve justificación de por qué la respuesta es correcta
- Contexto colombiano: Usa nombres, lugares y situaciones relevantes para Colombia

FORMATO DE RESPUESTA (JSON estricto):
{
  "preguntas": [
    {
      "pregunta": "Texto de la pregunta aquí",
      "opciones": {
        "A": "Primera opción",
        "B": "Segunda opción",
        "C": "Tercera opción",
        "D": "Cuarta opción"
      },
      "respuesta_correcta": "A",
      "explicacion": "Breve explicación de por qué A es correcta"
    }
  ]
}

IMPORTANTE:
- Devuelve SOLO JSON válido, sin texto adicional
- Todas las preguntas deben estar en español
- respuesta_correcta debe ser exactamente "A", "B", "C" o "D"
- Cada pregunta debe ser única y relevante al área/subtema solicitado
- Usa el subtema EXACTO que se te solicita (respétalo literalmente)`
  }

  /**
   * Construye el prompt del usuario con los parámetros específicos
   */
  private construirUserPrompt(params: {
    area: string
    subtema: string
    cantidad: number
  }): string {
    return `Genera ${params.cantidad} preguntas tipo ICFES sobre:

Área: ${params.area}
Subtema específico: ${params.subtema}

Recuerda:
- ${params.cantidad} preguntas diferentes
- Todas sobre el subtema: "${params.subtema}"
- Nivel de grado 11 (educación media colombiana)
- Formato JSON como especificado
- Adapta el enfoque según el estilo de aprendizaje Kolb indicado`
  }

  /**
   * Transforma una pregunta de OpenAI al formato interno
   */
  private transformarPregunta(
    pregunta: PreguntaGenerada,
    orden: number,
    params: { area: string; subtema: string; estilo_kolb: string }
  ): PreguntaTransformada {
    // Transformar opciones de objeto a array con formato "A. texto"
    const opcionesArray = this.transformarOpciones(pregunta.opciones)

    return {
      orden,
      pregunta: pregunta.pregunta,
      opciones: pregunta.opciones, // Guardar objeto original para JSONB
      opcionesArray, // Array formateado para enviar al móvil
      respuesta_correcta: pregunta.respuesta_correcta.toUpperCase(),
      explicacion: pregunta.explicacion || '',
      area: params.area,
      subtema: params.subtema,
      estilo_kolb: params.estilo_kolb,
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
