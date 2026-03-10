import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fcm_tokens'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      // Añadir columna de institución y last_seen
      table.integer('id_institucion').unsigned().nullable()
        .references('id_institucion').inTable('instituciones').onDelete('SET NULL')
      table.timestamp('last_seen', { useTz: true }).nullable()

      table.index('id_institucion')
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('id_institucion')
      table.dropColumn('last_seen')
    })
  }
}
