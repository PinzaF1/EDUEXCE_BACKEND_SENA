import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'progreso_nivel'

  async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_progreso').primary()

      table.bigInteger('id_usuario').unsigned()
        .references('usuarios.id_usuario').onDelete('CASCADE')

      table.string('area', 30).notNullable()
      table.string('subtema', 120).notNullable()
      table.integer('nivel_orden').notNullable() // 1..N

      table.integer('preguntas_por_intento').notNullable().defaultTo(5)
      table.integer('aciertos_minimos').notNullable().defaultTo(4)
      table.integer('max_intentos_antes_retroceso').notNullable().defaultTo(3)

      table.string('estado', 20).notNullable().defaultTo('pendiente') // pendiente|en_curso|superado
      table.integer('intentos').notNullable().defaultTo(0)
      table.integer('ultimo_resultado')
      table.timestamp('ultima_vez', { useTz: true })

      table.unique(['id_usuario', 'area', 'subtema', 'nivel_orden'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}