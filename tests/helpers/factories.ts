// tests/helpers/factories.ts
import bcrypt from 'bcrypt'
import Institucion from '#models/institucione'
import Usuario from '#models/usuario'

/**
 * Factory: Crear institución de prueba
 */
export async function crearInstitucionPrueba(datos?: Partial<any>) {
  const timestamp = Date.now()
  const defaults = {
    nombre_institucion: 'Institución de Prueba',
    codigo_dane: `DANE${timestamp}`,
    correo: `test${timestamp}@institucion.test`,
    telefono: '1234567890',
    direccion: 'Calle Test 123',
    ciudad: 'Bogotá',
    departamento: 'Cundinamarca',
    jornada: 'Mañana',
    password: await bcrypt.hash('password123', 10),
    is_active: true,
  }

  return await Institucion.create({ ...defaults, ...datos })
}

/**
 * Factory: Crear estudiante de prueba
 */
export async function crearEstudiantePrueba(id_institucion: number, datos?: Partial<any>) {
  const timestamp = Date.now()
  const defaults = {
    id_institucion,
    rol: 'estudiante',
    tipo_documento: 'TI',
    numero_documento: `${timestamp}`,
    nombre: 'Estudiante',
    apellido: 'De Prueba',
    correo: `estudiante${timestamp}@test.com`,
    password_hash: await bcrypt.hash('password123', 10),
    grado: '10',
    curso: 'A',
    jornada: 'Mañana',
    is_active: true,
  }

  return await Usuario.create({ ...defaults, ...datos } as any)
}

/**
 * Factory: Crear administrador de prueba
 */
export async function crearAdminPrueba(id_institucion: number, datos?: Partial<any>) {
  const timestamp = Date.now()
  const defaults = {
    id_institucion,
    rol: 'administrador',
    tipo_documento: 'CC',
    numero_documento: `${timestamp}`,
    nombre: 'Admin',
    apellido: 'De Prueba',
    correo: `admin${timestamp}@test.com`,
    password_hash: await bcrypt.hash('password123', 10),
    is_active: true,
  }

  return await Usuario.create({ ...defaults, ...datos } as any)
}

/**
 * Helper: Limpiar base de datos de prueba
 */
export async function limpiarBaseDatos() {
  // Eliminar en orden inverso por foreign keys
  const db = (await import('@adonisjs/lucid/services/db')).default
  
  try {
    await db.rawQuery('DELETE FROM sesiones_detalles')
    await db.rawQuery('DELETE FROM sesiones')
    await db.rawQuery('DELETE FROM progreso_nivel')
    await db.rawQuery('DELETE FROM notificaciones')
    await db.rawQuery('DELETE FROM retos')
    await db.rawQuery('DELETE FROM kolb_resultados')
    await db.rawQuery('DELETE FROM estilos_aprendizajes')
    await db.rawQuery('DELETE FROM usuarios WHERE rol = ?', ['estudiante'])
    await db.rawQuery('DELETE FROM usuarios WHERE rol = ?', ['administrador'])
    await db.rawQuery('DELETE FROM instituciones WHERE correo LIKE ?', ['%@institucion.test'])
  } catch (error) {
    // Ignorar errores de tablas que no existen (opcional en tests)
    console.log('Advertencia al limpiar BD:', (error as Error).message)
  }
}

