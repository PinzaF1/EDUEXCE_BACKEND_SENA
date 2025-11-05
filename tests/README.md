# 🧪 Tests del Backend EDUEXCE

## 📁 Estructura de Carpetas

```
tests/
├── unit/                      # Tests unitarios (funciones puras)
│   └── (por implementar)
│
├── functional/                # Tests de integración (API endpoints)
│   └── auth/
│       └── login.spec.ts     # ✅ Tests de autenticación
│
└── helpers/                   # Utilidades para testing
    ├── factories.ts          # Factories de datos de prueba
    └── redis_mock.ts         # Mock de Redis
```

---

## 🚀 Ejecutar Tests

### **Ejecutar TODOS los tests:**
```bash
npm run test
```

### **Ejecutar solo tests funcionales (integración):**
```bash
npm run test -- --files tests/functional/**/*.spec.ts
```

### **Ejecutar solo tests de autenticación:**
```bash
npm run test -- --files tests/functional/auth/login.spec.ts
```

### **Ejecutar con watch mode (recarga automática):**
```bash
npm run test -- --watch
```

### **Ver cobertura:**
```bash
npm run test -- --coverage
```

---

## 📊 Tests Implementados

### **✅ Autenticación (7 tests)**

| Test | Descripción | Estado |
|------|-------------|--------|
| Admin: Login exitoso | Credenciales válidas retornan token | ✅ |
| Admin: Login fallido | Credenciales inválidas retornan 401 | ✅ |
| Admin: Correo no registrado | Retorna 401 | ✅ |
| Admin: Sin password | Retorna 400 | ✅ |
| Estudiante: Login exitoso | Documento válido retorna token | ✅ |
| Estudiante: Login fallido | Credenciales inválidas retornan 401 | ✅ |
| JWT: Validación | Token contiene datos correctos | ✅ |

---

## 🛠️ Configuración

### **Base de Datos de Prueba:**

Los tests usan **transacciones** para no afectar tu base de datos:
- Cada test inicia una transacción
- Al finalizar, hace rollback automáticamente
- No persiste datos en la BD real

### **Variables de Entorno:**

Los tests usan las mismas variables de tu `.env` local.

Si quieres usar una BD separada para tests, crea `.env.test`:

```env
# .env.test (opcional)
DB_DATABASE=eduexce_test
NODE_ENV=test
```

---

## 📝 Escribir Nuevos Tests

### **Ejemplo de test de integración:**

```typescript
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { crearInstitucionPrueba } from '../../helpers/factories.js'

test.group('Mi Feature', (group) => {
  // Setup: Transacción por test
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  test('debe hacer algo', async ({ client, assert }) => {
    // Arrange: Preparar datos
    const institucion = await crearInstitucionPrueba()

    // Act: Ejecutar acción
    const response = await client.post('/mi-endpoint').json({ data: 'test' })

    // Assert: Verificar resultado
    response.assertStatus(200)
    assert.equal(response.body().success, true)
  })
})
```

---

## 🎯 Próximos Tests a Implementar

### **Alta Prioridad:**
- [ ] Recuperación de contraseña (admin)
- [ ] Recuperación de contraseña (estudiante)
- [ ] CORS headers

### **Media Prioridad:**
- [ ] Notificaciones paginadas
- [ ] CRUD de estudiantes
- [ ] Sistema de retos 1vs1

---

## 🔍 Debugging Tests

### **Ver logs detallados:**
```bash
npm run test -- --verbose
```

### **Ejecutar un solo test:**
```typescript
test.only('mi test específico', async ({ client }) => {
  // ...
})
```

### **Ignorar un test temporalmente:**
```typescript
test.skip('test temporal deshabilitado', async ({ client }) => {
  // ...
})
```

---

## 📚 Recursos

- [Japa Documentation](https://japa.dev/)
- [AdonisJS Testing](https://docs.adonisjs.com/guides/testing/introduction)
- [API Client Plugin](https://japa.dev/docs/plugins/api-client)

---

## ✅ Checklist antes de Commit

- [ ] Todos los tests pasan: `npm run test`
- [ ] No hay errores de linting: `npm run lint`
- [ ] Los tests son independientes (no dependen del orden)
- [ ] Los tests limpian sus datos (transacciones)
- [ ] Los tests tienen nombres descriptivos

---

**Última actualización:** 2025-01-05  
**Tests totales:** 7 (autenticación)  
**Cobertura:** ~15% (funcionalidad crítica)

