import bcrypt from 'bcrypt'
import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

export default class EstudiantesService {
  private claveInicial(numero_documento: string, apellido: string) {
    return `${numero_documento}${(apellido || '').toLowerCase().slice(-3)}`
  }

  // ⬇ ahora recibe y guarda 'nombre'
  async crearUno(d: {
    id_institucion: number
    tipo_documento: string
    numero_documento: string
    nombre: string
    apellido: string
    correo?: string | null
    direccion :string | null
    telefono :string | null
    grado?: string | null
    curso?: string | null
    jornada?: string | null
  }) {
    const plano = this.claveInicial(d.numero_documento, d.apellido)
    const hash = await bcrypt.hash(plano, 10)

    const u = await Usuario.updateOrCreate(
      {
        id_institucion: d.id_institucion,
        tipo_documento: d.tipo_documento,
        numero_documento: d.numero_documento,
      },
      {
        id_institucion: d.id_institucion,
        rol: 'estudiante',
        tipo_documento: d.tipo_documento,
        numero_documento: d.numero_documento,
        nombre: d.nombre,        // <-- importante
        apellido: d.apellido,
        correo: d.correo ?? null,
        direccion: d.direccion ?? null,
        telefono: d.telefono ?? null,
        grado: d.grado ?? null,
        curso: d.curso ?? null,
        jornada: d.jornada ?? null,
        password_hash: hash,
        is_active: true,
      } as any
    )
     return {
    id_usuario: u.id_usuario,
    usuario: d.numero_documento,
    password_temporal: plano,                // quítalo si no deseas exponerlo
    estudiante: {
      id_usuario: u.id_usuario,
      id_institucion: d.id_institucion,
      rol: 'estudiante',
      tipo_documento: d.tipo_documento,
      numero_documento: d.numero_documento,
      nombre: d.nombre,
      apellido: d.apellido,
      correo: d.correo ?? null,
      direccion: d.direccion ?? null,
      telefono: d.telefono ?? null,
      grado: d.grado ?? null,
      curso: d.curso ?? null,
      jornada: d.jornada ?? null,
      is_active: true,
      created_at: (u as any).created_at,
      updated_at: (u as any).updated_at,
    },
  }
}

  // Recibe filas parseadas (CSV/Excel). Mapeamos nombre/nombres y apellido/apellidos.
  async importarMasivo(id_institucion: number, filas: Array<any>) {
    const creados: number[] = []
    for (const f of filas) {
      const tipo_documento = String(f.tipo_documento || '').trim()
      const numero_documento = String(f.numero_documento || '').trim()
      const nombre = String(f.nombre ?? f.nombres ?? '').trim()
      const apellido = String(f.apellido ?? f.apellidos ?? '').trim()
      if (!tipo_documento || !numero_documento || !apellido || !nombre) continue

      const ya = await Usuario
        .query()
        .where('id_institucion', id_institucion)
        .where('numero_documento', numero_documento)
        .first()
      if (ya) continue

      const hash = await bcrypt.hash(this.claveInicial(numero_documento, apellido), 10)

      const u = await Usuario.create({
        id_institucion,
        rol: 'estudiante',
        tipo_documento,
        numero_documento,
        nombre,
        apellido,
        correo: f.correo ? String(f.correo).toLowerCase() : null,
        direccion: f.direccion ?? null,
        telefono: f.telefono ?? null,
        grado: f.grado ?? null,
        curso: f.curso ?? null,
        jornada: f.jornada ?? null,
        password_hash: hash,
        is_active: true,
      } as any)
      creados.push(u.id_usuario)
    }
    return { creados }
  }

  async listar(d: { id_institucion: number; grado?: string; curso?: string; jornada?: string; busqueda?: string }) {
    let q = Usuario.query().where('rol', 'estudiante').where('id_institucion', d.id_institucion)
    if (d.grado) q = q.where('grado', d.grado)
    if (d.curso) q = q.where('curso', d.curso)
    if (d.jornada) q = q.where('jornada', d.jornada)
    if (d.busqueda) {
      const s = `%${d.busqueda.toLowerCase()}%`
      q = q.where((builder) => {
        builder
          .whereILike('numero_documento', s)
          .orWhereILike('nombre', s)
          .orWhereILike('apellido', s)
          .orWhereILike('correo', s)
      })
    }
    return await q.orderBy('apellido', 'asc')
  }

  async editar(id_usuario: number, cambios: Partial<{
    correo: string | null
    direccion: string | null
    telefono: string | null
    grado: string | null
    curso: string | null
    jornada: string | null
    nombre: string | null
    apellido: string | null
    is_active: boolean
  }>) {
    const u = await Usuario.findOrFail(id_usuario)
    if (cambios.correo !== undefined) (u as any).correo = cambios.correo
    if (cambios.direccion !== undefined) (u as any).direccion = cambios.direccion
    if (cambios.telefono !== undefined) (u as any).telefono = cambios.telefono
    if (cambios.grado !== undefined) (u as any).grado = cambios.grado
    if (cambios.curso !== undefined) (u as any).curso = cambios.curso
    if (cambios.jornada !== undefined) (u as any).jornada = cambios.jornada
    if (cambios.nombre !== undefined) (u as any).nombre = cambios.nombre
    if (cambios.apellido !== undefined) (u as any).apellido = cambios.apellido
    if (cambios.is_active !== undefined) (u as any).is_active = cambios.is_active
    await u.save()
    return u
  }

  // Si tiene historial => inactivar; si no => eliminar
  async eliminarOInactivar(id_usuario: number) {
    const sesiones = await Sesion.query().where('id_usuario', id_usuario).limit(1)
    if (sesiones.length > 0) {
      const u = await Usuario.findOrFail(id_usuario)
      ;(u as any).is_active = false
      await u.save()
      return { estado: 'inactivado' as const }
    } else {
      const u = await Usuario.findOrFail(id_usuario)
      await u.delete()
      return { estado: 'eliminado' as const }
    }
  }
}
