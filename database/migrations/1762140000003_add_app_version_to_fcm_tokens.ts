import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fcm_tokens'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.string('app_version', 50).nullable()
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('app_version')
    })
  }
}
