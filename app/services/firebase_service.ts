import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import env from '#start/env'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class FirebaseService {
  private static initialized = false

  public static initialize() {
    if (!this.initialized) {
      try {
        console.log('🔥 [FIREBASE] Iniciando configuración...')
        let serviceAccount: admin.ServiceAccount

        // MÉTODO 1: Leer desde variable de entorno (para Docker/Producción)
        const firebaseEnv = process.env.FIREBASE_SERVICE_ACCOUNT || env.get('FIREBASE_SERVICE_ACCOUNT', '')

        if (firebaseEnv) {
          console.log('🔧 [FIREBASE] Cargando desde variable de entorno...')
          serviceAccount = JSON.parse(firebaseEnv) as admin.ServiceAccount
          console.log(`🔧 [FIREBASE] Project ID: ${serviceAccount.project_id}`)
        } else {
          // MÉTODO 2: Leer desde archivo local (para desarrollo)
          const serviceAccountPath = join(__dirname, '..', '..', 'config', 'firebase-admin-sdk.json')
          
          console.log(`🔍 [FIREBASE] Verificando archivo: ${serviceAccountPath}`)
          
          if (!existsSync(serviceAccountPath)) {
            console.error(`❌ [FIREBASE] Archivo no encontrado: ${serviceAccountPath}`)
            throw new Error(
              'No se encontró configuración de Firebase.\n' +
              'Opciones:\n' +
              '1. Crear archivo: config/firebase-admin-sdk.json\n' +
              '2. Configurar variable: FIREBASE_SERVICE_ACCOUNT en .env'
            )
          }

          console.log('🔧 [FIREBASE] Cargando desde archivo config/firebase-admin-sdk.json...')
          serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8')) as admin.ServiceAccount
          console.log(`🔧 [FIREBASE] Project ID: ${serviceAccount.project_id}`)
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })

        this.initialized = true
        console.log('✅ [FIREBASE] Admin SDK inicializado correctamente')
      } catch (error) {
        console.error('❌ [FIREBASE] Error al inicializar:', error)
        throw error
      }
    } else {
      console.log('🔥 [FIREBASE] Ya está inicializado')
    }
  }

  public static getMessaging() {
    this.initialize()
    return admin.messaging()
  }

  public static isInitialized(): boolean {
    return this.initialized
  }
}

export default FirebaseService

