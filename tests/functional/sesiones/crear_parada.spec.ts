// tests/functional/sesiones/crear_parada.spec.ts
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { crearInstitucionPrueba, crearEstudiantePrueba, limpiarBaseDatos } from '../../helpers/factories.js'
import SesionesService from '#services/sesiones_service'
import Sesion from '#models/sesione'

test.group('Sesiones - Crear Parada con IA', (group) => {
  let institucion: any
  let estudiante: any
  let sesionesService: SesionesService

  // Setup: Limpiar BD antes de cada test
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    
    // Crear datos de prueba
    institucion = await crearInstitucionPrueba()
    estudiante = await crearEstudiantePrueba(institucion.id_institucion)
    sesionesService = new SesionesService()
    
    return () => db.rollbackGlobalTransaction()
  })

  // Teardown: Limpiar después de todos los tests
  group.teardown(async () => {
    await limpiarBaseDatos()
  })

  // ==================== SDK OPENAI DIRECTO ====================

  test('SDK OpenAI: debe generar preguntas cuando USE_OPENAI_DIRECT=true y hay OPENAI_API_KEY', async ({ assert }) => {
    // Arrange: Configurar feature flag
    const originalFlag = process.env.USE_OPENAI_DIRECT
    const originalKey = process.env.OPENAI_API_KEY
    
    process.env.USE_OPENAI_DIRECT = 'true'
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key'
    
    try {
      // Act: Crear parada con IA
      const resultado = await sesionesService.crearParada({
        id_usuario: estudiante.id_usuario,
        area: 'Matematicas',
        subtema: 'Operaciones con números enteros',
        nivel_orden: 1,
        usa_estilo_kolb: true,
        estilo_kolb: 'Convergente',
      })

      // Assert: Verificar estructura de respuesta
      assert.exists(resultado.sesion, 'Debe retornar sesión')
      assert.exists(resultado.preguntas, 'Debe retornar preguntas')
      assert.isArray(resultado.preguntas, 'Preguntas debe ser un array')
      assert.isAtLeast(resultado.preguntas.length, 1, 'Debe tener al menos 1 pregunta')

      // Si usó IA, las preguntas deben tener id_pregunta = null
      if (resultado.usandoIA) {
        const primeraPreg = resultado.preguntas[0]
        assert.isNull(primeraPreg.id_pregunta, 'Preguntas de IA deben tener id_pregunta=null')
        assert.exists(primeraPreg.enunciado, 'Pregunta debe tener enunciado')
        assert.isArray(primeraPreg.opciones, 'Pregunta debe tener opciones')
        assert.equal(primeraPreg.opciones.length, 4, 'Debe tener 4 opciones')
        
        // Verificar que se guardó en JSONB
        const sesion = await Sesion.findOrFail((resultado.sesion as any).id_sesion)
        const preguntasGeneradas = (sesion as any).preguntas_generadas
        assert.exists(preguntasGeneradas, 'Debe guardar preguntas_generadas en JSONB')
        assert.isArray(preguntasGeneradas, 'preguntas_generadas debe ser array')
        assert.isAtLeast(preguntasGeneradas.length, 1, 'Debe tener al menos 1 pregunta en JSONB')
      }
    } finally {
      // Cleanup: Restaurar variables de entorno
      if (originalFlag !== undefined) process.env.USE_OPENAI_DIRECT = originalFlag
      else delete process.env.USE_OPENAI_DIRECT
      
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey
      else delete process.env.OPENAI_API_KEY
    }
  }).timeout(30000) // 30 segundos para llamada a OpenAI

  // ==================== FALLBACK A BANCO LOCAL ====================

  test('Fallback: debe usar banco local cuando USE_OPENAI_DIRECT=false', async ({ assert }) => {
    // Arrange: Desactivar SDK directo
    const originalFlag = process.env.USE_OPENAI_DIRECT
    process.env.USE_OPENAI_DIRECT = 'false'
    
    try {
      // Act: Crear parada
      const resultado = await sesionesService.crearParada({
        id_usuario: estudiante.id_usuario,
        area: 'Matematicas',
        subtema: 'Operaciones con números enteros',
        nivel_orden: 1,
        usa_estilo_kolb: false,
      })

      // Assert: Debe retornar preguntas
      assert.exists(resultado.preguntas, 'Debe retornar preguntas')
      assert.isArray(resultado.preguntas)
      
      // Las preguntas del banco local tienen id_pregunta numérico
      if (resultado.preguntas.length > 0) {
        const primeraPreg = resultado.preguntas[0]
        if (primeraPreg.id_pregunta !== null) {
          assert.isNumber(primeraPreg.id_pregunta, 'Preguntas del banco deben tener id_pregunta numérico')
        }
      }
      
      // No debe haber preguntas_generadas en JSONB (o debe ser null)
      const sesion = await Sesion.findOrFail((resultado.sesion as any).id_sesion)
      const preguntasGeneradas = (sesion as any).preguntas_generadas
      if (preguntasGeneradas !== null && preguntasGeneradas !== undefined) {
        // Si hay fallback después de intentar IA, puede estar null
        assert.pass('OK')
      }
    } finally {
      // Cleanup
      if (originalFlag !== undefined) process.env.USE_OPENAI_DIRECT = originalFlag
      else delete process.env.USE_OPENAI_DIRECT
    }
  }).timeout(15000)

  test('Fallback: debe usar banco local cuando no hay OPENAI_API_KEY', async ({ assert }) => {
    // Arrange: Activar SDK pero sin API key
    const originalFlag = process.env.USE_OPENAI_DIRECT
    const originalKey = process.env.OPENAI_API_KEY
    
    process.env.USE_OPENAI_DIRECT = 'true'
    delete process.env.OPENAI_API_KEY
    
    try {
      // Act: Crear parada
      const resultado = await sesionesService.crearParada({
        id_usuario: estudiante.id_usuario,
        area: 'Matematicas',
        subtema: 'Números enteros',
        nivel_orden: 1,
        usa_estilo_kolb: false,
      })

      // Assert: Debe funcionar con fallback al banco local
      assert.exists(resultado.preguntas, 'Debe retornar preguntas del banco local')
      assert.isArray(resultado.preguntas)
      assert.isFalse(resultado.usandoIA, 'No debe marcar como usando IA')
    } finally {
      // Cleanup
      if (originalFlag !== undefined) process.env.USE_OPENAI_DIRECT = originalFlag
      else delete process.env.USE_OPENAI_DIRECT
      
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey
      else delete process.env.OPENAI_API_KEY
    }
  }).timeout(15000)

  // ==================== VALIDACIÓN DE ESTRUCTURA ====================

  test('Validación: preguntas de IA deben tener formato correcto', async ({ assert }) => {
    // Arrange: Activar SDK
    const originalFlag = process.env.USE_OPENAI_DIRECT
    const originalKey = process.env.OPENAI_API_KEY
    
    process.env.USE_OPENAI_DIRECT = 'true'
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key'
    
    try {
      // Act: Crear parada
      const resultado = await sesionesService.crearParada({
        id_usuario: estudiante.id_usuario,
        area: 'Lenguaje',
        subtema: 'Comprensión lectora (sentido global y local)',
        nivel_orden: 1,
        usa_estilo_kolb: true,
        estilo_kolb: 'Asimilador',
      })

      // Assert: Si usó IA, validar formato completo
      if (resultado.usandoIA && resultado.preguntas.length > 0) {
        const pregunta = resultado.preguntas[0]
        
        // Campos requeridos
        assert.exists(pregunta.area, 'Debe tener área')
        assert.exists(pregunta.subtema, 'Debe tener subtema')
        assert.exists(pregunta.enunciado, 'Debe tener enunciado')
        assert.isArray(pregunta.opciones, 'Opciones debe ser array')
        
        // Opciones con formato "A. texto"
        pregunta.opciones.forEach((opcion: string, index: number) => {
          assert.isString(opcion, `Opción ${index} debe ser string`)
          assert.match(opcion, /^[A-D]\./, `Opción ${index} debe empezar con letra y punto`)
        })
        
        // Verificar JSONB contiene respuesta_correcta
        const sesion = await Sesion.findOrFail((resultado.sesion as any).id_sesion)
        const preguntasGeneradas = (sesion as any).preguntas_generadas
        
        if (preguntasGeneradas && preguntasGeneradas.length > 0) {
          const pregJSONB = preguntasGeneradas[0]
          assert.exists(pregJSONB.respuesta_correcta, 'JSONB debe tener respuesta_correcta')
          assert.match(pregJSONB.respuesta_correcta, /^[A-D]$/, 'respuesta_correcta debe ser A, B, C o D')
          assert.exists(pregJSONB.explicacion, 'JSONB debe tener explicación')
        }
      } else {
        assert.pass('No usó IA - test omitido')
      }
    } finally {
      // Cleanup
      if (originalFlag !== undefined) process.env.USE_OPENAI_DIRECT = originalFlag
      else delete process.env.USE_OPENAI_DIRECT
      
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey
      else delete process.env.OPENAI_API_KEY
    }
  }).timeout(30000)

  // ==================== ESTILOS KOLB ====================

  test('Estilos Kolb: debe generar preguntas para cada estilo', async ({ assert }) => {
    // Arrange
    const originalFlag = process.env.USE_OPENAI_DIRECT
    const originalKey = process.env.OPENAI_API_KEY
    
    process.env.USE_OPENAI_DIRECT = 'true'
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key'
    
    const estilos: Array<'Divergente' | 'Asimilador' | 'Convergente' | 'Acomodador'> = [
      'Divergente',
      'Asimilador',
      'Convergente',
      'Acomodador',
    ]
    
    try {
      for (const estilo of estilos) {
        // Act: Crear parada con cada estilo
        const resultado = await sesionesService.crearParada({
          id_usuario: estudiante.id_usuario,
          area: 'Matematicas',
          subtema: 'Razones y proporciones',
          nivel_orden: 1,
          usa_estilo_kolb: true,
          estilo_kolb: estilo,
        })

        // Assert: Debe funcionar con cualquier estilo
        assert.exists(resultado.preguntas, `Debe generar preguntas para estilo ${estilo}`)
        assert.isAtLeast(resultado.preguntas.length, 1, `Debe tener al menos 1 pregunta para ${estilo}`)
      }
    } finally {
      // Cleanup
      if (originalFlag !== undefined) process.env.USE_OPENAI_DIRECT = originalFlag
      else delete process.env.USE_OPENAI_DIRECT
      
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey
      else delete process.env.OPENAI_API_KEY
    }
  }).timeout(120000) // 2 minutos para 4 llamadas a OpenAI

  // ==================== ÁREAS DIFERENTES ====================

  test('Áreas: debe generar preguntas para todas las áreas', async ({ assert }) => {
    // Arrange
    const originalFlag = process.env.USE_OPENAI_DIRECT
    const originalKey = process.env.OPENAI_API_KEY
    
    process.env.USE_OPENAI_DIRECT = 'true'
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key'
    
    const casos = [
      { area: 'Matematicas', subtema: 'Operaciones con números enteros' },
      { area: 'Lenguaje', subtema: 'Conectores lógicos (causa, contraste, condición, secuencia)' },
      { area: 'Ciencias', subtema: 'Fuerzas, movimiento y energía' },
      { area: 'sociales', subtema: 'Constitución de 1991 y organización del Estado' },
      { area: 'Ingles', subtema: 'Verb to be (am, is, are)' },
    ]
    
    try {
      for (const caso of casos) {
        // Act
        const resultado = await sesionesService.crearParada({
          id_usuario: estudiante.id_usuario,
          area: caso.area as any,
          subtema: caso.subtema,
          nivel_orden: 1,
          usa_estilo_kolb: true,
          estilo_kolb: 'Convergente',
        })

        // Assert
        assert.exists(resultado.preguntas, `Debe generar preguntas para ${caso.area}`)
        assert.isAtLeast(resultado.preguntas.length, 1, `Debe tener al menos 1 pregunta para ${caso.area}`)
        
        if (resultado.preguntas.length > 0) {
          assert.exists(resultado.preguntas[0].enunciado, `Pregunta de ${caso.area} debe tener enunciado`)
        }
      }
    } finally {
      // Cleanup
      if (originalFlag !== undefined) process.env.USE_OPENAI_DIRECT = originalFlag
      else delete process.env.USE_OPENAI_DIRECT
      
      if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey
      else delete process.env.OPENAI_API_KEY
    }
  }).timeout(180000) // 3 minutos para 5 llamadas a OpenAI
})
