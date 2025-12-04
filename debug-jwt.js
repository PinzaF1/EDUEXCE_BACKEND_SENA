#!/usr/bin/env node

// Script para decodificar y analizar el JWT que está fallando
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2wiOiJhZG1pbmlzdHJhZG9yIiwiaWRfaW5zdGl0dWNpb24iOiI0IiwiaWF0IjoxNzY0NzM4Mzk5LCJleHAiOjE3NjQ4MjQ3OTl9.nGF3ZfqIVrKpSxiT5afv_mU69av-LIpE_71yhQqV10Q'

try {
  // Decodificar payload
  const payload64 = jwt.split('.')[1]
  const payloadString = Buffer.from(payload64, 'base64').toString()
  const payload = JSON.parse(payloadString)
  
  console.log('=== ANÁLISIS DEL JWT ===')
  console.log('Payload decodificado:', JSON.stringify(payload, null, 2))
  
  console.log('\n=== DIAGNÓSTICO ===')
  console.log('- rol:', payload.rol) // debe ser 'administrador'
  console.log('- id_institucion:', payload.id_institucion) // debe ser "4"
  
  // Verificar si tiene algún campo de id de usuario
  const possibleIds = ['id_usuario', 'id', 'sub', 'userId', 'user_id']
  let foundId = null
  possibleIds.forEach(field => {
    if (payload[field] !== undefined) {
      console.log(`- ${field}:`, payload[field])
      if (!foundId && payload[field]) foundId = field
    }
  })
  
  console.log('\n=== PROBLEMA IDENTIFICADO ===')
  if (!foundId) {
    console.log('❌ El JWT NO contiene ningún campo de id de usuario')
    console.log('   Campos esperados: id_usuario, id, sub, userId, user_id')
    console.log('   Solución: El backend ahora permite null pero necesitamos generar JWT con id de usuario')
  } else {
    console.log('✅ JWT tiene campo de id:', foundId, '=', payload[foundId])
  }
  
  // Verificar expiración
  if (payload.exp) {
    const expDate = new Date(payload.exp * 1000)
    const now = new Date()
    console.log('\n=== EXPIRACIÓN ===')
    console.log('- Expira:', expDate.toISOString())
    console.log('- Ahora:', now.toISOString())
    console.log('- Estado:', expDate > now ? '✅ Válido' : '❌ EXPIRADO')
  }
  
} catch (error) {
  console.error('Error decodificando JWT:', error.message)
}