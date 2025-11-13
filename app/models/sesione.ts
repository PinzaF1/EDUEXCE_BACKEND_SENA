import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Usuario from './usuario.js'
import SesionDetalle from './sesiones_detalle.js'

export default class Sesion extends BaseModel {
  public static table = 'sesiones'

  @column({ isPrimary: true })
  declare id_sesion: number

  @column() declare id_usuario: number
  @column() declare tipo: 'diagnostico'|'practica'|'simulacro'|'reto'
  @column() declare area?: 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
  @column() declare subtema?: string
  @column() declare nivel_orden?: number

  @column() declare modo: 'estandar'|'adaptativo'
  @column() declare usa_estilo_kolb: boolean
  @column() declare preguntas_por_subtema?: number
  @column() declare tiempo_por_pregunta?: number

  @column.dateTime() declare inicio_at: DateTime
  @column.dateTime() declare fin_at?: DateTime

  @column() declare total_preguntas: number
  @column() declare correctas: number
  @column() declare puntaje_porcentaje?: number
  @column() declare duracion_segundos?: number
  @column() declare resultado?: 'aprobado'|'no_aprobado'
  @column() declare detalle_resumen?: any
  @column() declare preguntas_generadas?: any  // JSONB: Preguntas generadas por IA

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => Usuario, { foreignKey: 'id_usuario' })
  declare usuario: BelongsTo<typeof Usuario>

  @hasMany(() => SesionDetalle, { foreignKey: 'id_sesion' })
  declare detalles: HasMany<typeof SesionDetalle>
}
