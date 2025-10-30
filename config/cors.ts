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
    'http://localhost:5176',
    'http://localhost:5173',
    'http://localhost:3000',
    // Dominio ngrok activo
    'https://gillian-semiluminous-blubberingly.ngrok-free.dev',
    // Agrega tu dominio de producción cuando lo tengas:
    // 'https://tu-frontend-produccion.com',
  ],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE','OPTIONS'],
  headers: true,
  exposeHeaders: ['authorization'],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
