import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Usuario from './usuario.js'
import BancoPregunta from './banco_pregunta.js'
import Notificacion from './notificacione.js'
import Reto from './reto.js'

export default class Institucion extends BaseModel {
  public static table = 'instituciones'

  @column({ isPrimary: true })
  declare id_institucion: number

  @column() declare nombre_institucion: string
  @column() declare codigo_dane: string
  @column() declare ciudad: string
  @column() declare departamento: string
  @column() declare direccion?: string
  @column() declare telefono?: string
  @column() declare jornada: string
  @column() declare correo: string
  @column() declare password: string
  @column() declare logo_url?: string
  @column() declare is_active: boolean

  @column.dateTime({ autoCreate: true }) declare created_at: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updated_at: DateTime

  @hasMany(() => Usuario, { foreignKey: 'id_institucion' })
  declare usuarios: HasMany<typeof Usuario>

  @hasMany(() => BancoPregunta, { foreignKey: 'id_institucion' })
  declare preguntas: HasMany<typeof BancoPregunta>

  @hasMany(() => Notificacion, { foreignKey: 'id_institucion' })
  declare notificaciones: HasMany<typeof Notificacion>

  @hasMany(() => Reto, { foreignKey: 'id_institucion' })
  declare retos: HasMany<typeof Reto>
}
