import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Institucion from './institucione.js'
import Usuario from './usuario.js'

export default class Notificacion extends BaseModel {
  public static table = 'notificaciones'

  @column({ isPrimary: true })
  declare id_notificacion: number

  @column() declare id_institucion: number
  @column() declare id_usuario_destino: number
  @column() declare tipo: 'inactividad'|'puntaje_bajo'|'progreso_lento'
  @column() declare payload: any
  @column() declare leida: boolean

  @column.dateTime() declare createdAt: DateTime

  @belongsTo(() => Institucion, { foreignKey: 'id_institucion' })
  declare institucion: BelongsTo<typeof Institucion>

  @belongsTo(() => Usuario, { foreignKey: 'id_usuario_destino' })
  declare destinatario: BelongsTo<typeof Usuario>
}
