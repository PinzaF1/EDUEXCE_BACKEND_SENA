// database/migrations/xxxx_create_kolb_resultados_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'kolb_resultados'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_kolb_resultado').primary()

      table.bigInteger('id_usuario').unsigned()
        .references('usuarios.id_usuario').onDelete('CASCADE').notNullable()

      table.bigInteger('id_estilos_aprendizajes').unsigned()
        .references('estilos_aprendizajes.id_estilos_aprendizajes')
        .onDelete('RESTRICT').notNullable()

      //  debe existir y ser NOT NULL
      table.jsonb('respuestas_json').notNullable()

      table.timestamp('fecha_presentacion', { useTz: true }).notNullable()
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
