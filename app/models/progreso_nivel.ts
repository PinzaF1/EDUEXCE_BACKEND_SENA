import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
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

  @column() declare estado: 'pendiente'|'en_curso'|'superado'
  @column() declare intentos: number
  @column() declare ultimo_resultado?: number

  @belongsTo(() => Usuario, { foreignKey: 'id_usuario' })
  declare usuario: BelongsTo<typeof Usuario>
}
