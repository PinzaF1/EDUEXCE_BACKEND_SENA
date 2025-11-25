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
}
