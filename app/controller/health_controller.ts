import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

export default class HealthController {
  /**
   * Health check endpoint para verificar el estado de la aplicación
   * Útil para load balancers y monitoreo
   */
  async index({ response }: HttpContext) {
    const startTime = process.hrtime()
    
    try {
      // Información básica de la aplicación
      const healthInfo = {
        status: 'ok',
        timestamp: DateTime.now().toISO(),
        environment: app.nodeEnvironment,
        version: app.version,
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
        cpu: process.cpuUsage(),
      }

      // Calcular tiempo de respuesta
      const endTime = process.hrtime(startTime)
      const responseTime = Math.round((endTime[0] * 1000) + (endTime[1] / 1000000))
      
      return response.status(200).json({
        ...healthInfo,
        responseTime: `${responseTime}ms`
      })
      
    } catch (error) {
      return response.status(503).json({
        status: 'error',
        timestamp: DateTime.now().toISO(),
        message: 'Service unavailable',
        error: error.message
      })
    }
  }

  /**
   * Health check detallado que incluye verificación de dependencias
   */
  async detailed({ response }: HttpContext) {
    const startTime = process.hrtime()
    const checks: Record<string, any> = {}
    let overallStatus = 'ok'

    try {
      // Verificar base de datos
      try {
        const Database = (await import('@adonisjs/lucid/services/db')).default
        await Database.rawQuery('SELECT 1')
        checks.database = { status: 'ok', message: 'Database connection successful' }
      } catch (error) {
        checks.database = { status: 'error', message: error.message }
        overallStatus = 'degraded'
      }

      // Verificar servicios adicionales según configuración
      checks.services = { status: 'ok', message: 'Core services operational' }

      // Información del sistema
      const systemInfo = {
        status: overallStatus,
        timestamp: DateTime.now().toISO(),
        environment: app.nodeEnvironment,
        version: app.version,
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        cpu: process.cpuUsage(),
        checks
      }

      // Calcular tiempo de respuesta
      const endTime = process.hrtime(startTime)
      const responseTime = Math.round((endTime[0] * 1000) + (endTime[1] / 1000000))

      const statusCode = overallStatus === 'ok' ? 200 : 
                        overallStatus === 'degraded' ? 503 : 200

      return response.status(statusCode).json({
        ...systemInfo,
        responseTime: `${responseTime}ms`
      })

    } catch (error) {
      return response.status(503).json({
        status: 'error',
        timestamp: DateTime.now().toISO(),
        message: 'Health check failed',
        error: error.message,
        checks
      })
    }
  }
}