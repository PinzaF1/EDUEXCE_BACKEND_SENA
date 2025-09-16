import { BaseSchema } from '@adonisjs/lucid/schema'

export default class PreguntaEstiloAprendizajes extends BaseSchema {
  protected tableName = 'pregunta_estilo_aprendizajes'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_pregunta_estilo_aprendizajes').primary()

      table.enum('tipo_pregunta', ['EXPERIENCIA CONCRETA', 'OBSERVACIÓN REFLEXIVA', 'CONCEPTUALIZACIÓN ABSTRACTA', 'EXPERIMENTACIÓN ACTIVA'], {
        useNative: true,
        enumName: 'tipo_pregunta_enum',
      }).notNullable()
      
      table.string('titulo').notNullable()
      table.text('pregunta').nullable()

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
