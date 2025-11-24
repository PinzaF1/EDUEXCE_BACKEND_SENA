import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FixCorruptMigration extends BaseCommand {
  static commandName = 'fix:corrupt:migration'
  static description = 'Elimina registros de migraciones corruptas de la base de datos'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔍 Verificando migraciones corruptas...')

    try {
      // Ver todas las migraciones
      const migrations = await db.from('adonis_schema').orderBy('batch', 'desc')
      
      this.logger.info('\n📋 Migraciones registradas:')
      migrations.forEach((m: any) => {
        const status = m.name.includes('es_detalles') ? '❌ CORRUPTA' : '✅'
        this.logger.info(`  ${status} ${m.name} (batch: ${m.batch})`)
      })

      // Buscar migración corrupta
      const corrupt = migrations.find((m: any) => m.name.includes('es_detalles'))
      
      if (corrupt) {
        this.logger.warning(`\n⚠️  Migración corrupta encontrada: ${corrupt.name}`)
        this.logger.info('🗑️  Eliminando registro corrupto de la base de datos...')
        
        await db.from('adonis_schema')
          .where('name', corrupt.name)
          .delete()
        
        this.logger.success('✅ Migración corrupta eliminada exitosamente')
      } else {
        this.logger.success('\n✅ No se encontraron migraciones corruptas')
      }

      // Verificar si el campo preguntas_generadas existe
      this.logger.info('\n🔍 Verificando campo preguntas_generadas en tabla sesiones...')
      
      const result = await db.rawQuery(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = 'sesiones' 
         AND column_name = 'preguntas_generadas'`
      )

      if (result.rows && result.rows.length > 0) {
        this.logger.success('✅ Campo preguntas_generadas existe:')
        this.logger.info(`   - Tipo: ${result.rows[0].data_type}`)
        this.logger.info(`   - Nullable: ${result.rows[0].is_nullable}`)
        this.logger.info('\n🎉 Todo listo para usar la integración con API de IA')
      } else {
        this.logger.warning('⚠️  Campo preguntas_generadas NO existe aún')
        this.logger.info('   Ejecuta: node ace migration:run')
      }

      this.logger.success('\n✅ Proceso completado')
    } catch (error) {
      this.logger.error('❌ Error al procesar:', error)
      this.exitCode = 1
    }
  }
}
