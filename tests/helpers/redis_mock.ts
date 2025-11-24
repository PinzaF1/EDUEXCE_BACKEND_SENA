// tests/helpers/redis_mock.ts
/**
 * Mock simple de Redis para testing
 * Simula setRecoveryCode, getRecoveryCode, deleteRecoveryCode
 */

const mockRedisStore = new Map<string, any>()

export function setupRedisMock() {
  // Mock de isRedisAvailable - siempre false para usar Map en memoria
  return {
    setRecoveryCode: async (correo: string, codigo: string, token: string, expireMinutes: number) => {
      const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000).toISOString()
      mockRedisStore.set(correo, { correo, codigo, token, expiresAt })
    },
    getRecoveryCode: async (correo: string) => {
      return mockRedisStore.get(correo) || null
    },
    deleteRecoveryCode: async (correo: string) => {
      mockRedisStore.delete(correo)
    },
    clear: () => {
      mockRedisStore.clear()
    },
    isRedisAvailable: () => false, // Fuerza a usar Map en memoria
  }
}

export function clearRedisMock() {
  mockRedisStore.clear()
}

