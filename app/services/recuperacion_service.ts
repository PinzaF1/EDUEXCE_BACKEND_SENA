import jwt, { Secret } from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import bcrypt from 'bcrypt'
import { DateTime } from 'luxon'
import Institucion from '../models/institucione.js'
import Usuario from '../models/usuario.js'
import { 
  setRecoveryCode, 
  getRecoveryCode, 
  deleteRecoveryCode,
  isRedisAvailable 
} from './redis_service.js'

const SECRET: Secret = (process.env.JWT_SECRET ?? 'secret123') as Secret
const EXPIRES_RECOVERY = Number(process.env.JWT_RECOVERY_EXPIRES ?? 900) // 15 min

// ==================== CACHÉ EN MEMORIA PARA MÓVIL ====================
interface RecoveryData {
  correo: string
  codigo: string
  token: string
  expiresAt: DateTime
}

// Map temporal en memoria (NO requiere BD)
const recoveryCodesMap = new Map<string, RecoveryData>()

// Limpiar códigos expirados cada 5 minutos
setInterval(() => {
  const now = DateTime.now()
  let cleaned = 0
  for (const [correo, data] of recoveryCodesMap.entries()) {
    if (now > data.expiresAt) {
      recoveryCodesMap.delete(correo)
      cleaned++
    }
  }
  if (cleaned > 0) {
    console.log(`[Recuperación] Limpiados ${cleaned} códigos expirados`)
  }
}, 5 * 60 * 1000) // Cada 5 minutos

