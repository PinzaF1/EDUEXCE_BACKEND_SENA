import { BaseModel, column, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Institucion from './institucione.js'
import Sesion from './sesione.js'
import ProgresoNivel from './progreso_nivel.js'
import EstilosAprendizaje from './estilos_aprendizaje.js'
import Notificacion from './notificacione.js'
import Reto from './reto.js'

export default class Usuario extends BaseModel {
  public static table = 'usuarios'

  @column({ isPrimary: true })
  declare id_usuario: number

  @column() declare id_institucion: number
  @column() declare rol: 'administrador' | 'estudiante'

  @column() declare tipo_documento: string
  @column() declare numero_documento: string
  @column() declare nombre: string
  @column() declare apellido: string
  @column() declare correo: string
  @column({ serializeAs: null }) declare password_hash: string

  @column() declare grado?: string
  @column() declare curso?: string
  @column() declare jornada?: string
  @column() declare telefono?: string
  @column() declare direccion?: string
  @column() declare foto_url?: string

  @column() declare is_active: boolean


  @column.dateTime() declare last_login_at?: DateTime
  @column.dateTime() declare last_activity_at?: DateTime

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => Institucion, { foreignKey: 'id_institucion' })
  declare institucion: BelongsTo<typeof Institucion>

  @hasMany(() => Sesion, { foreignKey: 'id_usuario' })
  declare sesiones: HasMany<typeof Sesion>

  @hasMany(() => ProgresoNivel, { foreignKey: 'id_usuario' })
  declare progresos: HasMany<typeof ProgresoNivel>

  @hasOne(() => EstilosAprendizaje, { foreignKey: 'id_usuario' })
  declare estiloKolb: HasOne<typeof EstilosAprendizaje>

  @hasMany(() => Notificacion, { foreignKey: 'id_usuario_destino' })
  declare notificacionesRecibidas: HasMany<typeof Notificacion>

  @hasMany(() => Reto, { foreignKey: 'creado_por' })
  declare retosCreados: HasMany<typeof Reto>
}
