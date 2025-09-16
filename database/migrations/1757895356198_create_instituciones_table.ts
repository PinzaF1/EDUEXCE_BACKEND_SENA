import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Instituciones extends BaseSchema {
  protected tableName = 'instituciones'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_institucion').primary()
      table.string('nombre_institucion', 150).notNullable()
      table.string('codigo_dane', 20).notNullable()
      table.string('ciudad', 80).notNullable()
      table.string('departamento', 80).notNullable()
      table.string('direccion', 150)
      table.string('telefono', 30)
      table.string('jornada', 30).notNullable()
      table.string('correo', 120).notNullable().unique()
      table.text('password').notNullable()
      table.text('logo_url')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
