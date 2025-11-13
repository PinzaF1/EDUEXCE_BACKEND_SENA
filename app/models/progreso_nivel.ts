import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Usuario from './usuario.js'

export default class ProgresoNivel extends BaseModel {
  public static table = 'progreso_nivel'

  @column({ isPrimary: true })
  declare id_progreso: number

  @column() declare id_usuario: number
  @column() declare area: 'Matematicas'|'Lenguaje'|'Ciencias'|'Sociales'|'Ingles'
  @column() declare subtema: string
  @column() declare nivel_orden: number

  @column() declare preguntas_por_intento: number
  @column() declare aciertos_minimos: number
  @column() declare max_intentos_antes_retroceso: number

  @column() declare estado: 'pendiente'|'en_curso'|'superado'|'finalizado'
  @column() declare intentos: number
  @column() declare vidas_actuales?: number // Vidas restantes (0-3)
  @column.dateTime() declare ultima_recarga?: DateTime // Timestamp de última recarga de vida
  @column.dateTime() declare ultima_lectura_detalle?: DateTime // Timestamp de última lectura de detalle (recarga mitad vida)
  @column() declare ultimo_resultado?: number
  @column.dateTime() declare ultima_vez?: DateTime
  @column() declare id_sesion?: number | null

  @belongsTo(() => Usuario, { foreignKey: 'id_usuario' })
  declare usuario: BelongsTo<typeof Usuario>
}
