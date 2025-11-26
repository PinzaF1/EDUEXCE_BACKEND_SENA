import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, type BelongsTo } from '@adonisjs/lucid/orm'
import Usuario from './usuario.js'

export default class FcmToken extends BaseModel {
  public static table = 'fcm_tokens'

  @column({ isPrimary: true })
  declare id_token: number

  @column()
  declare id_usuario: number

  @column()
  declare fcm_token: string

  @column()
  declare device_id: string | null

  @column()
  declare id_institucion: number | null

  @column()
  declare platform: 'android' | 'ios'

  @column.dateTime()
  declare last_seen: DateTime | null
  
  @column()
  declare app_version: string | null

  @column()
  declare is_active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Usuario, {
    foreignKey: 'id_usuario',
  })
  declare usuario: BelongsTo<typeof Usuario>
}

