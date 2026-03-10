import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notificaciones'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('eliminada').notNullable().defaultTo(false)
      table.timestamp('eliminada_en', { useTz: true }).nullable()
      table.bigInteger('eliminada_por').unsigned().nullable()
        .references('usuarios.id_usuario').onDelete('SET NULL')
      
      // Índice para mejorar performance en consultas
      table.index(['eliminada'], 'idx_notificaciones_eliminada')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['eliminada'], 'idx_notificaciones_eliminada')
      table.dropColumn('eliminada')
      table.dropColumn('eliminada_en')
      table.dropColumn('eliminada_por')
    })
  }
}
