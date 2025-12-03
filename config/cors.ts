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
  'https://senaeduexcel.vercel.app', // <--- agregar Vercel
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
})

export default corsConfig
