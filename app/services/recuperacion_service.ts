import jwt, { Secret } from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import bcrypt from 'bcrypt'
import Institucion from '../models/institucione.js'
import Usuario from '../models/usuario.js'

const SECRET: Secret = (process.env.JWT_SECRET ?? 'secret123') as Secret
const EXPIRES_RECOVERY = Number(process.env.JWT_RECOVERY_EXPIRES ?? 900) // 15 min

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
  // ADMIN: enviar correo con link/tocken
  async enviarCodigoAdmin(correo: string) {
    const inst = await Institucion.findBy('correo', correo.trim().toLowerCase())
    if (!inst) return false

    const token = jwt.sign(
      { rol: 'administrador', id_institucion: inst.id_institucion, scope: 'recovery' },
      SECRET,
      { expiresIn: EXPIRES_RECOVERY }
    )

    const url = `${process.env.FRONT_URL ?? 'http://localhost:5173'}/restablecer?token=${token}`
    await mailer().sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@demo.com',
      to: correo,
      subject: 'Recuperación de acceso (Administrador)',
      text: `Recupera tu acceso aquí: ${url} (válido por 15 min)`,
      html: `Recupera tu acceso aquí: <a href="${url}">${url}</a> (válido por 15 min)`,
    })
    return true
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
    await mailer().sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@demo.com',
      to: correo,
      subject: 'Recuperación de acceso (Estudiante)',
      text: `Recupera tu acceso aquí: ${url} (válido por 15 min)`,
      html: `Recupera tu acceso aquí: <a href="${url}">${url}</a> (válido por 15 min)`,
    })
    return true
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
}
