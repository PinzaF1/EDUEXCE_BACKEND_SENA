import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sesiones_detalles'
  public static table = 'public.sesiones_detalles'

  async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_detalle').primary()

      table.bigInteger('id_sesion').unsigned()
        .references('sesiones.id_sesion').onDelete('CASCADE')

      table.bigInteger('id_pregunta').unsigned()
        .references('banco_preguntas.id_pregunta').onDelete('SET NULL').nullable()

      table.integer('orden').notNullable()
      table.integer('tiempo_asignado_seg')
      table.string('alternativa_elegida', 10)
      table.boolean('es_correcta')
      table.integer('tiempo_empleado_seg')
      table.timestamp('respondida_at', { useTz: true }).defaultTo(this.now())

      table.unique(['id_sesion', 'orden'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}