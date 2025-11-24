import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sesiones'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Campo JSONB para guardar preguntas generadas por IA
      // Estructura: [{ orden, pregunta, opciones, respuesta_correcta, explicacion, area, subtema, estilo_kolb }]
      table.jsonb('preguntas_generadas').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('preguntas_generadas')
    })
  }
}
