import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'retos'

  async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_reto').primary()

      table.bigInteger('id_institucion').unsigned()
        .references('instituciones.id_institucion').onDelete('CASCADE')

      table.string('tipo', 10).notNullable() // 1v1 | curso
      table.string('area', 30)               // opcional
      table.string('estado', 12).notNullable().defaultTo('pendiente') // pendiente|en_curso|finalizado

      table.jsonb('participantes_json').notNullable() // {retador:{id_usuario}, rival:{id_usuario}} | {curso:'11A', ids:[...]}
      table.jsonb('resultados_json')                  // puntajes, tiempos, ganador
      table.jsonb('reglas_json')                      // n_preguntas, tiempo, desempate

      table.bigInteger('creado_por').unsigned()
        .references('usuarios.id_usuario').onDelete('SET NULL').nullable()

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}