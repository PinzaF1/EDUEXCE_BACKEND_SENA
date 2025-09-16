import bcrypt from 'bcrypt'
import Usuario from '../models/usuario.js'
import Institucion from '../models/institucione.js'

export default class PerfilService {
  // Estudiante: puede editar correo, telefono, direccion, foto_perfil
  async actualizarPerfilEstudiante(id_usuario: number, d: {
    correo?: string|null
    telefono?: string|null
    direccion?: string|null
    foto_url?: string|null
  }) {
    const u = await Usuario.findOrFail(id_usuario)
    if (d.correo !== undefined) (u as any).correo = d.correo
    if (d.telefono !== undefined) (u as any).telefono = d.telefono
    if (d.direccion !== undefined) (u as any).direccion = d.direccion
    if (d.foto_url !== undefined) (u as any).foto_url = d.foto_url
    await u.save()
    return u
  }

  // Admin: puede editar datos de la institución (incluye logo_url)
  async actualizarInstitucion(id_institucion: number, d: {
    nombre_institucion?: string
    ciudad?: string
    departamento?: string
    direccion?: string
    telefono?: string
    jornada?: string
    logo_url?: string|null
  }) {
    const inst = await Institucion.findOrFail(id_institucion)
    if (d.nombre_institucion !== undefined) (inst as any).nombre_institucion = d.nombre_institucion
    if (d.ciudad !== undefined) (inst as any).ciudad = d.ciudad
    if (d.departamento !== undefined) (inst as any).departamento = d.departamento
    if (d.direccion !== undefined) (inst as any).direccion = d.direccion
    if (d.telefono !== undefined) (inst as any).telefono = d.telefono
    if (d.jornada !== undefined) (inst as any).jornada = d.jornada
    if (d.logo_url !== undefined) (inst as any).logo_url = d.logo_url
    await inst.save()
    return inst
  }

  // Cambio de contraseña dentro del sistema (estudiante)
  async cambiarPasswordEstudiante(id_usuario: number, actual: string, nueva: string) {
    const u = await Usuario.findOrFail(id_usuario)
    const ok = await bcrypt.compare(actual, u.password_hash)
    if (!ok) return false
    ;(u as any).password_hash = await bcrypt.hash(nueva, 10)
    await u.save()
    return true
  }

  // Cambio de contraseña dentro del sistema (admin)
  async cambiarPasswordAdmin(id_institucion: number, actual: string, nueva: string) {
    const inst = await Institucion.findOrFail(id_institucion)
    const ok = await bcrypt.compare(actual, (inst as any).password)
    if (!ok) return false
    ;(inst as any).password = await bcrypt.hash(nueva, 10)
    await inst.save()
    return true
  }
}
