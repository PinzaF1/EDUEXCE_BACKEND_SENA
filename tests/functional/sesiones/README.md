# Tests de Integración - Generación de Preguntas con IA

## 📋 Descripción

Tests para validar la integración del SDK de OpenAI directo en la generación de preguntas para sesiones de práctica.

## 🧪 Tests Incluidos

### `crear_parada.spec.ts`
Tests de integración completos para `SesionesService.crearParada()`:

1. **SDK OpenAI Directo**
   - ✅ Generación con `USE_OPENAI_DIRECT=true`
   - ✅ Validación de formato de respuesta
   - ✅ Guardado en JSONB

2. **Fallback a Banco Local**
   - ✅ Cuando `USE_OPENAI_DIRECT=false`
   - ✅ Cuando no hay `OPENAI_API_KEY`
   - ✅ Cuando OpenAI falla

3. **Validaciones**
   - ✅ Estructura de preguntas
   - ✅ Formato de opciones (A. texto, B. texto, etc.)
   - ✅ Campo `id_pregunta=null` para preguntas de IA

4. **Estilos Kolb**
   - ✅ Divergente
   - ✅ Asimilador
   - ✅ Convergente
   - ✅ Acomodador

5. **Áreas**
   - ✅ Matemáticas
   - ✅ Lenguaje
   - ✅ Ciencias Naturales
   - ✅ Sociales
   - ✅ Inglés

### `servicios/ia_preguntas.spec.ts`
Tests unitarios para `IaPreguntasService`:

1. **Inicialización**
   - ✅ Detección de API key
   - ✅ Configuración por defecto
   - ✅ Configuración personalizada

2. **Generación de Preguntas**
   - ✅ Con API key real (si disponible)
   - ✅ Error sin API key
   - ✅ Validación de parámetros

3. **Transformaciones**
   - ✅ `prepararParaMovil()`
   - ✅ `prepararParaJSONB()`

4. **Validaciones**
   - ✅ Cantidad de preguntas
   - ✅ Estilos Kolb
   - ✅ Formato de respuestas

## 🚀 Ejecutar Tests

### Todos los tests
```bash
node ace test
```

### Solo tests de sesiones
```bash
node ace test tests/functional/sesiones
```

### Solo tests de IA
```bash
node ace test tests/functional/servicios/ia_preguntas.spec.ts
```

### Test específico
```bash
node ace test --files="tests/functional/sesiones/crear_parada.spec.ts" --tests="SDK OpenAI: debe generar preguntas cuando USE_OPENAI_DIRECT=true"
```

## ⚙️ Configuración

### Variables de Entorno para Tests

Los tests respetan las siguientes variables:

```env
# Requerido para tests que llaman a OpenAI real
OPENAI_API_KEY=sk-proj-tu-key-aqui

# Opcionales (usan defaults si no están)
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=20000
USE_OPENAI_DIRECT=true
```

### Tests con API Real vs Mocks

**Tests que usan API real:**
- `crear_parada.spec.ts` → Todos los tests con timeout largo
- `ia_preguntas.spec.ts` → Tests marcados como "REAL"

**Tests que usan fallback/mocks:**
- Todos los tests de fallback
- Tests sin API key configurada

### ⚠️ Importante

Los tests que llaman a OpenAI:
- Tienen timeouts largos (30-180 segundos)
- Consumen créditos de OpenAI
- Pueden fallar si hay problemas de red
- Se omiten automáticamente si no hay API key

## 📊 Cobertura

### Casos Cubiertos
✅ Feature flag activado/desactivado  
✅ Con/sin API key  
✅ Todas las áreas de conocimiento  
✅ Todos los estilos Kolb  
✅ Transformaciones de formato  
✅ Fallback automático  
✅ Validación de estructura  

### Casos NO Cubiertos
❌ Timeout de OpenAI (difícil de simular)  
❌ Rate limiting de OpenAI  
❌ Respuestas malformadas de OpenAI  
❌ Tests de carga/performance  

## 🐛 Debugging

### Ver logs detallados
```bash
LOG_LEVEL=debug node ace test
```

### Ver solo errores
```bash
node ace test 2>&1 | grep -E "(ERROR|FAIL)"
```

### Skip tests lentos
Edita el test y cambia:
```typescript
test('nombre', async () => { ... }).timeout(30000)
```
Por:
```typescript
test.skip('nombre', async () => { ... }).timeout(30000)
```

## 📝 Agregar Nuevos Tests

Template básico:

```typescript
test('Descripción: debe hacer algo', async ({ assert }) => {
  // Arrange: Configurar
  const originalFlag = process.env.USE_OPENAI_DIRECT
  process.env.USE_OPENAI_DIRECT = 'true'
  
  try {
    // Act: Ejecutar
    const resultado = await sesionesService.crearParada({ ... })

    // Assert: Verificar
    assert.exists(resultado.preguntas)
    assert.isAtLeast(resultado.preguntas.length, 1)
  } finally {
    // Cleanup: Restaurar
    if (originalFlag !== undefined) process.env.USE_OPENAI_DIRECT = originalFlag
    else delete process.env.USE_OPENAI_DIRECT
  }
}).timeout(30000)
```

## 🔍 CI/CD

Para ejecutar en CI sin gastar créditos de OpenAI:

```bash
# Opción 1: Sin API key (solo fallback)
unset OPENAI_API_KEY
node ace test

# Opción 2: Skip tests lentos
node ace test --files="tests/functional/sesiones/crear_parada.spec.ts" --tests="Fallback"
```

## 📚 Referencias

- [Japa Documentation](https://japa.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [AdonisJS Testing](https://docs.adonisjs.com/guides/testing)
