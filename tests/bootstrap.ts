import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [assert(), apiClient(), pluginAdonisJS(app)]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    async () => {
      console.log('🔧 Configurando base de datos de test (SQLite)...')
      await app.init()
      
      // Obtener conexión de base de datos
      const db = await app.container.make('lucid.db')
      
      // Para SQLite: habilitar foreign keys
      if (process.env.DB_CONNECTION === 'sqlite') {
        await db.connection().schema.raw('PRAGMA foreign_keys = ON')
        console.log('✅ SQLite configurado con foreign_keys = ON')
      }
      
      console.log('✅ Base de datos de test lista')
    },
  ],
  teardown: [
    async () => {
      console.log('🧹 Limpiando conexiones de base de datos...')
      const db = await app.container.make('lucid.db')
      await db.manager.closeAll()
      console.log('✅ Conexiones cerradas')
    },
  ],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
  
  // Configuración específica para pruebas unitarias y funcionales
  if (['unit', 'functional'].includes(suite.name)) {
    suite.setup(async () => {
      console.log(`🔧 Configurando suite: ${suite.name}`)
      
      // Ejecutar migraciones solo en pruebas funcionales que necesiten BD
      if (suite.name === 'functional' && process.env.DB_CONNECTION === 'sqlite') {
        try {
          const { default: migrator } = await import('@adonisjs/lucid/services/migrator')
          await migrator.run()
          console.log('✅ Migraciones ejecutadas para pruebas funcionales')
        } catch (error) {
          console.log('ℹ️  Migraciones no ejecutadas (BD no requerida):', error.message)
        }
      }
    })

    suite.teardown(async () => {
      console.log(`🧹 Limpieza de suite: ${suite.name}`)
      
      // Limpiar datos de prueba si es necesario
      if (suite.name === 'functional' && process.env.DB_CONNECTION === 'sqlite') {
        try {
          const db = await app.container.make('lucid.db')
          // Limpiar todas las tablas excepto migraciones
          const tables = await db.connection().schema.raw(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'adonis_schema%'
          `)
          
          for (const table of tables) {
            await db.connection().schema.raw(`DELETE FROM ${table.name}`)
          }
          console.log('✅ Datos de prueba limpiados')
        } catch (error) {
          console.log('ℹ️  Limpieza de datos no necesaria:', error.message)
        }
      }
    })
  }
}
