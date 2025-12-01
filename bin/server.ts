/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      // Activar logging temporal de queries de Lucid/Database
      try {
        const { default: Database } = await import('@ioc:Adonis/Lucid/Database')
        // Registrar todas las queries (temporal, quita esto cuando termines)
        Database.on('query', (query: any) => {
          try {
            // Evitar logear datos sensibles en producción prolongada; es temporal.
            console.log('[SQL-TRACE]', query.sql, 'bindings=', JSON.stringify(query.bindings || []))
          } catch (e) {
            console.log('[SQL-TRACE] error formateando query', e)
          }
        })
        console.log('✅ Query logging activado (temporal)')
      } catch (e) {
        console.warn('⚠️ No se pudo activar SQL tracing:', e)
      }
      await import('#start/env')
      // Inicializar Redis si está configurado
      const { initRedis } = await import('#services/redis_service')
      initRedis()
      
      // Inicializar Firebase Admin SDK
      try {
        const { default: FirebaseService } = await import('#services/firebase_service')
        FirebaseService.initialize()
      } catch (error) {
        console.warn('⚠️ Firebase Admin SDK no pudo inicializarse:', error)
      }
    })
    app.ready(async () => {
      // Inicializar sistema de notificaciones automáticas (cron)
      const { default: iniciarCronNotificaciones } = await import('#start/cron')
      iniciarCronNotificaciones()
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
