import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

const corsConfig = defineConfig({
  enabled: true,

  // ✅ UNA SOLA configuración de origin (dinámica)
  origin: (origin) => {
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:5176', 
      'http://localhost:5175',
      'http://localhost:3000',
      'http://localhost:4200',
      'http://127.0.0.1:5173',
    ]

    const prodOrigins = env.get('CORS_ORIGIN', '').split(',').filter(Boolean)
    
    const ngrokOrigins = [
      'https://gillian-semiluminous-blubberingly.ngrok-free.dev',
      'https://churnable-nimbly-norbert.ngrok-free.dev',
    ]

    // ✅ URLs de Vercel (todas juntas aquí)
    const vercelOrigins = [
      'https://senaeduexcel.vercel.app',
      'https://eduexcelsena-omega.vercel.app',
      'https://eduexce-aws-demo.vercel.app',
      'https://eduexce-aws-demo-mifdrnyub-yare-cntrls-projects.vercel.app',
    ]

    // ✅ IPs de EC2 (si las necesitas)
    const ec2Origins = [
      'http://52.20.236.109',
      'http://52.20.236.109:3333',
    ]

    const allowedOrigins = [
      ...devOrigins,
      ...prodOrigins,
      ...ngrokOrigins,
      ...vercelOrigins,
      ...ec2Origins,
    ]

    // Sin origin (Postman, etc) - permitir en dev
    if (!origin && env.get('NODE_ENV') === 'development') return true

    // Verificar lista permitida
    if (allowedOrigins.includes(origin)) return true

    // Localhost en desarrollo
    if (env.get('NODE_ENV') === 'development' && origin?.includes('localhost')) return true

    return false
  },

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  
  headers: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  
  exposeHeaders: ['authorization', 'content-range', 'x-total-count'],
  
  credentials: true,
  
  maxAge: 86400,
})

export default corsConfig