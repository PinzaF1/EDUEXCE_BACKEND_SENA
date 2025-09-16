import { BaseSchema } from '@adonisjs/lucid/schema'
export default class extends BaseSchema {
  protected tableName = 'banco_preguntas'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_pregunta').primary()

      table.string('area', 30).notNullable()         // Matematicas | Lenguaje | Ciencias | Sociales | Ingles
      table.string('subtema', 120).notNullable()
      table.string('dificultad', 12).notNullable()   // facil | media | dificil
      table.string('estilo_kolb', 40)                // opcional

      table.text('pregunta').notNullable()
      table.jsonb('opciones').notNullable()          // [{key:'A',text:'...'},{...}]
      table.string('respuesta_correcta', 10).notNullable()
      table.text('explicacion')
      table.integer('time_limit_seconds')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}