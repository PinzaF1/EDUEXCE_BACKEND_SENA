// app/services/perfil_service.ts
import bcrypt from 'bcrypt'
import Usuario from '../models/usuario.js'
import Institucion from '../models/institucione.js'

export default class PerfilService {
  // ===== NUEVO: verInstitucion (lo que pide tu AdminController) =====
  async verInstitucion(id_institucion: number) {
    if (!id_institucion) throw new Error('id_institucion requerido')

    // Trae SOLO campos públicos (no password)
    const inst = await Institucion
      .query()
      .select(
        'id_institucion',
        'nombre_institucion',
        'codigo_dane',
        'ciudad',
        'departamento',
        'direccion',
        'telefono',
        'jornada',
        'correo',
        'logo_url' // si no existe en tu esquema, quítalo
      )
      .where('id_institucion', id_institucion)
      .first()

    if (!inst) throw new Error('Institución no encontrada')

    return { institucion: inst }
  }

  // Estudiante: puede editar correo, telefono, direccion, foto_perfil
  async actualizarPerfilEstudiante(id_usuario: number, d: {
    correo?: string|null
    telefono?: string|null
    direccion?: string|null
    foto_url?: string|null
  }) {
    const u = await Usuario.findOrFail(id_usuario)
    if (d.correo !== undefined)   (u as any).correo   = d.correo
    if (d.telefono !== undefined) (u as any).telefono = d.telefono
    if (d.direccion !== undefined)(u as any).direccion= d.direccion
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
    if (d.ciudad !== undefined)             (inst as any).ciudad             = d.ciudad
    if (d.departamento !== undefined)       (inst as any).departamento       = d.departamento
    if (d.direccion !== undefined)          (inst as any).direccion          = d.direccion
    if (d.telefono !== undefined)           (inst as any).telefono           = d.telefono
    if (d.jornada !== undefined)            (inst as any).jornada            = d.jornada
    if (d.logo_url !== undefined)           (inst as any).logo_url           = d.logo_url
    await inst.save()
    return inst
  }

  // Cambio de contraseña dentro del sistema (estudiante)
  async cambiarPasswordEstudiante(id_usuario: number, actual: string, nueva: string) {
    const u = await Usuario.findOrFail(id_usuario)

    // Ajusta el nombre del campo según tu modelo (password_hash / password)
    const hashActual = (u as any).password_hash
    if (!hashActual) throw new Error('Campo password_hash no existe en Usuario')

    const ok = await bcrypt.compare(actual, hashActual)
    if (!ok) return false

    ;(u as any).password_hash = await bcrypt.hash(nueva, 10)
    await u.save()
    return true
  }

  // Cambio de contraseña dentro del sistema (admin)
  async cambiarPasswordAdmin(id_institucion: number, actual: string, nueva: string) {
    const inst = await Institucion.findOrFail(id_institucion)

    // Ajusta el nombre del campo según tu modelo (password / password_hash)
    const hashActual = (inst as any).password
    if (!hashActual) throw new Error('Campo password no existe en Institucion')

    const ok = await bcrypt.compare(actual, hashActual)
    if (!ok) return false

    ;(inst as any).password = await bcrypt.hash(nueva, 10)
    await inst.save()
    return true
  }
}
