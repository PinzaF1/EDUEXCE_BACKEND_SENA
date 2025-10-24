import bcrypt from 'bcrypt'
import jwt, { Secret } from 'jsonwebtoken'
import { DateTime } from 'luxon'
import Institucion from '../models/institucione.js'

const SECRET: Secret = (process.env.JWT_SECRET ?? 'secret123') as Secret
const EXPIRES_IN: number = Number(process.env.JWT_EXPIRES_IN ?? 86400) // 1 día

type RegistroDto = {
  nombre_institucion: string
  codigo_dane: string
  ciudad: string
  departamento: string
  direccion: string
  telefono: string
  jornada: string
  correo: string
  password: string
  confirm_password: string
}

const normalizeEmail = (s: string) => String(s || '').trim().toLowerCase()
const trim = (s: any) => String(s ?? '').trim()

export default class RegistroService {
  // EP-01: Registro y validación de institución
  async registrarInstitucion(d: RegistroDto) {
    // Normalizar
    const nombre_institucion = trim(d.nombre_institucion)
    const codigo_dane       = trim(d.codigo_dane)
    const ciudad            = trim(d.ciudad)
    const departamento      = trim(d.departamento)
    const direccion         = trim(d.direccion)
    const telefono          = trim(d.telefono)
    const jornada           = trim(d.jornada)
    const correo            = normalizeEmail(d.correo)
    const password          = String(d.password ?? '')
    const confirm           = String(d.confirm_password ?? '')

    // Validaciones de obligatorios (EP-01 HU-01)
    const faltantes: string[] = []
    if (!nombre_institucion) faltantes.push('nombre_institucion')
    if (!codigo_dane)       faltantes.push('codigo_dane')
    if (!ciudad)            faltantes.push('ciudad')
    if (!departamento)      faltantes.push('departamento')
    if (!direccion)         faltantes.push('direccion')
    if (!telefono)          faltantes.push('telefono')
    if (!jornada)           faltantes.push('jornada')
    if (!correo)            faltantes.push('correo')
    if (!password)          faltantes.push('password')
    if (!confirm)           faltantes.push('confirm_password')
    if (faltantes.length) {
      throw new Error(`Campos obligatorios: ${faltantes.join(', ')}`)
    }
    if (password !== confirm) {
      throw new Error('Las contraseñas no coinciden')
    }

    // Unicidad
    if (await Institucion.findBy('correo', correo)) {
      throw new Error('El correo institucional ya está registrado')
    }
    if (await Institucion.findBy('codigo_dane', codigo_dane)) {
      throw new Error('El código DANE ya está registrado')
    }

    // Hash de contraseña
    const hash = await bcrypt.hash(password, 10)

    // Crear institución con defaults para evitar NULL innecesarios
    const inst = await Institucion.create({
      nombre_institucion,
      codigo_dane,
      ciudad,
      departamento,
      direccion,
      telefono,
      jornada,
      correo,
      password: hash,
    } as any)


    // Autologin post-registro (EP-01 HU-02)
    const token = jwt.sign(
      { rol: 'administrador', id_institucion: (inst as any).id_institucion },
      SECRET,
      { expiresIn: EXPIRES_IN }
    )

    // NUNCA devolver password ni hash
    return {
      institucion: {
        id_institucion: (inst as any).id_institucion,
        nombre_institucion: (inst as any).nombre_institucion,
        codigo_dane: (inst as any).codigo_dane,
        ciudad: (inst as any).ciudad,
        departamento: (inst as any).departamento,
        direccion: (inst as any).direccion,
        telefono: (inst as any).telefono,
        jornada: (inst as any).jornada,
        correo: (inst as any).correo,
        logo_url: (inst as any).logo_url ?? null,
        is_active: (inst as any).is_active ?? true,
        created_at: (inst as any).created_at,
        updated_at: (inst as any).updated_at,
      },
      token,
      token_type: 'Bearer',
      expires_in: EXPIRES_IN,
      issued_at: DateTime.now().toISO(),
    }
  }
}
