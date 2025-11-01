// app/services/notificaciones_realtime_service.ts
import { publishNotificacion } from './redis_service.js'
import Notificacion from '../models/notificacione.js'
import SeguimientoAdminService from './seguimiento_admin_service.js'
import Usuario from '../models/usuario.js'

const seguimientoService = new SeguimientoAdminService()

type TipoNotificacion = 
  | 'area_critica' 
  | 'estudiante_alerta' 
  | 'puntaje_bajo_inmediato'
  | 'inactividad'
  | 'puntaje_bajo'
  | 'progreso_lento'

export default class NotificacionesRealtimeService {
  
  /**
   * Detecta y notifica áreas críticas en tiempo real
   * Se ejecuta periódicamente para detectar áreas donde muchos estudiantes tienen dificultades
   */
  async detectarAreasCriticas(id_institucion: number) {
    try {
      const { areas } = await seguimientoService.areasQueNecesitanRefuerzo(
        id_institucion,
        60,  // umbral crítico: 60%
        30,  // umbral atención: 30%
        60,  // puntaje umbral
        5    // mínimo participantes
      )
      
      const criticas = areas.filter(a => a.estado === 'Crítico')
      
      for (const area of criticas) {
        // Verificar si ya existe notificación reciente (últimos 30 min)
        const existe = await this.existeNotificacionReciente(
          id_institucion,
          'area_critica',
          area.area,
          30
        )
        
        if (!existe) {
          await this.crearYPublicarNotificacion(id_institucion, {
            tipo: 'area_critica',
            titulo: `⚠️ Área Crítica: ${area.area}`,
            detalle: `${area.debajo_promedio} estudiantes con dificultad (${area.porcentaje_bajo}%). ${(area as any).nivel ? `Nivel ${(area as any).nivel}` : ''}${(area as any).subtema ? ` - ${(area as any).subtema}` : ''}`,
            payload: {
              area: area.area,
              estudiantes_afectados: area.debajo_promedio,
              porcentaje: area.porcentaje_bajo,
              nivel: (area as any).nivel,
              subtema: (area as any).subtema,
              estado: area.estado
            }
          })
          
          console.log(`[Notif RT] Área crítica detectada: ${area.area} en institución ${id_institucion}`)
        }
      }
      
      return criticas.length
    } catch (error) {
      console.error('[Notif RT] Error detectando áreas críticas:', error)
      return 0
    }
  }
  
  /**
   * Detecta estudiantes que necesitan atención urgente
   * Identifica estudiantes con rendimiento muy bajo que requieren intervención inmediata
   */
  async detectarEstudiantesAlerta(id_institucion: number) {
    try {
      const estudiantes = await seguimientoService.estudiantesQueRequierenAtencion(id_institucion, 10)
      let alertasCreadas = 0
      
      for (const est of estudiantes) {
        // Solo notificar estudiantes con puntaje crítico (<40%)
        if (est.puntaje < 40) {
          const existe = await this.existeNotificacionReciente(
            id_institucion,
            'estudiante_alerta',
            String(est.id_usuario),
            60 // No repetir en 1 hora
          )
          
          if (!existe) {
            await this.crearYPublicarNotificacion(id_institucion, {
              tipo: 'estudiante_alerta',
              titulo: `🚨 Estudiante necesita atención urgente`,
              detalle: `${est.nombre} - ${est.area_debil}: ${est.puntaje}%${est.curso ? ` (${est.curso})` : ''}`,
              payload: {
                id_usuario: est.id_usuario,
                nombre: est.nombre,
                curso: est.curso,
                area_debil: est.area_debil,
                puntaje: est.puntaje
              },
              id_usuario_destino: est.id_usuario
            })
            
            alertasCreadas++
            console.log(`[Notif RT] Alerta estudiante: ${est.nombre} (${est.puntaje}%)`)
          }
        }
      }
      
      return alertasCreadas
    } catch (error) {
      console.error('[Notif RT] Error detectando estudiantes alerta:', error)
      return 0
    }
  }
  
  /**
   * Notifica cuando un estudiante completa sesión con puntaje bajo
   * Se ejecuta inmediatamente después de cerrar una sesión
   */
  async notificarPuntajeBajoInmediato(
    id_usuario: number, 
    area: string, 
    puntaje: number, 
    id_institucion: number
  ) {
    try {
      if (puntaje < 40) {
        // Obtener datos del estudiante
        const estudiante = await Usuario.query()
          .where('id_usuario', id_usuario)
          .select(['nombre', 'apellido', 'curso', 'numero_documento'])
          .first()
        
        const nombreCompleto = estudiante 
          ? `${estudiante.nombre || ''} ${estudiante.apellido || ''}`.trim() || estudiante.numero_documento
          : `Estudiante ${id_usuario}`
        
        const cursoInfo = (estudiante as any)?.curso ? ` (${(estudiante as any).curso})` : ''
        
        await this.crearYPublicarNotificacion(id_institucion, {
          tipo: 'puntaje_bajo_inmediato',
          titulo: `📉 Puntaje bajo detectado`,
          detalle: `${nombreCompleto} obtuvo ${puntaje}% en ${area}${cursoInfo}`,
          payload: { 
            id_usuario, 
            area, 
            puntaje,
            nombre: nombreCompleto,
            curso: (estudiante as any)?.curso
          },
          id_usuario_destino: id_usuario
        })
        
        console.log(`[Notif RT] Puntaje bajo inmediato: ${nombreCompleto} - ${area}: ${puntaje}%`)
        return true
      }
      
      return false
    } catch (error) {
      console.error('[Notif RT] Error notificando puntaje bajo inmediato:', error)
      return false
    }
  }
  
