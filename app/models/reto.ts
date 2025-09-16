import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Institucion from './institucione.js'
import Usuario from './usuario.js'

export default class Reto extends BaseModel {
  public static table = 'retos'

  @column({ isPrimary: true })
  declare id_reto: number

  @column() declare id_institucion: number
  @column() declare tipo: '1v1'|'curso'
  @column() declare area?: 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
  @column() declare estado: 'pendiente'|'en_curso'|'finalizado'
  @column() declare participantes_json: any
  @column() declare resultados_json?: any
  @column() declare reglas_json?: any
  @column() declare creado_por?: number

  @column.dateTime() declare createdAt: DateTime
  @column.dateTime() declare updatedAt: DateTime

  @belongsTo(() => Institucion, { foreignKey: 'id_institucion' })
  declare institucion: BelongsTo<typeof Institucion>

  @belongsTo(() => Usuario, { foreignKey: 'creado_por' })
  declare creador: BelongsTo<typeof Usuario>
}
