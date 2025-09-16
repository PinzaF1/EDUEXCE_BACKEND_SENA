// app/services/registro_service.ts
import bcrypt from 'bcrypt'
import jwt, { Secret } from 'jsonwebtoken'
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

export default class RegistroService {
  // EP-01: Registro y validación de institución
  async registrarInstitucion(d: RegistroDto) {
    // Normalizar/trim
    const nombre_institucion = d.nombre_institucion?.trim()
    const codigo_dane = d.codigo_dane?.trim()
    const ciudad = d.ciudad?.trim()
    const departamento = d.departamento?.trim()
    const direccion = d.direccion?.trim()
    const telefono = d.telefono?.trim()
    const jornada = d.jornada?.trim()
    const correo = d.correo?.trim().toLowerCase()
    const password = String(d.password ?? '')
    const confirm = String(d.confirm_password ?? '')

    // Validaciones de campos obligatorios
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
    const existeCorreo = await Institucion.findBy('correo', correo)
    if (existeCorreo) throw new Error('El correo institucional ya está registrado')

    const existeDane = await Institucion.findBy('codigo_dane', codigo_dane)
    if (existeDane) throw new Error('El código DANE ya está registrado')

    // Hash de contraseña
    const hash = await bcrypt.hash(password, 10)

    // Crear institución
    const inst = await Institucion.create({
      nombre_institucion,
      codigo_dane,
      ciudad,
      departamento,
      direccion,
      telefono,
      jornada,
      correo,
      password: hash,        // tu migración guarda "password" en instituciones
    } as any)

    // Autologin del administrador (EP-01 → permitir iniciar sesión)
    const token = jwt.sign(
      { rol: 'administrador', id_institucion: inst.id_institucion },
      SECRET,
      { expiresIn: EXPIRES_IN }
    )

    return {
    institucion: {
    id_institucion: inst.id_institucion,
    nombre_institucion: inst.nombre_institucion,
    codigo_dane: inst.codigo_dane,
    ciudad: inst.ciudad,
    departamento: inst.departamento,
    direccion: inst.direccion,
    telefono: inst.telefono,
    jornada: inst.jornada,
    correo: inst.correo,
    password: inst.password,
    logo_url: inst.logo_url,
    is_active: inst.is_active,
    created_at: (inst as any).created_at,
    updated_at: (inst as any).updated_at,
  },
  token,
}
  }
}
