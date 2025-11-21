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
  origin: (origin: string | undefined) => {
    const whitelist = [
      'https://d1hy8jjhbmsdtk.cloudfront.net',
      'https://eduexce-api.duckdns.org',
      'https://your-frontend.vercel.app', // opcional - reemplazar si aplica
      'http://localhost:5173', // Vite default
      'http://localhost:3000', // otros dev servers
      'http://localhost:5175' // tu dev server según el error
    ]

    // Allow requests with no Origin header (server-to-server, curl, etc.)
    if (!origin) return true

    return whitelist.includes(origin)
  },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
      // evita incluir cabeceras de respuesta como 'Access-Control-Allow-*'
    ],
  exposeHeaders: [
    'Authorization',
    'Content-Type',
    'Accept',
  ],
  credentials: true,
    // Aumentar maxAge para reducir preflights en navegadores cuando sea seguro
    maxAge: 1728000,
})

export default corsConfig
