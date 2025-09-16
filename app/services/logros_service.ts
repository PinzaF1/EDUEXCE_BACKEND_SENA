import Sesion from '../models/sesione.js'
import Reto from '../models/reto.js' // asumiendo que ya tienes este modelo

type Badge = { clave: string; nombre: string; descripcion: string; obtenido: boolean }

export default class LogrosService {
  // Genera colección de insignias derivando de sesiones y retos
  async obtenerInsignias(id_usuario: number) {
    const badges: Badge[] = [
      { clave: 'isla_matematicas', nombre: 'Isla Matemáticas', descripcion: 'Completó todos los subtemas de Matemáticas', obtenido: false },
      { clave: 'isla_lenguaje', nombre: 'Isla Lenguaje', descripcion: 'Completó todos los subtemas de Lenguaje', obtenido: false },
      { clave: 'isla_ciencias', nombre: 'Isla Ciencias', descripcion: 'Completó todos los subtemas de Ciencias', obtenido: false },
      { clave: 'isla_sociales', nombre: 'Isla Sociales', descripcion: 'Completó todos los subtemas de Sociales', obtenido: false },
      { clave: 'isla_ingles', nombre: 'Isla Inglés', descripcion: 'Completó todos los subtemas de Inglés', obtenido: false },
      { clave: 'guerrero', nombre: 'Guerrero', descripcion: 'Ganó un reto 1 vs 1', obtenido: false },
    ]

    // Heurística simple: si tiene simulacro (tipo=simulacro) por área => marcamos isla completada
    const ses = await Sesion.query().where('id_usuario', id_usuario)
    const tiene = (area: string) => ses.some(s => (s as any).tipo === 'simulacro' && (s as any).area === area)

    if (tiene('Matematicas')) badges.find(b=>b.clave==='isla_matematicas')!.obtenido = true
    if (tiene('Lenguaje')) badges.find(b=>b.clave==='isla_lenguaje')!.obtenido = true
    if (tiene('Ciencias')) badges.find(b=>b.clave==='isla_ciencias')!.obtenido = true
    if (tiene('Sociales')) badges.find(b=>b.clave==='isla_sociales')!.obtenido = true
    if (tiene('Ingles')) badges.find(b=>b.clave==='isla_ingles')!.obtenido = true

    // Guerrero: si figura como ganador en algún reto
    try {
      const retoGanado = await Reto.query().where('ganador_id', id_usuario).limit(1)
      if (retoGanado.length) badges.find(b=>b.clave==='guerrero')!.obtenido = true
    } catch {
      // si no tienes tabla retos aún, ignoramos
    }

    return badges
  }
}
