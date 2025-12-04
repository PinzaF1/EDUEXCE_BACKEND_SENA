import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

const corsConfig = defineConfig({
  enabled: true,


  // ✅ ORIGEN: Lista explícita (CORRECTO)
  origin: [
  'http://localhost:5173',
  'http://localhost:5176',
  'http://localhost:3000',
  'https://gillian-semiluminous-blubberingly.ngrok-free.dev',
  'https://churnable-nimbly-norbert.ngrok-free.dev',
  'http://52.20.236.109',
  'http://52.20.236.109:3333',
  'https://eduexcelsena-omega.vercel.app', // <--- agregar Vercel

  // ✅ Nuevas URLs de Vercel
    'https://eduexce-aws-demo.vercel.app',                                    // Producción
    'https://eduexce-aws-demo-mifdrnyub-yare-cntrls-projects.vercel.app',
],

  // ✅ MÉTODOS: Incluir PATCH si es necesario
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

  // ✅ HEADERS: Mejorar para preflight
  headers: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Custom-Header' // si usas headers personalizados
  ],

  // ✅ EXPOSE HEADERS: Añadir los que el frontend necesita leer
  exposeHeaders: [
    'authorization',
    'content-range',
    'x-total-count'
  ],

  // ✅ CREDENTIALS: true (CORRECTO)
  credentials: true,

  // ✅ MAX AGE: Buen valor
  maxAge: 90,

  
  // Configuración dinámica según el entorno
  origin: (origin) => {
    // Orígenes permitidos para desarrollo
    const devOrigins = [
      'http://localhost:5175',
      'http://localhost:5176', 
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4200',
      'http://127.0.0.1:5173',
    ]

    // Orígenes permitidos para producción (desde variables de entorno)
    const prodOrigins = env.get('CORS_ORIGIN', '').split(',').filter(Boolean)
    
    // Dominios ngrok para desarrollo (actualizar según sea necesario)
    const ngrokOrigins = [
      'https://gillian-semiluminous-blubberingly.ngrok-free.dev',
      'https://churnable-nimbly-norbert.ngrok-free.dev',
    ]

    const allowedOrigins = [
      ...devOrigins,
      ...prodOrigins,
      ...ngrokOrigins
    ]

    // Si no hay origin (por ejemplo, Postman), permitir en desarrollo
    if (!origin && env.get('NODE_ENV') === 'development') {
      return true
    }

    // Verificar si el origin está en la lista de permitidos
    if (allowedOrigins.includes(origin)) {
      return true
    }

    // En desarrollo, permitir cualquier localhost
    if (env.get('NODE_ENV') === 'development' && origin?.includes('localhost')) {
      return true
    }

    // Rechazar otros orígenes
    return false
  },

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  
  // Headers permitidos
  headers: [
    'Content-Type', 
    'Authorization', 
    'ngrok-skip-browser-warning', 
    'X-Requested-With', 
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  
  // Headers expuestos al cliente
  exposeHeaders: ['authorization', 'x-total-count'],
  
  // Permitir cookies y credenciales
  credentials: true,
  
  // Cache preflight por 24 horas
  maxAge: 86400,

})

export default corsConfig
