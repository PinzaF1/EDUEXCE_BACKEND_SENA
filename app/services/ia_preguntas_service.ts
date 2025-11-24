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
// CONTEXTO OFICIAL ICFES SABER 11° (PORTADO DESDE icfes_saber11_fuentes.py)
// ============================================================================

type IcfesFuenteTipo = 'pagina_oficial' | 'infografia' | 'guia_orientacion' | string

interface IcfesFuente {
  tipo: IcfesFuenteTipo
  titulo: string
  url: string
  descripcion: string
}

interface IcfesCompetencia {
  nombre: string
  descripcion: string
}

interface IcfesAreaInfo {
  codigo_area: string
  descripcion: string
  competencias?: IcfesCompetencia[]
  componentes?: string[]
  tipos_textos?: {
    continuos?: string[]
    discontinuos?: string[]
  }
  herramientas?: {
    genericas?: string
    no_genericas?: string
  }
  estructura?: {
    resumen?: string
    partes?: string[]
  }
  fuentes?: IcfesFuente[]
}

// Mapea el nombre de área que usas en tu app -> nombre oficial Saber 11°
const ICFES_AREA_ALIAS: Record<string, string> = {
  Lenguaje: 'Lectura Crítica',          // Tu área "Lenguaje" ≈ prueba "Lectura Crítica"
  Matemáticas: 'Matemáticas',
  'Ciencias Naturales': 'Ciencias Naturales',
  Inglés: 'Inglés',
  sociales: 'Sociales y Ciudadanas',    // Clave 'sociales'
}

