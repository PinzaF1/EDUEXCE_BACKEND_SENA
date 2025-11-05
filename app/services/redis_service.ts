// app/services/redis_service.ts
import Redis from 'ioredis'
import { DateTime } from 'luxon'

let redis: InstanceType<typeof Redis> | null = null

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
    
    redis.on('error', (err: Error) => {
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

// ==================== PUB/SUB PARA NOTIFICACIONES EN TIEMPO REAL ====================

/**
 * Publica una notificación en el canal de Redis para que todos los admins conectados la reciban
 */
export async function publishNotificacion(id_institucion: number, notificacion: any) {
  if (!redis || !isRedisAvailable()) return false
  
  try {
    const channel = `notificaciones:admin:${id_institucion}`
    await redis.publish(channel, JSON.stringify(notificacion))
    console.log(`[Redis Pub/Sub] Notificación publicada en ${channel}`)
    return true
  } catch (error) {
    console.error('[Redis Pub/Sub] Error publicando:', error)
    return false
  }
}

/**
 * Suscribe un callback al canal de notificaciones de una institución
 * Retorna el subscriber para poder cerrarlo después
 */
export function subscribeNotificaciones(id_institucion: number, callback: (data: any) => void) {
  if (!redis || !isRedisAvailable()) {
    console.warn('[Redis Pub/Sub] Redis no disponible para suscripción')
    return null
  }
  
  try {
    const subscriber = redis.duplicate()
    const channel = `notificaciones:admin:${id_institucion}`
    
    subscriber.subscribe(channel, (err: Error | null) => {
      if (err) {
        console.error('[Redis Pub/Sub] Error suscribiendo:', err)
      } else {
        console.log(`[Redis Pub/Sub] Suscrito exitosamente a ${channel}`)
      }
    })
    
    subscriber.on('message', (ch: string, message: string) => {
      if (ch === channel) {
        try {
          const data = JSON.parse(message)
          callback(data)
        } catch (e) {
          console.error('[Redis Pub/Sub] Error parseando mensaje:', e)
        }
      }
    })
    
    subscriber.on('error', (err: Error) => {
      console.error('[Redis Pub/Sub] Error en subscriber:', err)
    })
    
    return subscriber
  } catch (error) {
    console.error('[Redis Pub/Sub] Error creando subscriber:', error)
    return null
  }
}

/**
 * Obtener instancia de Redis (para uso interno de servicios)
 */
export function getRedis() {
  return redis
}

