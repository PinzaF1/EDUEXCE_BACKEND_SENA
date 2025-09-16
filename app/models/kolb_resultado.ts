import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Usuario from './usuario.js'
import EstilosAprendizaje from './estilos_aprendizaje.js' 

export default class KolbResultado extends BaseModel {
    @column({ isPrimary: true })
  declare id_kolb_resultado: number

  @column()
  declare id_usuario: number

  @column()
  declare id_estilos_aprendizajes: number

  @column.dateTime()
  declare fecha_presentacion: DateTime

  // opcional: auditoría / análisis
  @column()
  declare respuestas_json: any

  @column()
  declare total_experiencia_concreta: number

  @column()
  declare total_observacion_reflexiva: number

  @column()
  declare total_conceptualizacion_abstracta: number

  @column()
  declare total_experimentacion_activa: number

  @belongsTo(() => Usuario, { foreignKey: 'id_usuario' })
  declare usuario: BelongsTo<typeof Usuario>

  @belongsTo(() => EstilosAprendizaje, { foreignKey: 'id_estilos_aprendizajes' })
  declare estilo: BelongsTo<typeof EstilosAprendizaje>
}