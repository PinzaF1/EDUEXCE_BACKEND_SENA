import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications_sent'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('type', 50).notNullable()
      table.string('title', 255).nullable()
      table.text('body').nullable()
      table.jsonb('data').nullable()
      table.integer('to_user_id').unsigned().nullable()
      table.integer('institution_id').unsigned().nullable()
      table.integer('tokens_count').defaultTo(0)
      table.integer('success_count').defaultTo(0)
      table.integer('failure_count').defaultTo(0)
      table.jsonb('error_details').nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())

      table.index('to_user_id')
      table.index('institution_id')
      table.index('type')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
