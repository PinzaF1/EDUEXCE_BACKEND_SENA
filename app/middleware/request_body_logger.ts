import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class RequestBodyLogger {
  public async handle(ctx: HttpContextContract, next: () => Promise<void>) {
    // Only log in non-production to avoid leaking sensitive data
    if (process.env.NODE_ENV !== 'production') {
      try {
        const method = ctx.request.method()
        const url = ctx.request.url()
        const requestId = ctx.request.header('x-request-id') || ctx.request.header('X-Request-Id') || ''
        const contentType = (ctx.request.header('content-type') || '').toString()

        let bodyPreview = ''
        if (contentType.includes('application/json')) {
          const body = ctx.request.body() || {}
          try {
            bodyPreview = JSON.stringify(body)
          } catch (e) {
            bodyPreview = String(body)
          }
          if (bodyPreview.length > 10000) {
            bodyPreview = bodyPreview.slice(0, 10000) + '...<truncated>'
          }
        }

        console.log(`▶️ [request-body] id=${requestId} ${method} ${url} content-type=${contentType} body=${bodyPreview}`)
      } catch (err) {
        console.log('⚠️ [request-body] failed to log body', err)
      }
    }

    await next()
  }
}
