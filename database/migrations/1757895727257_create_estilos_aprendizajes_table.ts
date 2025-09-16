// database/migrations/1757895727257_create_estilos_aprendizajes_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateEstilosAprendizajesTable extends BaseSchema {
  protected tableName = 'estilos_aprendizajes'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_estilos_aprendizajes').primary()
      table.text('estilo').notNullable()
      table.text('descripcion').nullable()
      table.text('caracteristicas').nullable()
      table.text('recomendaciones').nullable()
      // sin timestamps: catálogo estático
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
