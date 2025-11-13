// tests/functional/servicios/ia_preguntas.spec.ts
import { test } from '@japa/runner'
import IaPreguntasService from '#services/ia_preguntas_service'

test.group('IaPreguntasService - SDK OpenAI', (group) => {
  let originalKey: string | undefined
  let originalModel: string | undefined
  let originalTimeout: string | undefined

  group.each.setup(() => {
    // Guardar valores originales
    originalKey = process.env.OPENAI_API_KEY
    originalModel = process.env.OPENAI_MODEL
    originalTimeout = process.env.OPENAI_TIMEOUT_MS
  })

  group.each.teardown(() => {
    // Restaurar valores originales
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey
    else delete process.env.OPENAI_API_KEY

    if (originalModel !== undefined) process.env.OPENAI_MODEL = originalModel
    else delete process.env.OPENAI_MODEL

    if (originalTimeout !== undefined) process.env.OPENAI_TIMEOUT_MS = originalTimeout
    else delete process.env.OPENAI_TIMEOUT_MS
  })

  // ==================== INICIALIZACIÓN ====================

  test('Inicialización: debe detectar cuando no hay API key', ({ assert }) => {
    // Arrange: Sin API key
    delete process.env.OPENAI_API_KEY

    // Act
    const service = new IaPreguntasService()

    // Assert
    assert.isFalse(service.isEnabled(), 'Servicio debe estar deshabilitado sin API key')
  })

  test('Inicialización: debe habilitarse con API key válida', ({ assert }) => {
    // Arrange: Con API key
    process.env.OPENAI_API_KEY = 'sk-test-key-1234567890'

    // Act
    const service = new IaPreguntasService()

    // Assert
    assert.isTrue(service.isEnabled(), 'Servicio debe estar habilitado con API key')
  })

  test('Configuración: debe usar valores por defecto', ({ assert }) => {
    // Arrange
    process.env.OPENAI_API_KEY = 'sk-test-key'
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_TIMEOUT_MS

    // Act
    const service = new IaPreguntasService()

    // Assert: Los valores por defecto se aplican internamente
    assert.isTrue(service.isEnabled())
    // No podemos verificar los valores privados, pero al menos confirmamos que no lanza error
  })

  test('Configuración: debe usar valores personalizados', ({ assert }) => {
    // Arrange
    process.env.OPENAI_API_KEY = 'sk-test-key'
    process.env.OPENAI_MODEL = 'gpt-4'
    process.env.OPENAI_TIMEOUT_MS = '30000'

    // Act
    const service = new IaPreguntasService()

    // Assert
    assert.isTrue(service.isEnabled())
    // Los valores se aplican internamente sin lanzar error
  })

  // ==================== GENERACIÓN DE PREGUNTAS ====================

  test('Generación: debe lanzar error si servicio no está habilitado', async ({ assert }) => {
    // Arrange: Sin API key
    delete process.env.OPENAI_API_KEY
    const service = new IaPreguntasService()

    // Act & Assert
    await assert.rejects(
      async () => {
        await service.generarPreguntas({
          area: 'Matematicas',
          subtema: 'Operaciones con números enteros',
          estilo_kolb: 'Convergente',
          cantidad: 3,
        })
      },
      'Debe lanzar error cuando el servicio no está habilitado'
    )
  })

  test('Generación REAL: debe generar preguntas con OpenAI', async ({ assert }) => {
    // Arrange: Con API key real
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      assert.pass('Test omitido - no hay API key real configurada')
      return
    }

    process.env.OPENAI_API_KEY = apiKey
    const service = new IaPreguntasService()

    // Act: Generar 3 preguntas
    const preguntas = await service.generarPreguntas({
      area: 'Matematicas',
      subtema: 'Operaciones con números enteros',
      estilo_kolb: 'Convergente',
      cantidad: 3,
    })

    // Assert: Estructura correcta
    assert.isArray(preguntas, 'Debe retornar un array')
    assert.equal(preguntas.length, 3, 'Debe generar 3 preguntas')

    // Validar primera pregunta
    const p1 = preguntas[0]
    assert.exists(p1.pregunta, 'Debe tener pregunta')
    assert.isString(p1.pregunta, 'Pregunta debe ser string')
    assert.isAtLeast(p1.pregunta.length, 50, 'Pregunta debe tener al menos 50 caracteres')

    assert.exists(p1.opciones, 'Debe tener opciones')
    assert.isObject(p1.opciones, 'Opciones debe ser objeto')
    assert.exists(p1.opciones.A, 'Debe tener opción A')
    assert.exists(p1.opciones.B, 'Debe tener opción B')
    assert.exists(p1.opciones.C, 'Debe tener opción C')
    assert.exists(p1.opciones.D, 'Debe tener opción D')

    assert.exists(p1.opcionesArray, 'Debe tener opcionesArray')
    assert.isArray(p1.opcionesArray, 'opcionesArray debe ser array')
    assert.equal(p1.opcionesArray.length, 4, 'Debe tener 4 opciones en array')

    assert.exists(p1.respuesta_correcta, 'Debe tener respuesta_correcta')
    assert.match(p1.respuesta_correcta, /^[A-D]$/, 'respuesta_correcta debe ser A, B, C o D')

    assert.exists(p1.explicacion, 'Debe tener explicación')
    assert.isString(p1.explicacion, 'Explicación debe ser string')

    assert.equal(p1.area, 'Matematicas', 'Debe tener área correcta')
    assert.equal(p1.subtema, 'Operaciones con números enteros', 'Debe tener subtema correcto')
    assert.equal(p1.estilo_kolb, 'Convergente', 'Debe tener estilo Kolb correcto')
  }).timeout(30000) // 30 segundos para llamada real a OpenAI

  // ==================== PREPARACIÓN PARA MÓVIL ====================

  test('prepararParaMovil: debe transformar preguntas correctamente', ({ assert }) => {
    // Arrange
    process.env.OPENAI_API_KEY = 'sk-test-key'
    const service = new IaPreguntasService()

    const preguntasInternas = [
      {
        orden: 1,
        pregunta: 'Pregunta de prueba',
        opciones: { A: 'Opción 1', B: 'Opción 2', C: 'Opción 3', D: 'Opción 4' },
        opcionesArray: ['A. Opción 1', 'B. Opción 2', 'C. Opción 3', 'D. Opción 4'],
        respuesta_correcta: 'B',
        explicacion: 'Explicación de prueba',
        area: 'Matematicas',
        subtema: 'Test',
        estilo_kolb: 'Convergente',
      },
    ]

    // Act
    const paraMovil = service.prepararParaMovil(preguntasInternas as any)

    // Assert
    assert.isArray(paraMovil)
    assert.equal(paraMovil.length, 1)

    const p = paraMovil[0]
    assert.isNull(p.id_pregunta, 'id_pregunta debe ser null para preguntas de IA')
    assert.equal(p.area, 'Matematicas')
    assert.equal(p.subtema, 'Test')
    assert.equal(p.enunciado, 'Pregunta de prueba')
    assert.isArray(p.opciones)
    assert.equal(p.opciones.length, 4)
  })

  // ==================== PREPARACIÓN PARA JSONB ====================

  test('prepararParaJSONB: debe transformar preguntas correctamente', ({ assert }) => {
    // Arrange
    process.env.OPENAI_API_KEY = 'sk-test-key'
    const service = new IaPreguntasService()

    const preguntasInternas = [
      {
        orden: 1,
        pregunta: 'Pregunta de prueba',
        opciones: { A: 'Opción 1', B: 'Opción 2', C: 'Opción 3', D: 'Opción 4' },
        opcionesArray: ['A. Opción 1', 'B. Opción 2', 'C. Opción 3', 'D. Opción 4'],
        respuesta_correcta: 'B',
        explicacion: 'Explicación de prueba',
        area: 'Matematicas',
        subtema: 'Test',
        estilo_kolb: 'Convergente',
      },
    ]

    // Act
    const paraJSONB = service.prepararParaJSONB(preguntasInternas as any)

    // Assert
    assert.isArray(paraJSONB)
    assert.equal(paraJSONB.length, 1)

    const p = paraJSONB[0]
    assert.equal(p.orden, 1)
    assert.equal(p.pregunta, 'Pregunta de prueba')
    assert.deepEqual(p.opciones, { A: 'Opción 1', B: 'Opción 2', C: 'Opción 3', D: 'Opción 4' })
    assert.equal(p.respuesta_correcta, 'B')
    assert.equal(p.explicacion, 'Explicación de prueba')
  })

  // ==================== VALIDACIÓN DE PARÁMETROS ====================

  test('Validación: debe rechazar cantidad inválida', async ({ assert }) => {
    // Arrange
    process.env.OPENAI_API_KEY = 'sk-test-key'
    const service = new IaPreguntasService()

    // Act & Assert: cantidad = 0
    await assert.rejects(
      async () => {
        await service.generarPreguntas({
          area: 'Matematicas',
          subtema: 'Test',
          estilo_kolb: 'Convergente',
          cantidad: 0,
        })
      },
      'Debe rechazar cantidad = 0'
    )

    // Act & Assert: cantidad negativa
    await assert.rejects(
      async () => {
        await service.generarPreguntas({
          area: 'Matematicas',
          subtema: 'Test',
          estilo_kolb: 'Convergente',
          cantidad: -1,
        })
      },
      'Debe rechazar cantidad negativa'
    )
  })

  test('Validación: debe aceptar todos los estilos Kolb', async ({ assert }) => {
    // Arrange
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      assert.pass('Test omitido - no hay API key real')
      return
    }

    process.env.OPENAI_API_KEY = apiKey
    const service = new IaPreguntasService()

    const estilos: Array<'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador'> = [
      'Divergente',
      'Asimilador',
      'Convergente',
      'Acomodador',
    ]

    // Act & Assert: Cada estilo debe funcionar
    for (const estilo of estilos) {
      const preguntas = await service.generarPreguntas({
        area: 'Matematicas',
        subtema: 'Operaciones con números enteros',
        estilo_kolb: estilo,
        cantidad: 1,
      })

      assert.isArray(preguntas, `Debe generar preguntas para estilo ${estilo}`)
      assert.equal(preguntas.length, 1, `Debe generar 1 pregunta para ${estilo}`)
      assert.equal(preguntas[0].estilo_kolb, estilo, `Debe guardar estilo ${estilo}`)
    }
  }).timeout(120000) // 2 minutos para 4 llamadas
})
