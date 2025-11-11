import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FixPendingMigration extends BaseCommand {
  static commandName = 'fix:pending:migration'
  static description = 'Registra la migración pendiente de sesiones_detalles como completada'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔍 Verificando migración pendiente...')

    try {
      // Verificar si la tabla existe
      const tableExists = await db.rawQuery(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'sesiones_detalles'
        )`
      )

      if (tableExists.rows[0].exists) {
        this.logger.success('✅ La tabla sesiones_detalles existe en la base de datos')
        
        // Verificar si ya está registrada
        const registered = await db.from('adonis_schema')
          .where('name', 'database/migrations/1757895937917_create_sesiones_detalles_table')
          .first()

        if (registered) {
          this.logger.info('ℹ️  La migración ya está registrada')
        } else {
          this.logger.info('📝 Registrando migración como completada...')
          
          await db.table('adonis_schema').insert({
            name: 'database/migrations/1757895937917_create_sesiones_detalles_table',
            batch: 2
          })
          
          this.logger.success('✅ Migración registrada exitosamente en batch 2')
        }
      } else {
        this.logger.error('❌ La tabla sesiones_detalles NO existe')
        this.logger.info('   Ejecuta: node ace migration:run')
        this.exitCode = 1
        return
      }

      // Mostrar estado final
      this.logger.info('\n📊 Estado final de migraciones:')
      const status = await db.from('adonis_schema')
        .orderBy('batch', 'asc')
        .orderBy('name', 'asc')

      status.forEach((m: any) => {
        this.logger.info(`  ✅ ${m.name} (batch: ${m.batch})`)
      })

      this.logger.success('\n🎉 Proceso completado')
      this.logger.info('Ejecuta: node ace migration:status para verificar')
      
    } catch (error) {
      this.logger.error('❌ Error al procesar:', error)
      this.exitCode = 1
    }
  }
}
