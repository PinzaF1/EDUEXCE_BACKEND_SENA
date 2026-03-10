import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sesiones'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Campo JSONB para guardar el detalle de respuestas evaluadas al cerrar sesión
      // Estructura: [{ id_pregunta, orden, correcta, marcada, es_correcta }]
      table.jsonb('detalle_resumen').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('detalle_resumen')
    })
  }
}
