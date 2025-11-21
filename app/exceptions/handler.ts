import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // Primero deja que Adonis construya la respuesta de error
    await super.handle(error, ctx)

    // Forzar cabeceras CORS en todas las respuestas de error (4xx/5xx)
    try {
      const requestOrigin = ctx.request.header('origin') || ''
      const allowedOrigins = [
        'https://d1hy8jjhbmsdtk.cloudfront.net',
        'https://eduexce-api.duckdns.org',
      ]

      const allowOrigin = allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins[0]

      ctx.response.header('Access-Control-Allow-Origin', allowOrigin)
      ctx.response.header('Access-Control-Allow-Credentials', 'true')
      ctx.response.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      )
      ctx.response.header(
        'Access-Control-Allow-Headers',
        'Authorization,Content-Type,Accept,Origin,X-Requested-With'
      )
      ctx.response.header(
        'Access-Control-Expose-Headers',
        'authorization,content-type,accept'
      )
        // Ensure caching proxies vary by Origin so cached responses are origin-safe
        ctx.response.header('Vary', 'Origin')
    } catch (e) {
      // No bloquear el flujo por problemas al añadir headers
    }

    return
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
