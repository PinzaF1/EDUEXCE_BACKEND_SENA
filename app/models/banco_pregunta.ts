import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Institucion from './institucione.js'
import Usuario from './usuario.js'
import SesionDetalle from './sesiones_detalle.js'

export default class BancoPregunta extends BaseModel {
  public static table = 'banco_preguntas'

  @column({ isPrimary: true, columnName: 'id_pregunta' })
  declare id_pregunta: number

  @column()
  declare area: string

  @column()
  declare subtema: string

  @column()
  declare dificultad: string

  @column({ columnName: 'estilo_kolb' })
  declare estilo_kolb?: string

  @column()
  declare pregunta: string

  @column()
  declare opciones: any

  @column({ columnName: 'respuesta_correcta' })
  declare respuesta_correcta: string

  @column()
  declare explicacion?: string


  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime
  @belongsTo(() => Institucion, { foreignKey: 'id_institucion' })
  declare institucion: BelongsTo<typeof Institucion>
  @belongsTo(() => Usuario, { foreignKey: 'created_by' })
  declare creador: BelongsTo<typeof Usuario>
  @hasMany(() => SesionDetalle, { foreignKey: 'id_pregunta' })
  declare usosEnSesiones: HasMany<typeof SesionDetalle>
}
