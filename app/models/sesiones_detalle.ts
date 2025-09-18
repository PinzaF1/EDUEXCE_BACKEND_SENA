// app/models/sesiones_detalle.ts
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Sesion from './sesione.js'
import BancoPregunta from './banco_pregunta.js'

export default class SesionDetalle extends BaseModel {
  public static table = 'sesiones_detalles' // igual a lo que muestra tu captura

  @column({ isPrimary: true, columnName: 'id_detalle' }) declare id_detalle: number
  @column({ columnName: 'id_sesion' }) declare id_sesion: number
  @column({ columnName: 'id_pregunta' }) declare id_pregunta?: number

  @column() declare orden: number
  @column() declare tiempo_asignado_seg?: number
  @column() declare alternativa_elegida?: string
  @column() declare es_correcta?: boolean
  @column() declare tiempo_empleado_seg?: number

  @column.dateTime() declare respondida_at: DateTime

  @belongsTo(() => Sesion, { foreignKey: 'id_sesion' }) declare sesion: BelongsTo<typeof Sesion>
  @belongsTo(() => BancoPregunta, { foreignKey: 'id_pregunta' }) declare pregunta: BelongsTo<typeof BancoPregunta>
}
