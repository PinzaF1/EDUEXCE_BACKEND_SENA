import type { HttpContext } from '@adonisjs/core/http'
import FcmService from '../services/fcm_service.js'

export default class DebugController {
  fcm = new FcmService()

  public async sendNotification({ request, response }: HttpContext) {
    try {
      // Protección extra: activar solo si la variable de entorno lo permite
      const allow = String(process.env.ALLOW_DEBUG_NOTIFICATIONS || 'false').toLowerCase()
      if (allow !== 'true') return response.forbidden({ error: 'Debug notifications disabled' })

      const body = request.only(['mode', 'targetUserId', 'institutionId', 'tokens', 'topic', 'title', 'body', 'data']) as any
      const mode = String(body.mode || '').trim()
      const title = body.title || 'Prueba'
      const txt = body.body || ''
      const data = typeof body.data === 'object' ? body.data : {}

      let summary: any = { success: false }

      if (mode === 'user' && body.targetUserId) {
        summary = await this.fcm.enviarNotificacionPorUsuario(Number(body.targetUserId), title, txt, data)
      } else if (mode === 'institution' && body.institutionId) {
        summary = await this.fcm.enviarNotificacionPorInstitucion(Number(body.institutionId), title, txt, data)
      } else if (mode === 'tokens' && Array.isArray(body.tokens)) {
        summary = await this.fcm.enviarNotificacionMultiple(body.tokens, title, txt, data)
      } else if (mode === 'topic' && body.topic) {
        summary = await this.fcm.sendToTopic(String(body.topic), title, txt, data)
      } else {
        return response.badRequest({ error: 'Parámetros inválidos para el modo solicitado' })
      }

      return response.ok({ success: true, summary })
    } catch (e: any) {
      console.error('Error debug sendNotification:', e)
      return response.internalServerError({ error: e?.message || 'Error interno' })
    }
  }

  public async verificarTokensFCM({ request, response }: HttpContext) {
    try {
      const allow = String(process.env.ALLOW_DEBUG_NOTIFICATIONS || 'false').toLowerCase()
      if (allow !== 'true') return response.forbidden({ error: 'Debug disabled' })

      const { userId } = request.only(['userId'])
      const id_usuario = userId ? Number(userId) : null

      console.log(`🔍 [DEBUG] Verificando tokens FCM para usuario ${id_usuario || 'TODOS'}...`)

      const { default: FcmToken } = await import('#models/fcm_token')
      const { default: Usuario } = await import('#models/usuario')
      
      let tokens
      if (id_usuario) {
        tokens = await FcmToken.query()
          .where('id_usuario', id_usuario)
          .orderBy('id_token', 'desc')
          .limit(10)
      } else {
        tokens = await FcmToken.query()
          .orderBy('id_token', 'desc')
          .limit(50)
      }

      console.log(`📱 [DEBUG] Encontrados ${tokens.length} tokens`)

      const tokensInfo = []
      for (const token of tokens) {
        const usuario = await Usuario.find(token.id_usuario)
        const info = {
          id_token: token.id_token,
          id_usuario: token.id_usuario,
          usuario_nombre: usuario ? `${(usuario as any).nombre} ${(usuario as any).apellido}`.trim() : 'Desconocido',
          fcm_token: token.fcm_token.substring(0, 20) + '...',
          fcm_token_completo: token.fcm_token, // Solo para debug
          platform: token.platform,
          is_active: token.is_active,
          device_id: token.device_id,
          last_seen: token.last_seen?.toISO?.() || null,
          app_version: (token as any).app_version || null,
          created_at: token.createdAt?.toISO?.() || null
        }
        tokensInfo.push(info)
        console.log(`📱 [DEBUG] Token ${info.id_token}: Usuario ${info.id_usuario} (${info.usuario_nombre}), Activo: ${info.is_active}, Plataforma: ${info.platform}`)
      }

      return response.ok({ 
        success: true, 
        total: tokens.length,
        tokens: tokensInfo,
        usuario_consultado: id_usuario
      })
    } catch (e: any) {
      console.error('❌ [DEBUG] Error verificando tokens FCM:', e)
      return response.internalServerError({ error: e?.message || 'Error interno' })
    }
  }
}
