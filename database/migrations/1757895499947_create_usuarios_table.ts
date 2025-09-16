import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Usuarios extends BaseSchema {
  protected tableName = 'usuarios'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_usuario').primary()

      table.bigInteger('id_institucion').unsigned()
        .references('instituciones.id_institucion').onDelete('CASCADE')

      table.string('rol', 20).notNullable() // 'administrador' | 'estudiante'

      table.string('tipo_documento', 10).notNullable()
      table.string('numero_documento', 30).notNullable()
      table.string('nombre', 100).notNullable()
      table.string('apellido', 100).notNullable()
      table.string('correo', 120).notNullable()
      table.text('password_hash').notNullable() // bcrypt

      table.string('grado', 20)
      table.string('curso', 20)
      table.string('jornada', 30)
      table.string('telefono', 30)
      table.string('direccion', 150)
      table.text('foto_url')

      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_login_at', { useTz: true })
      table.timestamp('last_activity_at', { useTz: true })

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.unique(['id_institucion', 'tipo_documento', 'numero_documento'])
      table.unique(['id_institucion', 'correo'])
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
