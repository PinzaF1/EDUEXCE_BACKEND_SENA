import { defineConfig } from '@adonisjs/cors'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  // Lista explícita de orígenes permitidos (más seguro que origin: true)
  // Agrega aquí los dominios de tu frontend y ngrok
  origin: [
      'https://d1hy8jjhbmsdtk.cloudfront.net',
      // Agrega aquí otros orígenes permitidos si es necesario
  ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
    ],
  exposeHeaders: [
    'Authorization',
    'Content-Type',
    'Accept',
  ],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
