import './Routes/rol.js'
import Route from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import path from 'node:path'

// Health check endpoints para monitoreo
Route.get('/health', '#controllers/health_controller.index')
Route.get('/health/detailed', '#controllers/health_controller.detailed')

// Servir archivos estáticos desde public/uploads/fotos
Route.get('/uploads/fotos/:filename', async ({ params, response }) => {
  try {
    const filename = params.filename
    const filePath = path.join(app.makePath('public', 'uploads', 'fotos'), filename)
    
    // Verificar que el archivo existe
    try {
      await fs.access(filePath)
    } catch {
      return response.notFound({ error: 'Archivo no encontrado' })
    }
    
    // Leer y servir el archivo
    const fileBuffer = await fs.readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                       ext === '.png' ? 'image/png' :
                       ext === '.webp' ? 'image/webp' : 'application/octet-stream'
    
    return response.type(contentType).send(fileBuffer)
  } catch (error) {
    return response.internalServerError({ error: 'Error al servir el archivo' })
  }
})
