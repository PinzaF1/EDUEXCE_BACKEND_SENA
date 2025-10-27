// app/services/redis_service.ts
import Redis from 'ioredis'
import { DateTime } from 'luxon'

let redis: Redis | null = null

// Inicializar Redis si está configurado
export function initRedis() {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
    
    redis.on('connect', () => {
      console.log('[Redis] Conectado exitosamente')
    })
    
    redis.on('error', (err) => {
      console.error('[Redis] Error de conexión:', err.message)
    })
  }
}

export async function setRecoveryCode(correo: string, codigo: string, token: string, expiresInMinutes = 15) {
  const expiresAt = DateTime.now().plus({ minutes: expiresInMinutes })
  
  const data = {
    correo,
    codigo,
    token,
    expiresAt: expiresAt.toISO(),
  }
  
  if (redis) {
    // Guardar en Redis con TTL automático
    const key = `recovery:${correo}`
    await redis.set(key, JSON.stringify(data), 'EX', expiresInMinutes * 60)
    return true
  }
  
  // Fallback a Map si Redis no está disponible
  return false
}

export async function getRecoveryCode(correo: string): Promise<any> {
  if (redis) {
    const key = `recovery:${correo}`
    const data = await redis.get(key)
    if (data) {
      return JSON.parse(data)
    }
    return null
  }
  
  return null
}

export async function deleteRecoveryCode(correo: string) {
  if (redis) {
    const key = `recovery:${correo}`
    await redis.del(key)
    return true
  }
  
  return false
}

// Checker de conexión Redis
export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === 'ready'
}

