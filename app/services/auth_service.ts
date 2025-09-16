import jwt, { Secret } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import Institucion from '../models/institucione.js'
import Usuario from '../models/usuario.js'

const SECRET: Secret = (process.env.JWT_SECRET ?? 'secret123') as Secret
const EXPIRES_IN: number = Number(process.env.JWT_EXPIRES_IN ?? 86400) // 1 día en segundos

export default class AuthService {
  // ADMIN: correo + contraseña (tabla instituciones)
  async loginAdministrador(correo: string, password: string) {
    const inst = await Institucion.findBy('correo', correo.trim().toLowerCase())
    if (!inst) return null

    const ok = await bcrypt.compare(password, inst.password)
    if (!ok) return null

    const token = jwt.sign({ rol: 'administrador', id_institucion: inst.id_institucion }, SECRET, {
      expiresIn: EXPIRES_IN,
    })

    return {
      admin: { id_institucion: inst.id_institucion, nombre_institucion: inst.nombre_institucion },
      token,
    }
  }

  // ESTUDIANTE: documento + contraseña (tabla usuarios)
  async loginEstudiante(numero_documento: string, password: string) {
    const est = await Usuario.findBy('numero_documento', String(numero_documento))
    if (!est || est.rol !== 'estudiante') return null
    if ((est as any).is_active === false) return null

    const ok = await bcrypt.compare(password, est.password_hash)
    if (!ok) return null

    const token = jwt.sign(
      {
        rol: 'estudiante',
        id_usuario: est.id_usuario,
        id_institucion: (est as any).id_institucion ?? null,
      },
      SECRET,
      { expiresIn: EXPIRES_IN }
    )

    return { usuario: { id_usuario: est.id_usuario }, token }
  }
}
