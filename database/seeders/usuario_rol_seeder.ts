import { BaseSeeder } from '@adonisjs/lucid/seeders'

import bcrypt from 'bcrypt'
import Usuario from '../../app/models/usuario.js'

export default class UserSeeder extends BaseSeeder {
  public async run () {
    await Usuario.createMany([
      {
        // ADMINISTRADOR 
        correo: 'admin@institucion.edu.co',
        password_hash: await bcrypt.hash('Admin123*', 10),
        rol: 'administrador',
      },
      {
        // ESTUDIANTE
        numero_documento: '20000001',
        password_hash: await bcrypt.hash('20000001rez', 10), // documento + 3 últimas letras del apellido
        rol: 'estudiante',
      },
    ])
  }
}