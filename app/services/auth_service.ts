import jwt, { Secret } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { DateTime } from 'luxon'
import Institucion from '../models/institucione.js'
import Usuario from '../models/usuario.js'

const SECRET: Secret = (process.env.JWT_SECRET ?? 'secret123') as Secret
const EXPIRES_IN: number = Number(process.env.JWT_EXPIRES_IN ?? 86400) // 1 día en segundos

export default class AuthService {
  // ADMIN: correo + contraseña (tabla instituciones)
  async loginAdministrador(correo: string, password: string) {
    const inst = await Institucion.findBy('correo', correo.trim().toLowerCase())
    if (!inst) return null

    // si manejas flag de activación en instituciones
    if ((inst as any).is_active === false) return null

    const ok = await bcrypt.compare(password, (inst as any).password)
    if (!ok) return null

    const token = jwt.sign(
      { rol: 'administrador', id_institucion: (inst as any).id_institucion },
      SECRET,
      { expiresIn: EXPIRES_IN }
    )

    // (opcional) registrar último acceso si tienes columnas
    if ((inst as any).updatedAt) await inst.save()

    return {
      admin: {
        id_institucion: (inst as any).id_institucion,
        nombre_institucion: (inst as any).nombre_institucion,
        correo: (inst as any).correo,
        logo_url: (inst as any).logo_url ?? null,
      },
      token,
      token_type: 'Bearer',
      expires_in: EXPIRES_IN,
      issued_at: DateTime.now().toISO(),
    }
  }

  // ESTUDIANTE: documento + contraseña (tabla usuarios)

async loginEstudiante(numero_documento: string, password: string) {
  console.log('Iniciando el login con el número de documento:', numero_documento);
  
  // Busca al estudiante por el número de documento
  const est = await Usuario.findBy('numero_documento', String(numero_documento).trim());
  console.log('Estudiante encontrado:', est);

  if (!est || (est as any).rol !== 'estudiante') {
    console.log('Estudiante no encontrado o el rol no es "estudiante"');
    return null;
  }

  // Si el estudiante está inactivo, retorna null
  if ((est as any).is_active === false) {
    console.log('El estudiante está inactivo');
    return null;
  }

  // Compara la contraseña con la almacenada en la base de datos
  const ok = await bcrypt.compare(password, (est as any).password_hash);
  console.log('Contraseña comparada:', ok);

  if (!ok) {
    console.log('La contraseña es incorrecta');
    return null;
  }

  // Actualiza los timestamps de actividad y último login
  (est as any).last_login_at = DateTime.now();
  (est as any).last_activity_at = DateTime.now();
  await est.save();

  console.log('Estudiante autenticado exitosamente, generando token');

  // Genera el token JWT para la autenticación
  const token = jwt.sign(
    {
      rol: 'estudiante',
      id_usuario: (est as any).id_usuario,
      id_institucion: (est as any).id_institucion ?? null,
    },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );

  // Retorna la información del estudiante junto con el token generado
  return {
    usuario: {
      id_usuario: (est as any).id_usuario,
      id_institucion: (est as any).id_institucion ?? null,
      nombre: (est as any).nombre,
      apellido: (est as any).apellido,
      curso: (est as any).curso ?? null,
      grado: (est as any).grado ?? null,
      jornada: (est as any).jornada ?? null,
      foto_url: (est as any).foto_url ?? null,
    },
    token,
    token_type: 'Bearer',
    expires_in: EXPIRES_IN,
    issued_at: DateTime.now().toISO(),
  };
}
}