// ==================== FUNCIONES AUXILIARES ====================
function mailer() {
  // Configura tu SMTP en .env
  // EJ: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export default class RecuperacionService {
  // ==================== ADMIN - MÉTODO CON LINK (LEGACY) ====================
  
  // ADMIN: enviar correo con link/token
  async enviarCodigoAdmin(correo: string) {
    const inst = await Institucion.findBy('correo', correo.trim().toLowerCase())
    if (!inst) return false

    const token = jwt.sign(
      { rol: 'administrador', id_institucion: inst.id_institucion, scope: 'recovery' },
      SECRET,
      { expiresIn: EXPIRES_RECOVERY }
    )

    const url = `${process.env.FRONT_URL ?? 'http://localhost:5173'}/restablecer?token=${token}`
    
    try {
      await mailer().sendMail({
        from: process.env.SMTP_FROM ?? 'no-reply@demo.com',
        to: correo,
        subject: 'Recuperación de acceso (Administrador)',
        text: `Recupera tu acceso aquí: ${url} (válido por 15 min)`,
        html: `Recupera tu acceso aquí: <a href="${url}">${url}</a> (válido por 15 min)`,
      })
      console.log(`✅ [Recuperación Admin] Email enviado exitosamente para: ${correo}`)
      return true
    } catch (error: any) {
      console.error(`❌ [Recuperación Admin] ERROR al enviar email para ${correo}:`, error.message || error)
      return false
    }
  }

  // ADMIN: restablecer contraseña con token
  async restablecerAdmin(token: string, nueva: string) {
    const payload = jwt.verify(token, SECRET) as any
    if (payload.scope !== 'recovery' || payload.rol !== 'administrador') return false
    const inst = await Institucion.findOrFail(payload.id_institucion)
    ;(inst as any).password = await bcrypt.hash(nueva, 10)
    await inst.save()
    return true
  }

  // ==================== ADMIN - MÉTODO CON CÓDIGO (NUEVO) ====================

  // 1️⃣ SOLICITAR CÓDIGO - Admin
  async solicitarCodigoAdminPorCorreo(correo: string) {
    const inst = await Institucion.findBy('correo', correo.trim().toLowerCase())
    if (!inst) return false

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString()

    // Generar JWT token para validación posterior
    const token = jwt.sign(
      { rol: 'administrador', id_institucion: inst.id_institucion, scope: 'recovery' },
      SECRET,
      { expiresIn: EXPIRES_RECOVERY }
    )

    // Guardar en caché (Redis o Map)
    if (isRedisAvailable()) {
      await setRecoveryCode(correo, codigo, token, 15)
      console.log(`[Recuperación Admin] Código guardado en Redis para: ${correo}`)
    } else {
      recoveryCodesMap.set(correo, {
        correo,
        codigo,
        token,
        expiresAt: DateTime.now().plus({ minutes: 15 }),
      })
      console.log(`[Recuperación Admin] Código guardado en memoria (Map) para: ${correo}`)
    }

    // Enviar email con CÓDIGO
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        await mailer().sendMail({
          from: process.env.SMTP_FROM ?? 'no-reply@demo.com',
          to: correo,
          subject: 'Recuperación de contraseña - Código de verificación',
          text: `Tu código de recuperación es: ${codigo}\n\nVálido por 15 minutos.\n\nNo compartas este código con nadie.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976D2;">Código de Recuperación - Administrador</h2>
              <p>Tu código de verificación es:</p>
              <div style="font-size: 36px; font-weight: bold; color: #1976D2; letter-spacing: 8px; 
                           padding: 20px; text-align: center; background: #E3F2FD; border-radius: 8px;">
                ${codigo}
              </div>
              <p>Este código es válido por <strong>15 minutos</strong>.</p>
              <p style="color: #666; margin-top: 30px;">Si no solicitaste este código, ignora este mensaje.</p>
            </div>
          `,
        })
        console.log(`✅ [Recuperación Admin] Email con código enviado exitosamente para: ${correo}`)
      } catch (error: any) {
        console.error(`❌ [Recuperación Admin] ERROR al enviar email para ${correo}:`, error.message || error)
      }
    } else {
      console.log(`⚠️ [Recuperación Admin] SMTP no configurado - Código generado: ${codigo} para: ${correo}`)
    }

    return { success: true, codigo }
  }

  // 2️⃣ VERIFICAR CÓDIGO - Admin
  async verificarCodigoAdmin(correo: string, codigo: string) {
    let data: any = null

    if (isRedisAvailable()) {
      data = await getRecoveryCode(correo)
    } else {
      data = recoveryCodesMap.get(correo)
    }

    if (!data) {
      console.log(`[Recuperación Admin] No se encontró código para: ${correo}`)
      return false
    }

    // Verificar expiración
    const expiresAt = DateTime.fromISO(data.expiresAt)
    if (DateTime.now() > expiresAt) {
      if (isRedisAvailable()) {
        await deleteRecoveryCode(correo)
      } else {
        recoveryCodesMap.delete(correo)
      }
      console.log(`[Recuperación Admin] Código expirado para: ${correo}`)
      return false
    }

    // Verificar código
    const isValid = data.codigo === codigo
    if (isValid) {
      console.log(`[Recuperación Admin] Código válido para: ${correo}`)
    } else {
      console.log(`[Recuperación Admin] Código incorrecto para: ${correo}`)
    }

    return isValid
  }

  // 3️⃣ RESTABLECER CONTRASEÑA - Admin con código
  async restablecerPasswordAdminConCodigo(correo: string, codigo: string, nueva: string) {
    // Verificar código primero
    const valid = await this.verificarCodigoAdmin(correo, codigo)
    if (!valid) {
      console.log(`[Recuperación Admin] Intento de restablecimiento con código inválido para: ${correo}`)
      return false
    }

    // Obtener datos del caché
    let data: any = null
    if (isRedisAvailable()) {
      data = await getRecoveryCode(correo)
    } else {
      data = recoveryCodesMap.get(correo)
    }

    if (!data) {
      return false
    }

    try {
      // Verificar JWT token
      const payload = jwt.verify(data.token, SECRET) as any
      const inst = await Institucion.findOrFail(payload.id_institucion)

      // Actualizar contraseña
      ;(inst as any).password = await bcrypt.hash(nueva, 10)
      await inst.save()

      // Eliminar código del caché (ya usado)
      if (isRedisAvailable()) {
        await deleteRecoveryCode(correo)
      } else {
        recoveryCodesMap.delete(correo)
      }

      console.log(`[Recuperación Admin] Contraseña restablecida exitosamente para: ${correo}`)
      return true
    } catch (error) {
      console.error(`[Recuperación Admin] Error al restablecer contraseña para: ${correo}`, error)
      return false
    }
  }

  // ESTUDIANTE: enviar correo con link/token
  async enviarCodigoEstudiante(correo: string) {
    const u = await Usuario.findBy('correo', correo.trim().toLowerCase())
    if (!u || u.rol !== 'estudiante') return false

    const token = jwt.sign(
      { rol: 'estudiante', id_usuario: u.id_usuario, scope: 'recovery' },
      SECRET,
      { expiresIn: EXPIRES_RECOVERY }
    )

    const url = `${process.env.FRONT_URL ?? 'http://localhost:5173'}/restablecer?token=${token}`
    
    try {
      await mailer().sendMail({
        from: process.env.SMTP_FROM ?? 'no-reply@demo.com',
        to: correo,
        subject: 'Recuperación de acceso (Estudiante)',
        text: `Recupera tu acceso aquí: ${url} (válido por 15 min)`,
        html: `Recupera tu acceso aquí: <a href="${url}">${url}</a> (válido por 15 min)`,
      })
      console.log(`✅ [Recuperación Estudiante Web] Email enviado exitosamente para: ${correo}`)
      return true
    } catch (error: any) {
      console.error(`❌ [Recuperación Estudiante Web] ERROR al enviar email para ${correo}:`, error.message || error)
      return false
    }
  }

  // ESTUDIANTE: restablecer contraseña
  async restablecerEstudiante(token: string, nueva: string) {
    const payload = jwt.verify(token, SECRET) as any
    if (payload.scope !== 'recovery' || payload.rol !== 'estudiante') return false
    const u = await Usuario.findOrFail(payload.id_usuario)
    ;(u as any).password_hash = await bcrypt.hash(nueva, 10)
    await u.save()
    return true
  }

  // ==================== MÉTODOS PARA MÓVIL (CON CÓDIGO) ====================

  // 1️⃣ SOLICITAR CÓDIGO - Genera código de 6 dígitos y envía por email
  async solicitarCodigoEstudiantePorCorreo(correo: string) {
    const u = await Usuario.findBy('correo', correo.trim().toLowerCase())
    if (!u || u.rol !== 'estudiante') return false

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString()

    // Generar JWT token para validación posterior
    const token = jwt.sign(
      { rol: 'estudiante', id_usuario: u.id_usuario, scope: 'recovery' },
      SECRET,
      { expiresIn: EXPIRES_RECOVERY }
    )

    // Guardar en caché (Redis o Map)
    if (isRedisAvailable()) {
      // Usar Redis (escalable, funciona con Docker)
      await setRecoveryCode(correo, codigo, token, 15)
      console.log(`[Recuperación] Código guardado en Redis para: ${correo}`)
    } else {
      // Fallback a Map (memoria) para desarrollo
      recoveryCodesMap.set(correo, {
        correo,
        codigo,
        token,
        expiresAt: DateTime.now().plus({ minutes: 15 }),
      })
      console.log(`[Recuperación] Código guardado en memoria (Map) para: ${correo}`)
    }

    // Enviar email con CÓDIGO (no link)
    // Si hay SMTP configurado, envía email, sino solo log
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        await mailer().sendMail({
          from: process.env.SMTP_FROM ?? 'no-reply@demo.com',
          to: correo,
          subject: 'Recuperación de contraseña - Código de verificación',
          text: `Tu código de recuperación es: ${codigo}\n\nVálido por 15 minutos.\n\nNo compartas este código con nadie.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976D2;">Código de Recuperación</h2>
              <p>Tu código de verificación es:</p>
              <div style="font-size: 36px; font-weight: bold; color: #1976D2; letter-spacing: 8px; 
                           padding: 20px; text-align: center; background: #E3F2FD; border-radius: 8px;">
                ${codigo}
              </div>
              <p>Este código es válido por <strong>15 minutos</strong>.</p>
              <p style="color: #666; margin-top: 30px;">Si no solicitaste este código, ignora este mensaje.</p>
            </div>
          `,
        })
        console.log(`✅ [Recuperación] Email enviado exitosamente para: ${correo}`)
      } catch (error: any) {
        console.error(`❌ [Recuperación] ERROR al enviar email para ${correo}:`, error.message || error)
        console.error('Detalles del error SMTP:', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          // No mostrar password por seguridad
        })
      }
    } else {
      console.log(`⚠️ [Recuperación] SMTP no configurado - Código generado: ${codigo} para: ${correo}`)
    }

    return { success: true, codigo } // Devuelve el código para testing
  }

  // 2️⃣ VERIFICAR CÓDIGO - Valida que el código sea correcto y no haya expirado
  async verificarCodigoEstudiante(correo: string, codigo: string) {
    let data: any = null

    // Obtener de Redis o Map
    if (isRedisAvailable()) {
      data = await getRecoveryCode(correo)
    } else {
      data = recoveryCodesMap.get(correo)
    }

    if (!data) {
      console.log(`[Recuperación] No se encontró código para: ${correo}`)
      return false
    }

    // Verificar expiración
    const expiresAt = DateTime.fromISO(data.expiresAt)
    if (DateTime.now() > expiresAt) {
      if (isRedisAvailable()) {
        await deleteRecoveryCode(correo)
      } else {
        recoveryCodesMap.delete(correo)
      }
      console.log(`[Recuperación] Código expirado para: ${correo}`)
      return false
    }

    // Verificar código
    const isValid = data.codigo === codigo
    if (isValid) {
      console.log(`[Recuperación] Código válido para: ${correo}`)
    } else {
      console.log(`[Recuperación] Código incorrecto para: ${correo}`)
    }

    return isValid
  }

  // 3️⃣ RESTABLECER CONTRASEÑA - Usa código verificado para cambiar password
  async restablecerPasswordConCodigo(correo: string, codigo: string, nueva: string) {
    // Verificar código primero
    const valid = await this.verificarCodigoEstudiante(correo, codigo)
    if (!valid) {
      console.log(`[Recuperación] Intento de restablecimiento con código inválido para: ${correo}`)
      return false
    }

    // Obtener datos del caché (Redis o Map)
    let data: any = null
    if (isRedisAvailable()) {
      data = await getRecoveryCode(correo)
    } else {
      data = recoveryCodesMap.get(correo)
    }

    if (!data) {
      return false
    }

    try {
      // Verificar JWT token
      const payload = jwt.verify(data.token, SECRET) as any
      const u = await Usuario.findOrFail(payload.id_usuario)

      // Actualizar contraseña
      u.password_hash = await bcrypt.hash(nueva, 10)
      await u.save()

      // Eliminar código del caché (ya usado)
      if (isRedisAvailable()) {
        await deleteRecoveryCode(correo)
      } else {
        recoveryCodesMap.delete(correo)
      }

      console.log(`[Recuperación] Contraseña restablecida exitosamente para: ${correo}`)
      return true
    } catch (error) {
      console.error(`[Recuperación] Error al restablecer contraseña para: ${correo}`, error)
      return false
    }
  }
}
