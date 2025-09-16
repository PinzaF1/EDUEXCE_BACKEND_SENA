import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notificaciones'

   async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_notificacion').primary()

      table.bigInteger('id_institucion').unsigned()
        .references('instituciones.id_institucion').onDelete('CASCADE')

      table.bigInteger('id_usuario_destino').unsigned()
        .references('usuarios.id_usuario').onDelete('CASCADE') // admin destinatario

      table.string('tipo', 20).notNullable() // inactividad | puntaje_bajo | progreso_lento
      table.jsonb('payload').notNullable()   // datos necesarios
      table.boolean('leida').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}