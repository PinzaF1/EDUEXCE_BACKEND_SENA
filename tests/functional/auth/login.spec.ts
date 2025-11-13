// tests/functional/auth/login.spec.ts
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import jwt from 'jsonwebtoken'
import { crearInstitucionPrueba, crearEstudiantePrueba, limpiarBaseDatos } from '../../helpers/factories.js'

test.group('Autenticación - Login', (group) => {
  // Setup: Limpiar BD antes de cada test
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  // Teardown: Limpiar después de todos los tests
  group.teardown(async () => {
    await limpiarBaseDatos()
  })

  // ==================== LOGIN ADMINISTRADOR ====================

  test('Admin: debe permitir login con credenciales válidas', async ({ client, assert }) => {
    // Arrange: Crear institución de prueba
    const institucion = await crearInstitucionPrueba({
      correo: 'admin@test.com',
    })

    // Act: Intentar login
    const response = await client.post('/admin/login').json({
      correo: 'admin@test.com',
      password: 'password123',
    })

    // Assert: Verificar respuesta exitosa
    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.token, 'Debe retornar un token')
    assert.isString(body.token)
    assert.exists(body.usuario)
    assert.exists(body.usuario.nombre_institucion || body.usuario.nombre)

    // Verificar que el token es válido
    const decoded = jwt.decode(body.token) as any

    assert.exists(decoded)
    assert.equal(decoded.rol, 'administrador')
    assert.equal(decoded.id_institucion, institucion.id_institucion)
  })

  test('Admin: debe rechazar credenciales inválidas', async ({ client }) => {
    // Arrange: Crear institución
    await crearInstitucionPrueba({
      correo: 'admin@test.com',
    })

    // Act: Login con password incorrecta
    const response = await client.post('/admin/login').json({
      correo: 'admin@test.com',
      password: 'password_incorrecta',
    })

    // Assert: Debe retornar 401 Unauthorized
    response.assertStatus(401)
    response.assertBodyContains({
      error: 'Credenciales inválidas',
    })
  })

  test('Admin: debe rechazar correo no registrado', async ({ client }) => {
    // Act: Login con correo que no existe
    const response = await client.post('/admin/login').json({
      correo: 'noexiste@test.com',
      password: 'password123',
    })

    // Assert: Debe retornar 401
    response.assertStatus(401)
    response.assertBodyContains({
      error: 'Credenciales inválidas',
    })
  })

  test('Admin: debe rechazar request sin password', async ({ client, assert }) => {
    // Act: Login sin password
    const response = await client.post('/admin/login').json({
      correo: 'admin@test.com',
    })

    // Assert: Debe retornar 400 Bad Request
    response.assertStatus(400)
    
    const body = response.body()
    assert.exists(body.error, 'Debe retornar un mensaje de error')
    assert.isString(body.error)
  })

  // ==================== LOGIN ESTUDIANTE ====================

  test('Estudiante: debe permitir login con documento válido', async ({ client, assert }) => {
    // Arrange: Crear institución y estudiante
    const institucion = await crearInstitucionPrueba()
    const estudiante = await crearEstudiantePrueba(institucion.id_institucion, {
      numero_documento: '1234567890',
    })

    // Act: Intentar login con documento
    const response = await client.post('/estudiante/login').json({
      numero_documento: '1234567890',
      password: 'password123',
    })

    // Assert: Verificar respuesta exitosa
    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.token, 'Debe retornar un token')
    assert.isString(body.token)
    assert.exists(body.usuario)
    assert.equal(body.usuario.nombre, 'Estudiante')
    assert.equal(body.usuario.apellido, 'De Prueba')

    // Verificar token
    const decoded = jwt.decode(body.token) as any

    assert.exists(decoded)
    assert.equal(decoded.rol, 'estudiante')
    assert.equal(decoded.id_usuario, estudiante.id_usuario)
  })

  test('Estudiante: debe rechazar credenciales inválidas', async ({ client }) => {
    // Arrange: Crear estudiante
    const institucion = await crearInstitucionPrueba()
    await crearEstudiantePrueba(institucion.id_institucion, {
      numero_documento: '1234567890',
    })

    // Act: Login con password incorrecta
    const response = await client.post('/estudiante/login').json({
      numero_documento: '1234567890',
      password: 'password_incorrecta',
    })

    // Assert: Debe retornar 401
    response.assertStatus(401)
    response.assertBodyContains({
      error: 'Credenciales inválidas',
    })
  })

  // ==================== VALIDACIÓN DE JWT ====================

  test('JWT: debe contener datos correctos del usuario', async ({ client, assert }) => {
    // Arrange: Crear institución
    const institucion = await crearInstitucionPrueba({
      correo: 'admin@test.com',
    })

    // Act: Login exitoso
    const response = await client.post('/admin/login').json({
      correo: 'admin@test.com',
      password: 'password123',
    })

    // Assert: Decodificar y verificar JWT
    const body = response.body()
    const decoded = jwt.decode(body.token) as any

    assert.exists(decoded)
    assert.equal(decoded.rol, 'administrador')
    assert.equal(decoded.id_institucion, institucion.id_institucion)
    assert.exists(decoded.iat) // issued at
    assert.exists(decoded.exp) // expiration
    
    // Verificar que no ha expirado
    const now = Math.floor(Date.now() / 1000)
    assert.isAbove(decoded.exp, now, 'Token no debe estar expirado')
  })
})

