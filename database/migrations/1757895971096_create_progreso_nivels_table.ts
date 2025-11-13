import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'progreso_nivel'

  async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id_progreso').primary()

      table.bigInteger('id_usuario').unsigned()
        .references('usuarios.id_usuario').onDelete('CASCADE')

      table.string('area', 30).notNullable()
      table.string('subtema', 120).notNullable()
      table.integer('nivel_orden').notNullable() // 1..N (1-5 para niveles, 8 para diagnóstico)

      table.integer('preguntas_por_intento').notNullable().defaultTo(5)
      table.integer('aciertos_minimos').notNullable().defaultTo(4)
      table.integer('max_intentos_antes_retroceso').notNullable().defaultTo(3)

      table.string('estado', 20).notNullable().defaultTo('pendiente') // pendiente|en_curso|superado
      table.integer('intentos').notNullable().defaultTo(0) // Intentos realizados (0-3, donde 3 = 0 vidas)
      
      // Sistema de vidas: vidas_actuales = max_intentos_antes_retroceso - intentos
      // Se recargan automáticamente cada 5 minutos o al leer el detalle (mitad de vida)
      table.integer('vidas_actuales').notNullable().defaultTo(3) // Vidas restantes (0-3)
      table.timestamp('ultima_recarga', { useTz: true }).nullable() // Timestamp de última recarga de vida
      table.timestamp('ultima_lectura_detalle', { useTz: true }).nullable() // Timestamp de última lectura de detalle (recarga mitad vida)
      
      table.integer('ultimo_resultado').nullable() // Último resultado obtenido
      table.timestamp('ultima_vez', { useTz: true }).nullable() // Última vez que se actualizó
      
      table.bigInteger('id_sesion').unsigned()
        .references('sesiones.id_sesion').onDelete('SET NULL').nullable()

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      // NO crear constraint único - permite múltiples registros del mismo nivel (historial completo)
      // Cada vez que se completa un nivel, se crea un nuevo registro
      // Crear índice NO único para mejorar búsquedas (permite duplicados)
      table.index(['id_usuario', 'area', 'nivel_orden'], 'progreso_nivel_idx_usuario_area_nivel')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}