// Información oficial por área (resumen del módulo Python)
const ICFES_SABER11_AREAS: Record<string, IcfesAreaInfo> = {
  'Lectura Crítica': {
    codigo_area: 'LC',
    descripcion: 'Evalúa la capacidad del estudiante para comprender, interpretar y evaluar textos que se encuentran en la vida cotidiana y en contextos académicos no especializados. Las preguntas se organizan en torno a tres competencias y se aplican sobre textos continuos y discontinuos.',
    competencias: [
      {
        nombre: 'Identificar y entender los contenidos locales',
        descripcion: 'Comprender el significado de palabras, expresiones y frases que aparecen explícitamente en el texto.',
      },
      {
        nombre: 'Comprender el sentido global del texto',
        descripcion: 'Reconocer cómo se articulan los elementos locales de un texto para construir un sentido global coherente.',
      },
      {
        nombre: 'Reflexionar a partir del texto y evaluar su contenido',
        descripcion: 'Adoptar una postura crítica frente al texto, valorar sus afirmaciones y analizar su contenido.',
      },
    ],
    tipos_textos: {
      continuos: [
        'Literarios (cuentos, novelas).',
        'Informativos (ensayos, artículos de prensa).',
        'Filosóficos (fragmentos argumentativos).',
      ],
      discontinuos: ['Infografías.', 'Cómics.', 'Tablas.', 'Gráficos.'],
    },
    fuentes: [
      {
        tipo: 'pagina_oficial',
        titulo: 'Saber 11° - ICFES',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion: 'Página oficial general del examen Saber 11°.',
      },
      {
        tipo: 'infografia',
        titulo: 'Infografía Saber 11° - Prueba Lectura Crítica',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion:
          'Infografía oficial descargable al final de la sección, con competencias y tipos de texto de la prueba de Lectura Crítica.',
      },
      {
        tipo: 'guia_orientacion',
        titulo: 'Guía de orientación examen Saber 11°',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/guia-de-orientacion-examen-saber-11/',
        descripcion:
          'Guía oficial que describe la estructura del examen, número de preguntas y ejemplos de ítems.',
      },
    ],
  },

  Matemáticas: {
    codigo_area: 'MAT',
    descripcion:
      'Evalúa las competencias para enfrentar situaciones que requieren el uso de herramientas matemáticas en las categorías de álgebra y cálculo, geometría y estadística.',
    competencias: [
      {
        nombre: 'Interpretación y representación',
        descripcion:
          'Comprender, transformar y representar información, así como extraer la información relevante en contextos diversos.',
      },
      {
        nombre: 'Formulación y ejecución',
        descripcion:
          'Plantear y ejecutar estrategias matemáticas para resolver problemas en distintos contextos.',
      },
      {
        nombre: 'Argumentación',
        descripcion:
          'Validar o refutar conclusiones, soluciones, estrategias e interpretaciones desde el razonamiento matemático.',
      },
    ],
    herramientas: {
      genericas:
        'Herramientas matemáticas necesarias para interactuar de manera crítica en la sociedad.',
      no_genericas:
        'Herramientas específicas del quehacer matemático aprendidas en la etapa escolar.',
    },
    fuentes: [
      {
        tipo: 'pagina_oficial',
        titulo: 'Saber 11° - ICFES',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion: 'Página oficial general del examen Saber 11°.',
      },
      {
        tipo: 'infografia',
        titulo: 'Infografía Saber 11° - Prueba Matemáticas',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion:
          'Infografía oficial descargable al final de la sección, con competencias y enfoque de la prueba de Matemáticas.',
      },
      {
        tipo: 'guia_orientacion',
        titulo: 'Guía de orientación examen Saber 11°',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/guia-de-orientacion-examen-saber-11/',
        descripcion: 'Guía de orientación oficial del examen Saber 11°.',
      },
    ],
  },

  'Ciencias Naturales': {
    codigo_area: 'CN',
    descripcion:
      'Evalúa la capacidad del estudiante para comprender y usar nociones, conceptos y teorías de las ciencias naturales en la solución de problemas, valorando de manera crítica el conocimiento científico y sus consecuencias en la sociedad y el ambiente.',
    competencias: [
      {
        nombre: 'Indagación',
        descripcion:
          'Reconocer preguntas, procedimientos e información relevante; buscar, seleccionar e interpretar datos científicos.',
      },
      {
        nombre: 'Explicación de fenómenos',
        descripcion:
          'Analizar críticamente argumentos, modelos y explicaciones sobre fenómenos naturales.',
      },
      {
        nombre: 'Uso comprensivo del conocimiento científico',
        descripcion:
          'Emplear conceptos, teorías y modelos científicos para resolver problemas en distintos contextos.',
      },
    ],
    componentes: [
      'Químico (cambios químicos, estructura de la materia, mezclas, gases, energía).',
      'Biológico (seres vivos, herencia, reproducción, relaciones ecológicas, evolución).',
      'Físico (movimiento, energía, ondas, electromagnetismo, gravitación).',
      'Ciencia, Tecnología y Sociedad (CTS) en contextos locales y globales.',
    ],
    fuentes: [
      {
        tipo: 'pagina_oficial',
        titulo: 'Saber 11° - ICFES',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion: 'Página oficial general del examen Saber 11°.',
      },
      {
        tipo: 'infografia',
        titulo: 'Infografía Saber 11° - Prueba Ciencias Naturales',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion:
          'Infografía oficial con competencias y componentes de la prueba de Ciencias Naturales.',
      },
      {
        tipo: 'guia_orientacion',
        titulo: 'Guía de orientación examen Saber 11°',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/guia-de-orientacion-examen-saber-11/',
        descripcion: 'Guía de orientación oficial del examen Saber 11°.',
      },
    ],
  },

  Inglés: {
    codigo_area: 'ING',
    descripcion:
      'Evalúa la competencia comunicativa en lengua inglesa del estudiante, de acuerdo con el Marco Común Europeo, mediante tareas de lectura, gramática y léxico.',
    estructura: {
      resumen:
        'La prueba se organiza en siete partes, que incluyen emparejamiento de descripciones, interpretación de avisos, conversaciones cortas y textos con espacios.',
      partes: [
        'Parte 1: Emparejar descripciones con palabras (una de ejemplo, 5 correctas, 2 sobrantes).',
        'Parte 2: Relacionar avisos con los lugares o situaciones correspondientes.',
        'Parte 3: Completar conversaciones cortas escogiendo la respuesta correcta.',
        'Parte 4: Completar un texto con espacios, eligiendo la palabra que encaja en la estructura.',
        'Parte 5: Comprensión de lectura sobre un texto de nivel básico.',
        'Parte 6: Comprensión de lectura sobre un texto de mayor complejidad.',
        'Parte 7: Completar un texto con espacios eligiendo la palabra con significado y estructura correctos.',
      ],
    },
    fuentes: [
      {
        tipo: 'pagina_oficial',
        titulo: 'Saber 11° - ICFES',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion: 'Página oficial general del examen Saber 11°.',
      },
      {
        tipo: 'infografia',
        titulo: 'Infografía Saber 11° - Prueba Inglés',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion:
          'Infografía oficial con la descripción por partes de la prueba de Inglés.',
      },
      {
        tipo: 'guia_orientacion',
        titulo: 'Guía de orientación examen Saber 11°',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/guia-de-orientacion-examen-saber-11/',
        descripcion: 'Guía de orientación oficial del examen Saber 11°.',
      },
    ],
  },

  'Sociales y Ciudadanas': {
    codigo_area: 'SOC',
    descripcion:
      'Evalúa los conocimientos y habilidades que permiten comprender el mundo social desde la perspectiva de las ciencias sociales y el ejercicio de la ciudadanía.',
    competencias: [
      {
        nombre: 'Pensamiento social',
        descripcion:
          'Usar conceptos básicos de las ciencias sociales para comprender problemáticas y fenómenos sociales, políticos, económicos, culturales y geográficos, así como principios de la Constitución y del sistema político colombiano.',
      },
      {
        nombre: 'Pensamiento reflexivo y sistémico',
        descripcion:
          'Reconocer distintas formas de aproximarse a los problemas sociales, identificar la complejidad de las relaciones que los conforman y adoptar posturas críticas.',
      },
      {
        nombre: 'Interpretación y análisis de perspectivas',
        descripcion:
          'Analizar problemas sociales desde las perspectivas de los actores involucrados e interpretar fuentes y argumentos enmarcados en problemáticas sociales.',
      },
    ],
    fuentes: [
      {
        tipo: 'pagina_oficial',
        titulo: 'Saber 11° - ICFES',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion: 'Página oficial general del examen Saber 11°.',
      },
      {
        tipo: 'infografia',
        titulo: 'Infografía Saber 11° - Prueba Sociales y Ciudadanas',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/',
        descripcion:
          'Infografía oficial con competencias y enfoque de la prueba de Sociales y Ciudadanas.',
      },
      {
        tipo: 'guia_orientacion',
        titulo: 'Guía de orientación examen Saber 11°',
        url: 'https://www.icfes.gov.co/evaluaciones-icfes/saber-11/guia-de-orientacion-examen-saber-11/',
        descripcion: 'Guía de orientación oficial del examen Saber 11°.',
      },
    ],
  },
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
      console.warn(
        '⚠️ [IA Preguntas] OPENAI_API_KEY no configurada - usando fallback a banco local'
      )
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
      const systemPrompt = this.construirSystemPrompt(
        params.estilo_kolb,
        params.area
      )
      const userPrompt = this.construirUserPrompt(params)

      // Control de timeout con AbortController
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)

      const startTime = Date.now()

      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: 0.5, // Balance entre consistencia y creatividad para mayor variedad
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

      console.log(
        `✅ [IA Preguntas] Parseadas ${parsed.preguntas.length} preguntas correctamente`
      )

      // Mezclar opciones para distribuir aleatoriamente las respuestas correctas
      const preguntasMezcladas = parsed.preguntas.map((pregunta) =>
        this.mezclarOpciones(pregunta)
      )

      console.log(
        `✅ [IA Preguntas] Opciones mezcladas aleatoriamente para distribuir respuestas`
      )

      // Transformar preguntas al formato interno
      const preguntasTransformadas = preguntasMezcladas.map((pregunta, index) =>
        this.transformarPregunta(pregunta, index + 1, params)
      )

      console.log('═══════════════════════════════════════════════════════════')
      console.log(
        `✅ [IA Preguntas] ÉXITO: ${preguntasTransformadas.length} preguntas generadas`
      )
      console.log('═══════════════════════════════════════════════════════════')

      return preguntasTransformadas
    } catch (error) {
      console.error('❌ [IA Preguntas] ═══════════════════════════════════════')
      console.error('[IA Preguntas] 🚨 ERROR al generar preguntas')

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(
            `[IA Preguntas] TIPO: Timeout (${this.timeoutMs}ms excedido)`
          )
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
   * e inyecta el contexto oficial del área según ICFES Saber 11°
   */
  private construirSystemPrompt(
    estiloKolb: EstiloKolb,
    area: string
  ): string {
    const caracteristicasEstilo: Record<EstiloKolb, string> = {
      Divergente: 'Enfócate en situaciones problema que requieran pensamiento creativo, análisis desde múltiples perspectivas y reflexión. Usa contextos cotidianos y preguntas abiertas que inviten a imaginar soluciones.',
      Asimilador: 'Prioriza la comprensión de teorías, modelos conceptuales y relaciones lógicas entre ideas. Incluye definiciones claras, explicaciones sistemáticas y preguntas que requieran razonamiento abstracto.',
      Convergente: 'Presenta problemas con una solución práctica y concreta. Enfócate en aplicación directa de conocimientos, resolución eficiente de problemas y preguntas con respuesta única y definida.',
      Acomodador: 'Usa escenarios reales, experimentación práctica y situaciones que requieran tomar decisiones rápidas. Incluye contextos dinámicos donde se aprende haciendo y ajustando sobre la marcha.',
    }

    const areaOficial = ICFES_AREA_ALIAS[area] || area
    const infoArea = ICFES_SABER11_AREAS[areaOficial]
    let contextoArea = ''

    if (infoArea) {
      contextoArea += `\n\nINFORMACIÓN OFICIAL DEL ÁREA "${areaOficial}" SEGÚN ICFES SABER 11°:\n`
      contextoArea += `- Código de área: ${infoArea.codigo_area}\n`
      contextoArea += `- Descripción general: ${infoArea.descripcion}\n`

      if (infoArea.competencias && infoArea.competencias.length > 0) {
        contextoArea += '\nCOMPETENCIAS PRINCIPALES QUE DEBEN EVALUARSE:\n'
        contextoArea += infoArea.competencias
          .map(
            (c) => `- ${c.nombre}: ${c.descripcion}`
          )
          .join('\n')
        contextoArea += '\n'
      }

      if (infoArea.componentes && infoArea.componentes.length > 0) {
        contextoArea += '\nCOMPONENTES CLAVE DEL ÁREA:\n'
        contextoArea += infoArea.componentes
          .map((comp) => `- ${comp}`)
          .join('\n')
        contextoArea += '\n'
      }

      if (infoArea.tipos_textos) {
        const { continuos, discontinuos } = infoArea.tipos_textos
        if (
          (continuos && continuos.length > 0) ||
          (discontinuos && discontinuos.length > 0)
        ) {
          contextoArea += '\nTIPOS DE TEXTOS QUE PUEDEN APARECER EN LAS PREGUNTAS:\n'
          if (continuos && continuos.length > 0) {
            contextoArea += '- Textos continuos:\n'
            contextoArea += continuos
              .map((t) => `  * ${t}`)
              .join('\n')
            contextoArea += '\n'
          }
          if (discontinuos && discontinuos.length > 0) {
            contextoArea += '- Textos discontinuos:\n'
            contextoArea += discontinuos
              .map((t) => `  * ${t}`)
              .join('\n')
            contextoArea += '\n'
          }
        }
      }

      if (infoArea.herramientas) {
        contextoArea += '\nHERRAMIENTAS MATEMÁTICAS A CONSIDERAR:\n'
        if (infoArea.herramientas.genericas) {
          contextoArea += `- Herramientas genéricas: ${infoArea.herramientas.genericas}\n`
        }
        if (infoArea.herramientas.no_genericas) {
          contextoArea += `- Herramientas no genéricas: ${infoArea.herramientas.no_genericas}\n`
        }
      }

      if (infoArea.estructura) {
        contextoArea += '\nESTRUCTURA TÍPICA DE LA PRUEBA EN ESTA ÁREA:\n'
        if (infoArea.estructura.resumen) {
          contextoArea += `- Resumen: ${infoArea.estructura.resumen}\n`
        }
        if (infoArea.estructura.partes && infoArea.estructura.partes.length > 0) {
          contextoArea += '- Partes:\n'
          contextoArea += infoArea.estructura.partes
            .map((p) => `  * ${p}`)
            .join('\n')
          contextoArea += '\n'
        }
      }

      if (infoArea.fuentes && infoArea.fuentes.length > 0) {
        contextoArea +=
          '\nFUENTES OFICIALES DE REFERENCIA (ÚSALAS SOLO COMO CONTEXTO, NO LAS MENCIONES EN LOS ENUNCIADOS):\n'
        contextoArea += infoArea.fuentes
          .map(
            (f) => `- ${f.titulo} (${f.url}): ${f.descripcion}`
          )
          .join('\n')
      }
    }

    const basePrompt = `Eres un experto generador de preguntas tipo ICFES (examen de estado colombiano) para estudiantes de grado 11.

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

📚 LENGUAJE (LECTURA CRÍTICA):
  - Comprensión lectora (sentido global y local)
  - Conectores lógicos (causa, contraste, condición, secuencia)
  - Identificación de argumentos y contraargumentos
  - Idea principal y propósito comunicativo
  - Hecho vs. opinión e inferencias

🌍 SOCIALES Y CIUDADANAS:
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

    // Añadimos el contexto específico del área oficial al final del prompt
    return basePrompt + contextoArea
  }

  /**
   * Construye el prompt del usuario con los parámetros específicos
   */
  private construirUserPrompt(params: {
    area: string
    subtema: string
    cantidad: number
  }): string {
    const areaOficial = ICFES_AREA_ALIAS[params.area] || params.area

    return `Genera ${params.cantidad} preguntas tipo ICFES sobre:

Área interna (app): ${params.area}
Área oficial ICFES Saber 11°: ${areaOficial}
Subtema específico: ${params.subtema}

Recuerda:
- ${params.cantidad} preguntas diferentes
- Todas sobre el subtema: "${params.subtema}"
- Nivel de grado 11 (educación media colombiana)
- Formato JSON como especificado
- Adapta el enfoque según el estilo de aprendizaje Kolb indicado
- Asegúrate de que cada pregunta sea coherente con la descripción, competencias y estructura oficial del área "${areaOficial}" proporcionadas en el contexto del sistema.`
  }

  /**
   * Mezcla aleatoriamente las opciones de una pregunta y actualiza la respuesta correcta
   * y las referencias en la explicación para evitar que todas sean 'A'
   */
  private mezclarOpciones(pregunta: PreguntaGenerada): PreguntaGenerada {
    const letrasOriginales = ['A', 'B', 'C', 'D']
    const letrasMezcladas = [...letrasOriginales].sort(() => Math.random() - 0.5)

    // Crear mapeo: letra_original → letra_nueva
    const mapeo: Record<string, string> = {}
    letrasOriginales.forEach((original, index) => {
      mapeo[original] = letrasMezcladas[index]
    })

    // Reordenar opciones según el mapeo
    const nuevasOpciones: Record<string, string> = {}
    Object.entries(pregunta.opciones).forEach(([letra, texto]) => {
      const nuevaLetra = mapeo[letra]
      nuevasOpciones[nuevaLetra] = texto
    })

    // Actualizar respuesta correcta
    const respuestaOriginal = pregunta.respuesta_correcta.toUpperCase()
    const nuevaRespuestaCorrecta = mapeo[respuestaOriginal] || respuestaOriginal

    // Actualizar explicación reemplazando referencias a la letra original
    let nuevaExplicacion = pregunta.explicacion
    if (respuestaOriginal !== nuevaRespuestaCorrecta) {
      // Patrones comunes donde aparece la letra en español
      const patrones = [
        new RegExp(`\\b${respuestaOriginal}\\b`, 'g'), // "A" suelta
        new RegExp(`opción\\s+${respuestaOriginal}\\b`, 'gi'), // "opción A"
        new RegExp(`respuesta\\s+${respuestaOriginal}\\b`, 'gi'), // "respuesta A"
        new RegExp(`alternativa\\s+${respuestaOriginal}\\b`, 'gi'), // "alternativa A"
        new RegExp(`\\(${respuestaOriginal}\\)`, 'g'), // "(A)"
      ]

      patrones.forEach((patron) => {
        nuevaExplicacion = nuevaExplicacion.replace(
          patron,
          (match) => match.replace(respuestaOriginal, nuevaRespuestaCorrecta)
        )
      })
    }

    return {
      pregunta: pregunta.pregunta,
      opciones: nuevasOpciones,
      respuesta_correcta: nuevaRespuestaCorrecta,
      explicacion: nuevaExplicacion,
    }
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
