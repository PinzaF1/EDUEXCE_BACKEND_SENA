import FirebaseService from './firebase_service.js'
import FcmToken from '#models/fcm_token'
import NotificationSent from '#models/notification_sent'
import { DateTime } from 'luxon'

function chunkArray<T>(arr: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default class FcmService {
  /**
   * Registra o actualiza el token FCM de un usuario
   */
  public async registrarToken(
    id_usuario: number,
    fcm_token: string,
    device_id: string | null = null,
    platform: 'android' | 'ios' = 'android',
    id_institucion: number | null = null,
    app_version: string | null = null
  ) {
    try {
      // Buscar si ya existe el token
      const tokenExistente = await FcmToken.query()
        .where('id_usuario', id_usuario)
        .where('platform', platform)
        .where('device_id', device_id || '')
        .first()

      if (tokenExistente) {
        // Actualizar token existente
        tokenExistente.fcm_token = fcm_token
        tokenExistente.device_id = device_id
        tokenExistente.is_active = true
        tokenExistente.id_institucion = id_institucion || null
        // actualizar last_seen y app_version si existen
        try { (tokenExistente as any).last_seen = DateTime.local() } catch {}
        if ((tokenExistente as any).app_version !== undefined) (tokenExistente as any).app_version = app_version
        await tokenExistente.save()
        console.log(`✅ Token FCM actualizado para usuario ${id_usuario}`)
        return tokenExistente
      }

      // Crear nuevo token
      const nuevoToken = await FcmToken.create({
        id_usuario,
        fcm_token,
        device_id,
        platform,
        is_active: true,
        id_institucion: id_institucion || null,
        last_seen: DateTime.local(),
        app_version: app_version || null,
      })

      console.log(`✅ Token FCM registrado para usuario ${id_usuario}`)
      return nuevoToken
    } catch (error) {
      console.error('❌ Error al registrar token FCM:', error)
      throw error
    }
  }

  /**
   * Envía notificación a un usuario específico (todos sus dispositivos activos)
   */
  public async enviarNotificacionPorUsuario(
    id_usuario: number,
    titulo: string,
    cuerpo: string,
    data: Record<string, string> = {}
  ) {
    try {
      console.log(`📱 [FCM] Buscando tokens para usuario ${id_usuario}...`)
      
      // Obtener todos los tokens activos del usuario
      const tokens = await FcmToken.query()
        .where('id_usuario', id_usuario)
        .where('is_active', true)

      console.log(`📱 [FCM] Tokens encontrados: ${tokens.length}`)
      
      if (tokens.length === 0) {
        console.log(`⚠️ [FCM] Usuario ${id_usuario} no tiene tokens FCM activos`)
        return { success: false, message: 'No hay tokens activos' }
      }

      // Log de tokens (primeros 10 chars por seguridad)
      tokens.forEach((token, idx) => {
        console.log(`📱 [FCM] Token ${idx + 1}: ${token.fcm_token.substring(0, 10)}... (device: ${token.device_id || 'unknown'}, platform: ${token.platform})`)
      })

      const fcmTokens = tokens.map((t) => t.fcm_token)
      console.log(`📱 [FCM] Enviando a ${fcmTokens.length} dispositivos...`)
      
      return await this.enviarNotificacionMultiple(fcmTokens, titulo, cuerpo, data)
    } catch (error) {
      console.error('❌ [FCM] Error al enviar notificación por usuario:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Envía notificación a múltiples tokens
   */
  public async enviarNotificacionMultiple(
    tokens: string[],
    titulo: string,
    cuerpo: string,
    data: Record<string, string> = {}
  ) {
    if (!FirebaseService.isInitialized()) {
      console.warn('⚠️ Firebase no está inicializado. Inicializando ahora...')
      FirebaseService.initialize()
    }

    const messaging = FirebaseService.getMessaging()

    // Enviar en batches de hasta 500 tokens
    const batches = chunkArray(tokens, 500)
    let totalSuccess = 0
    let totalFailure = 0
    const errors: any[] = []

    for (const batch of batches) {
      const message = {
        data: {
          ...data,
          title: titulo,
          body: cuerpo,
          timestamp: new Date().toISOString(),
        },
        tokens: batch,
      }

      try {
        const response = await messaging.sendEachForMulticast(message)
        totalSuccess += response.successCount || 0
        totalFailure += response.failureCount || 0
        if (response.failureCount > 0) {
          await this.manejarTokensInvalidos(response, batch)
        }
      } catch (error) {
        console.error('❌ Error al enviar notificación FCM (batch):', error)
        errors.push((error as Error).message)
      }
    }

    // Persistir auditoría mínima
    try {
      await NotificationSent.create({
        type: (data && (data.tipo as any)) || 'generic',
        title: titulo || null,
        body: cuerpo || null,
        data: data || null,
        to_user_id: null,
        institution_id: (data && (data.institutionId ? Number(data.institutionId) : null)) || null,
        tokens_count: tokens.length,
        success_count: totalSuccess,
        failure_count: totalFailure,
        error_details: errors.length ? errors : null,
      })
    } catch (e) {
      console.error('Error guardando auditoría notifications_sent:', e)
    }

    return {
      success: errors.length === 0,
      successCount: totalSuccess,
      failureCount: totalFailure,
      errors,
    }
  }

  /**
   * Enviar notificación a todos los tokens activos de una institución
   */
  public async enviarNotificacionPorInstitucion(
    id_institucion: number,
    titulo: string,
    cuerpo: string,
    data: Record<string, string> = {},
    excludeUserId?: number
  ) {
    try {
      const q = FcmToken.query().where('id_institucion', id_institucion).where('is_active', true)
      if (excludeUserId) q.whereNot('id_usuario', excludeUserId)
      const tokens = await q
      if (!tokens || tokens.length === 0) return { success: false, message: 'No hay tokens activos' }
      const fcmTokens = tokens.map((t) => t.fcm_token)
      return await this.enviarNotificacionMultiple(fcmTokens, titulo, cuerpo, data)
    } catch (error) {
      console.error('❌ Error al enviar notificación por institución:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Enviar por topic
   */
  public async sendToTopic(topic: string, titulo: string, cuerpo: string, data: Record<string, string> = {}) {
    if (!FirebaseService.isInitialized()) FirebaseService.initialize()
    const messaging = FirebaseService.getMessaging()
    try {
      const message = {
        data: { 
          ...data, 
          title: titulo,
          body: cuerpo,
          timestamp: new Date().toISOString() 
        },
        topic,
      }
      const res = await messaging.send(message)
      // Guardar auditoría mínima
      try {
        await NotificationSent.create({
          type: (data && (data.tipo as any)) || 'topic',
          title: titulo || null,
          body: cuerpo || null,
          data: data || null,
          to_user_id: null,
          institution_id: null,
          tokens_count: 0,
          success_count: 1,
          failure_count: 0,
          error_details: null,
        })
      } catch (e) {
        console.error('Error guardando auditoría notifications_sent (topic):', e)
      }

      return { success: true, result: res }
    } catch (error) {
      console.error('❌ Error al enviar topic:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Desactiva tokens inválidos
   */
  private async manejarTokensInvalidos(response: any, tokens: string[]) {
    const tokensInvalidos: string[] = []

    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success) {
        const errorCode = resp.error?.code
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          tokensInvalidos.push(tokens[idx])
        }
      }
    })

    if (tokensInvalidos.length > 0) {
      await FcmToken.query().whereIn('fcm_token', tokensInvalidos).update({ is_active: false })

      console.log(`⚠️ Desactivados ${tokensInvalidos.length} tokens FCM inválidos`)
    }
  }

  /**
   * Desactiva un token específico
   */
  public async desactivarToken(fcm_token: string) {
    try {
      await FcmToken.query().where('fcm_token', fcm_token).update({ is_active: false })
      console.log(`✅ Token FCM desactivado: ${fcm_token}`)
    } catch (error) {
      console.error('❌ Error al desactivar token FCM:', error)
    }
  }

  /**
   * Obtiene todos los tokens activos de un usuario
   */
  public async obtenerTokensActivos(id_usuario: number) {
    try {
      const tokens = await FcmToken.query()
        .where('id_usuario', id_usuario)
        .where('is_active', true)

      return tokens
    } catch (error) {
      console.error('❌ Error al obtener tokens activos:', error)
      return []
    }
  }
}

