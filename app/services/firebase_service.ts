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
        let serviceAccount: admin.ServiceAccount

        // MÉTODO 1: Leer desde variable de entorno (para Docker/Producción)
        const firebaseEnv = process.env.FIREBASE_SERVICE_ACCOUNT || env.get('FIREBASE_SERVICE_ACCOUNT', '')

        if (firebaseEnv) {
          console.log('🔧 Cargando Firebase desde variable de entorno...')
          serviceAccount = JSON.parse(firebaseEnv) as admin.ServiceAccount
        } else {
          // MÉTODO 2: Leer desde archivo local (para desarrollo)
          const serviceAccountPath = join(__dirname, '..', '..', 'config', 'firebase-admin-sdk.json')
          
          if (!existsSync(serviceAccountPath)) {
            throw new Error(
              'No se encontró configuración de Firebase.\n' +
              'Opciones:\n' +
              '1. Crear archivo: config/firebase-admin-sdk.json\n' +
              '2. Configurar variable: FIREBASE_SERVICE_ACCOUNT en .env'
            )
          }

          console.log('🔧 Cargando Firebase desde archivo config/firebase-admin-sdk.json...')
          serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8')) as admin.ServiceAccount
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })

        this.initialized = true
        console.log('✅ Firebase Admin SDK inicializado correctamente')
      } catch (error) {
        console.error('❌ Error al inicializar Firebase Admin SDK:', error)
        throw error
      }
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

