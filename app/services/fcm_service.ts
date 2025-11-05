import FirebaseService from './firebase_service.js'
import FcmToken from '#models/fcm_token'

export default class FcmService {
  /**
   * Registra o actualiza el token FCM de un usuario
   */
  public async registrarToken(
    id_usuario: number,
    fcm_token: string,
    device_id: string | null = null,
    platform: 'android' | 'ios' = 'android'
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
      // Obtener todos los tokens activos del usuario
      const tokens = await FcmToken.query()
        .where('id_usuario', id_usuario)
        .where('is_active', true)

      if (tokens.length === 0) {
        console.log(`⚠️ Usuario ${id_usuario} no tiene tokens FCM activos`)
        return { success: false, message: 'No hay tokens activos' }
      }

      const fcmTokens = tokens.map((t) => t.fcm_token)
      return await this.enviarNotificacionMultiple(fcmTokens, titulo, cuerpo, data)
    } catch (error) {
      console.error('❌ Error al enviar notificación por usuario:', error)
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

    const message = {
      notification: {
        title: titulo,
        body: cuerpo,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      tokens: tokens,
    }

    try {
      const response = await messaging.sendEachForMulticast(message)

      console.log(
        `✅ Notificaciones FCM enviadas: ${response.successCount}/${tokens.length}`
      )

      // Desactivar tokens que fallaron
      if (response.failureCount > 0) {
        await this.manejarTokensInvalidos(response, tokens)
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (error) {
      console.error('❌ Error al enviar notificación FCM:', error)
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

