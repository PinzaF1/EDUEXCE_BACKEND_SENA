// app/services/ranking_service.ts
import Usuario from '../models/usuario.js'
import Sesion from '../models/sesione.js'

type Fila = { id_usuario: number; nombre: string; promedio: number }

export default class RankingService {
  /**
   * HU-01 / HU-02: Ranking general (últimos 30 días).
   * Si envías `id_usuario`, devuelve también su posición (1-based).
   */
  async rankingInstitucion(id_institucion: number, id_usuario?: number | string) {
    const { filas } = await this.buildFilas(id_institucion)

    const ordenado = this.ordenarConPosicion(filas)
    const top5 = ordenado.slice(0, 5).map(({ posicion, ...rest }) => rest)

    // 🔧 Corrección: normalizamos a Number para evitar null por tipo string
    const targetId =
      id_usuario === undefined || id_usuario === null || Number.isNaN(Number(id_usuario))
        ? null
        : Number(id_usuario)

    const posicion =
      targetId === null
        ? null
        : (ordenado.find((r) => Number(r.id_usuario) === targetId)?.posicion ?? null)

    return {
      top5,
      posicion,
      total: ordenado.length,
      posiciones: ordenado.map(({ id_usuario, nombre, promedio, posicion }) => ({
        id_usuario,
        nombre,
        promedio,
        posicion,
      })),
    }
  }

  /**
   * (Opcional) Ranking por curso (últimos 30 días).
   */
  async rankingCurso(
    id_institucion: number,
    curso: string,
    id_usuario?: number | string
  ) {
    const { filas } = await this.buildFilas(id_institucion, curso)

    const ordenado = this.ordenarConPosicion(filas)
    const top5 = ordenado.slice(0, 5).map(({ posicion, ...rest }) => rest)

    const targetId =
      id_usuario === undefined || id_usuario === null || Number.isNaN(Number(id_usuario))
        ? null
        : Number(id_usuario)

    const posicion =
      targetId === null
        ? null
        : (ordenado.find((r) => Number(r.id_usuario) === targetId)?.posicion ?? null)

    return {
      top5,
      posicion,
      total: ordenado.length,
      posiciones: ordenado.map(({ id_usuario, nombre, promedio, posicion }) => ({
        id_usuario,
        nombre,
        promedio,
        posicion,
      })),
    }
  }

  // ---------- Helpers privados ----------

  /** Construye filas con promedio por estudiante en los últimos 30 días */
  private async buildFilas(id_institucion: number, curso?: string) {
    const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000)

    const q = Usuario.query()
      .where('rol', 'estudiante')
      .where('id_institucion', id_institucion)
      .select(['id_usuario', 'nombre', 'apellido', 'numero_documento'])

    if (curso) q.where('curso', curso)

    const estudiantes = await q

    const filas: Fila[] = []
    for (const e of estudiantes) {
      const ses = await Sesion.query()
        .where('id_usuario', e.id_usuario)
        .where('inicio_at', '>=', desde as any)
        .select(['puntaje_porcentaje'])

      if (!ses.length) continue

      const avg = Math.round(
        ses.reduce((a, b) => a + (Number((b as any).puntaje_porcentaje) || 0), 0) / ses.length
      )

      const etiqueta =
        (e as any).nombre
          ? `${(e as any).nombre} ${(e as any).apellido ?? ''}`.trim()
          : ((e as any).apellido ?? String((e as any).numero_documento))

      filas.push({ id_usuario: Number(e.id_usuario), nombre: etiqueta, promedio: avg })
    }

    return { filas }
  }

  /** Ordena desc por promedio y agrega posición (1-based) */
  private ordenarConPosicion(filas: Fila[]) {
    const ordenado = [...filas].sort((a, b) => b.promedio - a.promedio)
    return ordenado.map((row, idx) => ({ ...row, posicion: idx + 1 }))
  }
}
