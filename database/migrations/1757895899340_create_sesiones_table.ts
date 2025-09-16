import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sesiones'

  async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_sesion').primary()

      table.bigInteger('id_usuario').unsigned()
        .references('usuarios.id_usuario').onDelete('CASCADE')

      table.string('tipo', 15).notNullable()                 // diagnostico | practica | simulacro | reto
      table.string('area', 30)                               // nullable si multiárea
      table.string('subtema', 120)                           // para niveles de isla
      table.integer('nivel_orden')                           // progreso

      table.string('modo', 15).notNullable().defaultTo('estandar') // estandar | adaptativo
      table.boolean('usa_estilo_kolb').notNullable().defaultTo(false)
      table.integer('preguntas_por_subtema')
      table.integer('tiempo_por_pregunta')

      table.timestamp('inicio_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('fin_at', { useTz: true })

      table.integer('total_preguntas').notNullable()
      table.integer('correctas').notNullable().defaultTo(0)
      table.decimal('puntaje_porcentaje', 5, 2)
      table.integer('duracion_segundos')
      table.string('resultado', 15)                          // aprobado | no_aprobado
      table.jsonb('detalle_resumen')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}