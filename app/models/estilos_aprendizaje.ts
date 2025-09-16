import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Usuario from './usuario.js'

export default class EstilosAprendizaje extends BaseModel {
  public static table = 'estilos_aprendizajes'

  @column({ isPrimary: true })
  declare id_estilos_aprendizajes: number


  @column() declare estilo: string
  @column() declare descripcion?: string
  @column() declare caracteristicas?: string
  @column() declare recomendaciones?: string

  @column.dateTime() declare calculado_at: DateTime

  @belongsTo(() => Usuario, { foreignKey: 'id_usuario' })
  declare usuario: BelongsTo<typeof Usuario>
}
