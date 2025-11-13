import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fcm_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_token').primary()
      
      table.integer('id_usuario').unsigned().notNullable()
        .references('id_usuario').inTable('usuarios').onDelete('CASCADE')
      
      table.string('fcm_token', 255).notNullable().unique()
      table.string('device_id', 100).nullable()
      table.enum('platform', ['android', 'ios']).defaultTo('android')
      table.boolean('is_active').defaultTo(true)
      
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Índices para optimizar consultas
      table.index('id_usuario')
      table.index('fcm_token')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}