  /**
   * Detecta inactividad de estudiantes y auto-inactiva si es necesario
   */
  async detectarInactividad(id_institucion: number) {
    try {
      const DIAS_INACTIVIDAD = 30
      const hoy = new Date()
      const fechaUmbral = new Date(hoy.getTime() - DIAS_INACTIVIDAD * 24 * 60 * 60 * 1000)
      
      const inactivos = await Usuario
        .query()
        .where('rol', 'estudiante')
        .where('id_institucion', id_institucion)
        .where('is_active', true) // Solo los que están activos
        .where((qb: any) => {
          qb.whereNull('last_login_at')
            .orWhere('last_login_at', '<', fechaUmbral as any)
            .orWhereNull('last_activity_at')
            .orWhere('last_activity_at', '<', fechaUmbral as any)
        })
        .select(['id_usuario', 'nombre', 'apellido', 'numero_documento', 'curso', 'last_login_at', 'last_activity_at'])
      
      for (const u of inactivos as any[]) {
        const existe = await this.existeNotificacionReciente(
          id_institucion,
          'inactividad',
          String(u.id_usuario),
          24 * 60 // No repetir en 24 horas
        )
        
        if (!existe) {
          const nombreCompleto = `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.numero_documento || `ID ${u.id_usuario}`
          const lastRef = u.last_activity_at ?? u.last_login_at ?? null
          const diasInactivo = lastRef 
            ? Math.floor((hoy.getTime() - new Date(lastRef).getTime()) / (1000 * 60 * 60 * 24))
            : DIAS_INACTIVIDAD
          
          await this.crearYPublicarNotificacion(id_institucion, {
            tipo: 'inactividad',
            titulo: `⏰ Estudiante inactivo por ${diasInactivo} días`,
            detalle: `${nombreCompleto}${u.curso ? ` (${u.curso})` : ''} - Última actividad: ${lastRef ? new Date(lastRef).toLocaleDateString() : 'Nunca'}`,
            payload: {
              id_usuario: u.id_usuario,
              nombre: nombreCompleto,
              curso: u.curso,
              dias_inactivo: diasInactivo,
              last_login_at: u.last_login_at,
              last_activity_at: u.last_activity_at
            },
            id_usuario_destino: u.id_usuario
          })
          
          console.log(`[Notif RT] Inactividad detectada: ${nombreCompleto} (${diasInactivo} días)`)
        }
      }
      
      return inactivos.length
    } catch (error) {
      console.error('[Notif RT] Error detectando inactividad:', error)
      return 0
    }
  }
  
  /**
   * Ejecuta todos los detectores automáticos (para uso en cron)
   */
  async ejecutarDeteccionCompleta(id_institucion: number) {
    console.log(`[Notif RT] Ejecutando detección completa para institución ${id_institucion}`)
    
    const resultados = {
      areas_criticas: await this.detectarAreasCriticas(id_institucion),
      estudiantes_alerta: await this.detectarEstudiantesAlerta(id_institucion),
      inactividad: await this.detectarInactividad(id_institucion)
    }
    
    console.log(`[Notif RT] Detección completa finalizada:`, resultados)
    return resultados
  }
  
  // ==================== HELPERS PRIVADOS ====================
  
  /**
   * Crea notificación en BD y la publica vía Redis Pub/Sub
   */
  private async crearYPublicarNotificacion(
    id_institucion: number, 
    data: {
      tipo: TipoNotificacion,
      titulo: string,
      detalle: string,
      payload: any,
      id_usuario_destino?: number
    }
  ) {
    try {
      // Crear en base de datos
      const noti = await Notificacion.create({
        id_institucion,
        id_usuario_destino: data.id_usuario_destino || null,
        tipo: data.tipo,
        payload: {
          titulo: data.titulo,
          detalle: data.detalle,
          ...data.payload
        },
        leida: false
      } as any)
      
      // Preparar payload para enviar por Redis
      const notificacionParaEnviar = {
        id: noti.id_notificacion,
        id_notificacion: noti.id_notificacion,
        id_institucion,
        id_usuario_destino: data.id_usuario_destino || null,
        tipo: data.tipo,
        titulo: data.titulo,
        detalle: data.detalle,
        payload: data.payload,
        leida: false,
        createdAt: noti.createdAt,
        created_at: noti.createdAt
      }
      
      // Publicar en Redis para que llegue a todos los admins conectados
      await publishNotificacion(id_institucion, notificacionParaEnviar)
      
      return notificacionParaEnviar
    } catch (error) {
      console.error('[Notif RT] Error creando y publicando notificación:', error)
      throw error
    }
  }
  
  /**
   * Verifica si ya existe una notificación reciente del mismo tipo
   * Evita spam de notificaciones duplicadas
   */
  private async existeNotificacionReciente(
    id_institucion: number,
    tipo: string,
    clave: string,
    minutosAtras: number
  ): Promise<boolean> {
    try {
      const desde = new Date(Date.now() - minutosAtras * 60 * 1000)
      
      const count = await Notificacion
        .query()
        .where('id_institucion', id_institucion)
        .where('tipo', tipo)
        .where('created_at', '>=', desde as any)
        .where((qb: any) => {
          // Buscar por área o por id_usuario
          qb.whereRaw(`payload->>'area' = ?`, [clave])
            .orWhereRaw(`payload->>'id_usuario' = ?`, [clave])
            .orWhere('id_usuario_destino', parseInt(clave) || null)
        })
        .count('* as total')
      
      return Number((count[0] as any)?.total || 0) > 0
    } catch (error) {
      console.error('[Notif RT] Error verificando notificación reciente:', error)
      return false // En caso de error, permitir crear la notificación
    }
  }
}

