import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class NotificationSent extends BaseModel {
  public static table = 'notifications_sent'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare type: string

  @column()
  declare title: string | null

  @column()
  declare body: string | null

  @column()
  declare data: any | null

  @column()
  declare to_user_id: number | null

  @column()
  declare institution_id: number | null

  @column()
  declare tokens_count: number

  @column()
  declare success_count: number

  @column()
  declare failure_count: number

  @column()
  declare error_details: any | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
