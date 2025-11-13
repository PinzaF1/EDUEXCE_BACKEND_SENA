// app/services/sincronizacion_service.ts
import ProgresoNivel from '../models/progreso_nivel.js'
import { DateTime } from 'luxon'

type Area = 'Matematicas' | 'Lenguaje' | 'Ciencias' | 'Sociales' | 'Ingles'

// Normaliza nombre de área
const canonArea = (raw?: string | null): Area | null => {
  const s = String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  if (s.startsWith('mate')) return 'Matematicas'
  if (s.startsWith('leng') || s.startsWith('lect')) return 'Lenguaje'
  if (s.startsWith('cien')) return 'Ciencias'
  if (s.startsWith('soci')) return 'Sociales'
  if (s.startsWith('ing')) return 'Ingles'
  return null
}

// Mapeo de niveles a subtemas por área (igual que sesiones_service.ts)
const SUBTEMAS_POR_AREA: Record<Area, string[]> = {
  Matematicas: [
    'Operaciones con números enteros',
    'Razones y proporciones',
    'Regla de tres simple y compuesta',
    'Porcentajes y tasas (aumento, descuento, interés simple)',
    'Ecuaciones lineales y sistemas 2×2',
  ],
  Lenguaje: [
    'Comprensión lectora (sentido global y local)',
    'Conectores lógicos (causa, contraste, condición, secuencia)',
    'Identificación de argumentos y contraargumentos',
    'Idea principal y propósito comunicativo',
    'Hecho vs. opinión e inferencias',
  ],
  Ciencias: [
    'Indagación científica (variables, control e interpretación de datos)',
    'Fuerzas, movimiento y energía',
    'Materia y cambios (mezclas, reacciones y conservación)',
    'Genética y herencia',
    'Ecosistemas y cambio climático (CTS)',
  ],
  Sociales: [
    'Constitución de 1991 y organización del Estado',
    'Historia de Colombia (Frente Nacional, conflicto y paz)',
    'Guerras Mundiales y Guerra Fría',
    'Geografía de Colombia (mapas, territorio y ambiente)',
    'Economía y ciudadanía económica (globalización y desigualdad)',
  ],
  Ingles: [
    'Verb to be (am, is, are)',
    'Present Simple (afirmación, negación y preguntas)',
    'Past Simple (verbos regulares e irregulares)',
    'Comparatives and superlatives',
    'Subject/Object pronouns y possessive adjectives',
  ],
}

// Obtener el subtema correcto para un nivel específico de un área
function obtenerSubtemaPorNivel(area: Area, nivel: number): string | null {
  const subtemas = SUBTEMAS_POR_AREA[area]
  if (!subtemas || nivel < 1 || nivel > subtemas.length) return null
  return subtemas[nivel - 1] // Los niveles son 1-indexed, el array es 0-indexed
}

export default class SincronizacionService {
  /**
   * Obtiene niveles desbloqueados por área para un usuario
   * Retorna: { "Matematicas": 3, "Lenguaje": 2, ... }
   * Busca el nivel más alto superado o en_curso por área y retorna nivel + 1 como desbloqueado
   * IMPORTANTE: Busca solo registros con subtemas REALES (no "Nivel Global")
   */
  async obtenerNivelesDesbloqueados(id_usuario: number): Promise<Record<string, number>> {
    console.log(`[SincronizacionService] obtenerNivelesDesbloqueados - id_usuario: ${id_usuario}`)
    
    // DEBUG: Buscar TODOS los registros del usuario para ver qué hay
    const todosLosRegistros = await ProgresoNivel.query()
      .where('id_usuario', id_usuario)
      .orderBy('area')
      .orderBy('nivel_orden', 'desc')
    
    console.log(`[SincronizacionService] Total registros encontrados para usuario ${id_usuario}: ${todosLosRegistros.length}`)
    for (const reg of todosLosRegistros) {
      console.log(`[SincronizacionService] Registro: id_progreso=${(reg as any).id_progreso}, area=${(reg as any).area}, subtema="${(reg as any).subtema}", nivel_orden=${(reg as any).nivel_orden}, estado="${(reg as any).estado}"`)
    }
    
    const nivelesPorArea: Record<string, number> = {
      Matematicas: 1,
      Lenguaje: 1,
      Ciencias: 1,
      Sociales: 1,
      Ingles: 1,
    }

    // Buscar el nivel más alto superado o en_curso por área usando subtemas REALES
    const maxNivelPorArea: Record<string, number> = {}
    const nivelEnCursoPorArea: Record<string, number> = {}

    // Buscar TODOS los registros por área (excluyendo "Nivel Global")
    // Almacenar registrosPorNivel por área para usar después
    const registrosPorAreaYNivel: Record<string, Record<number, any>> = {}
    
    for (const area of ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles'] as Area[]) {
      // Buscar todos los registros del área (excluyendo "Nivel Global")
      // IMPORTANTE: Ordenar por nivel_orden DESC y luego por ultima_vez DESC para obtener el más reciente
      const progresosTodos = await ProgresoNivel.query()
        .where('id_usuario', id_usuario)
        .where('area', area)
        .whereNot('subtema', `Nivel Global ${area}`)
        .orderBy('nivel_orden', 'desc')
        .orderBy('ultima_vez', 'desc')
        .orderBy('created_at', 'desc')

      console.log(`[SincronizacionService] Registros con subtemas reales para ${area}: ${progresosTodos.length}`)
      
      // CRÍTICO: Agrupar por nivel_orden y tomar el registro MÁS RECIENTE para cada nivel
      // Esto evita problemas cuando hay múltiples registros del mismo nivel (historial completo)
      const registrosPorNivel: Record<number, any> = {}
      
      for (const p of progresosTodos) {
        const nivel = Number((p as any).nivel_orden || 1)
        const ultimaVez = (p as any).ultima_vez || (p as any).created_at || null
        
        // Si no hay registro para este nivel o este es más reciente, usar este
        if (!registrosPorNivel[nivel]) {
          registrosPorNivel[nivel] = p
        } else {
          const ultimaVezExistente = registrosPorNivel[nivel].ultima_vez || registrosPorNivel[nivel].created_at || null
          if (ultimaVez && (!ultimaVezExistente || new Date(ultimaVez) > new Date(ultimaVezExistente))) {
            registrosPorNivel[nivel] = p
          }
        }
      }
      
      // Guardar registrosPorNivel para esta área
      registrosPorAreaYNivel[area] = registrosPorNivel
      
      // Procesar los registros más recientes de cada nivel
      for (const nivel of Object.keys(registrosPorNivel).map(Number).sort((a, b) => b - a)) {
        const p = registrosPorNivel[nivel]
        const estado = String((p as any).estado || '')
        const subtema = String((p as any).subtema || '')
        const vidas = Number((p as any).vidas_actuales ?? 3)
        const intentos = Number((p as any).intentos || 0)
        
        console.log(`[SincronizacionService]   - Nivel ${nivel} (MÁS RECIENTE), estado: ${estado}, subtema: "${subtema}", vidas: ${vidas}, intentos: ${intentos}`)
        
        // CRÍTICO: Si el nivel tiene 0 vidas (3 intentos fallidos), NO desbloquear este nivel
        // El nivel debe estar bloqueado y retroceder al nivel anterior
        if (vidas === 0 && estado === 'finalizado') {
          console.log(`[SincronizacionService]   ⚠ Nivel ${nivel} bloqueado por 3 intentos fallidos (vidas = 0). No se desbloquea.`)
          // No agregar este nivel a nivelEnCursoPorArea ni maxNivelPorArea
          // Esto significa que el nivel está bloqueado
          continue
        }
        
        // CRÍTICO: Lógica de desbloqueo corregida
        // 1. 'en_curso': nivel recién desbloqueado (aún no intentado) → ese nivel está desbloqueado
        // 2. 'superado': nivel aprobado → ese nivel está desbloqueado Y desbloquea el siguiente
        // 3. 'finalizado': nivel intentado pero no aprobado → ese nivel sigue disponible pero NO desbloquea el siguiente
        
        // CRÍTICO: Verificar que el nivel NO esté bloqueado antes de desbloquearlo
        // Un nivel está bloqueado si:
        // 1. Tiene vidas = 0 Y estado = 'finalizado' (3 intentos fallidos)
        // 2. Tiene vidas = 0 incluso si estado = 'en_curso' o 'superado' (error de datos, pero debemos manejarlo)
        const estaBloqueado = (vidas === 0)
        
        if (estado === 'en_curso' && !estaBloqueado) {
          // Nivel recién desbloqueado (aún no intentado) Y no está bloqueado (tiene vidas > 0)
          const currentEnCurso = nivelEnCursoPorArea[area] || 0
          if (nivel > currentEnCurso) {
            nivelEnCursoPorArea[area] = nivel
            console.log(`[SincronizacionService]   → Nivel en_curso encontrado para ${area}: ${nivel} (recién desbloqueado, vidas=${vidas}, no bloqueado)`)
          }
          // También actualiza el máximo si es mayor
          const currentMax = maxNivelPorArea[area] || 0
          if (nivel > currentMax) {
            maxNivelPorArea[area] = nivel
            console.log(`[SincronizacionService]   → Nivel en_curso también actualiza máximo para ${area}: ${nivel}`)
          }
        } else if (estado === 'en_curso' && estaBloqueado) {
          // Nivel 'en_curso' pero con vidas = 0 (error de datos, pero debe bloquearse)
          console.log(`[SincronizacionService]   ⚠ Nivel en_curso ${nivel} tiene vidas = 0 (error de datos). No se desbloquea.`)
        }
        
        // Buscar nivel máximo superado (solo estos desbloquean el siguiente nivel)
        // Los niveles 'finalizado' NO desbloquean el siguiente, solo el 'superado' lo hace
        // IMPORTANTE: Solo considerar niveles NO bloqueados (vidas > 0)
        if (estado === 'superado' && !estaBloqueado) {
          const currentMax = maxNivelPorArea[area] || 0
          if (nivel > currentMax) {
            maxNivelPorArea[area] = nivel
            console.log(`[SincronizacionService]   → Nivel máximo superado actualizado para ${area}: ${nivel} (desbloquea siguiente, vidas=${vidas}, no bloqueado)`)
          }
        } else if (estado === 'superado' && estaBloqueado) {
          // Nivel 'superado' pero con vidas = 0 (error de datos, pero debe bloquearse)
          console.log(`[SincronizacionService]   ⚠ Nivel superado ${nivel} tiene vidas = 0 (error de datos). No se desbloquea.`)
        }
      }
    }
    
    // Calcular nivel desbloqueado
    // LÓGICA CORREGIDA:
    // 1. Si hay un nivel 'en_curso', ese nivel está desbloqueado (es el nivel actual, recién desbloqueado)
    // 2. Si el nivel más alto está 'superado' (y no hay 'en_curso'), el siguiente nivel está desbloqueado
    // 3. Si solo hay niveles 'finalizado' (no 'superado' ni 'en_curso'), el nivel más alto sigue disponible
    // 4. Si no hay ningún progreso, el nivel 1 está desbloqueado (por defecto)
    for (const area of ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles'] as Area[]) {
      const nivelEnCurso = nivelEnCursoPorArea[area]
      const maxNivelSuperado = maxNivelPorArea[area] || 0
      const registrosPorNivel = registrosPorAreaYNivel[area] || {}
      
      // Buscar el nivel más alto de cualquier estado (para casos donde solo hay 'finalizado')
      // CRÍTICO: Excluir niveles bloqueados (vidas = 0, 3 intentos fallidos)
      let nivelMasAltoCualquierEstado = 0
      for (const nivel of Object.keys(registrosPorNivel).map(Number).sort((a, b) => b - a)) {
        const p = registrosPorNivel[nivel]
        const vidas = Number((p as any).vidas_actuales ?? 3)
        const estado = String((p as any).estado || '')
        
        // NO incluir niveles bloqueados (vidas = 0 y estado = 'finalizado')
        if (vidas === 0 && estado === 'finalizado') {
          console.log(`[SincronizacionService]   ⚠ Nivel ${nivel} bloqueado (vidas = 0), excluido de nivelMasAltoCualquierEstado`)
          continue // Saltar este nivel bloqueado
        }
        
        if (nivel > nivelMasAltoCualquierEstado) {
          nivelMasAltoCualquierEstado = nivel
          break // Solo el más alto
        }
      }
      
      // CRÍTICO: Verificar que los niveles encontrados NO estén bloqueados (vidas = 0)
      // Si nivelEnCurso o maxNivelSuperado tienen vidas = 0, deben retrocederse
      let nivelEnCursoVerificado = nivelEnCurso
      let maxNivelSuperadoVerificado = maxNivelSuperado
      
      // Verificar nivelEnCurso: si tiene vidas = 0, no está disponible (bloqueado)
      let nivelRetrocedidoEnCurso = null as number | null
      if (nivelEnCursoVerificado) {
        const registroEnCurso = registrosPorNivel[nivelEnCursoVerificado]
        if (registroEnCurso) {
          const vidasEnCurso = Number((registroEnCurso as any).vidas_actuales ?? 3)
          // CRÍTICO: Si tiene vidas = 0, está bloqueado (sin importar el estado)
          if (vidasEnCurso === 0) {
            const nivelBloqueado = nivelEnCursoVerificado
            console.log(`[SincronizacionService]   ⚠ Nivel en_curso ${nivelBloqueado} está bloqueado (vidas = 0). No se desbloquea.`)
            nivelEnCursoVerificado = null
            // Buscar el siguiente nivel no bloqueado retrocediendo
            for (let n = nivelBloqueado - 1; n >= 1; n--) {
              const reg = registrosPorNivel[n]
              if (reg) {
                const v = Number((reg as any).vidas_actuales ?? 3)
                if (v > 0) {
                  nivelRetrocedidoEnCurso = n
                  console.log(`[SincronizacionService]   → Retrocediendo a nivel ${nivelRetrocedidoEnCurso} (nivel ${nivelBloqueado} bloqueado)`)
                  break
                }
              } else {
                // Si no hay registro, el nivel está disponible (por defecto tiene 3 vidas)
                nivelRetrocedidoEnCurso = n
                console.log(`[SincronizacionService]   → Retrocediendo a nivel ${nivelRetrocedidoEnCurso} (nivel ${nivelBloqueado} bloqueado, sin registro previo)`)
                break
              }
            }
            // Si no se encontró ningún nivel disponible, usar nivel 1 por defecto
            if (nivelRetrocedidoEnCurso === null || nivelRetrocedidoEnCurso <= 0) {
              nivelRetrocedidoEnCurso = 1
              console.log(`[SincronizacionService]   → No se encontró nivel disponible, retrocediendo a nivel 1 por defecto`)
            }
          }
        }
      }
      
      // Verificar maxNivelSuperado: si tiene vidas = 0, no está disponible (bloqueado)
      if (maxNivelSuperadoVerificado > 0) {
        const registroSuperado = registrosPorNivel[maxNivelSuperadoVerificado]
        if (registroSuperado) {
          const vidasSuperado = Number((registroSuperado as any).vidas_actuales ?? 3)
          // CRÍTICO: Si tiene vidas = 0, está bloqueado (sin importar el estado)
          if (vidasSuperado === 0) {
            console.log(`[SincronizacionService]   ⚠ Nivel superado ${maxNivelSuperadoVerificado} está bloqueado (vidas = 0). No se desbloquea.`)
            // Buscar el siguiente nivel no bloqueado retrocediendo
            for (let n = maxNivelSuperadoVerificado - 1; n >= 1; n--) {
              const reg = registrosPorNivel[n]
              if (reg) {
                const v = Number((reg as any).vidas_actuales ?? 3)
                if (v > 0) {
                  maxNivelSuperadoVerificado = n
                  console.log(`[SincronizacionService]   → Retrocediendo a nivel ${maxNivelSuperadoVerificado} (nivel ${maxNivelSuperadoVerificado + 1} bloqueado)`)
                  break
                }
              } else {
                // Si no hay registro, el nivel está disponible (por defecto tiene 3 vidas)
                maxNivelSuperadoVerificado = n
                console.log(`[SincronizacionService]   → Retrocediendo a nivel ${maxNivelSuperadoVerificado} (nivel ${maxNivelSuperadoVerificado + 1} bloqueado, sin registro previo)`)
                break
              }
            }
          }
        }
      }
      
      console.log(`[SincronizacionService] Área ${area}: nivelEnCurso=${nivelEnCursoVerificado || 'null'}, nivelRetrocedidoEnCurso=${nivelRetrocedidoEnCurso || 'null'}, maxNivelSuperado=${maxNivelSuperadoVerificado}, nivelMasAltoCualquierEstado=${nivelMasAltoCualquierEstado}`)
      
      if (nivelEnCursoVerificado) {
        // Si hay un nivel 'en_curso' y NO está bloqueado, ese nivel está desbloqueado
        nivelesPorArea[area] = Math.min(nivelEnCursoVerificado, 6)
        console.log(`[SincronizacionService] Área ${area}: Retornando nivel ${nivelesPorArea[area]} (en_curso - recién desbloqueado, no bloqueado)`)
      } else if (nivelRetrocedidoEnCurso !== null && nivelRetrocedidoEnCurso > 0) {
        // Si se retrocedió desde un nivel en_curso bloqueado, usar el nivel retrocedido
        nivelesPorArea[area] = Math.min(nivelRetrocedidoEnCurso, 6)
        console.log(`[SincronizacionService] Área ${area}: Retornando nivel ${nivelesPorArea[area]} (retrocedido desde nivel bloqueado)`)
      } else if (maxNivelSuperadoVerificado > 0) {
        // Si hay un nivel 'superado' y NO está bloqueado, el siguiente nivel está desbloqueado
        const siguienteNivel = maxNivelSuperadoVerificado + 1
        nivelesPorArea[area] = Math.min(siguienteNivel, 6)
        console.log(`[SincronizacionService] Área ${area}: Retornando nivel ${nivelesPorArea[area]} (maxNivel ${maxNivelSuperadoVerificado} superado + 1 = ${siguienteNivel}, no bloqueado)`)
      } else if (nivelMasAltoCualquierEstado > 0) {
        // Si solo hay niveles 'finalizado' (no 'superado' ni 'en_curso'), ese nivel sigue disponible
        // PERO no desbloquea el siguiente (el usuario debe aprobar ese nivel primero)
        // CRÍTICO: Verificar que NO esté bloqueado (vidas = 0)
        const registroMasAlto = registrosPorNivel[nivelMasAltoCualquierEstado]
        if (registroMasAlto) {
          const vidasMasAlto = Number((registroMasAlto as any).vidas_actuales ?? 3)
          // CRÍTICO: Si tiene vidas = 0, está bloqueado (sin importar el estado)
          if (vidasMasAlto === 0) {
            // Nivel bloqueado, retroceder al anterior con vidas > 0
            let nivelDisponible = 0
            for (let n = nivelMasAltoCualquierEstado - 1; n >= 1; n--) {
              const reg = registrosPorNivel[n]
              if (reg) {
                const v = Number((reg as any).vidas_actuales ?? 3)
                if (v > 0) {
                  nivelDisponible = n
                  break
                }
              } else {
                // Si no hay registro, el nivel está disponible (por defecto tiene 3 vidas)
                nivelDisponible = n
                break
              }
            }
            nivelesPorArea[area] = Math.max(1, nivelDisponible)
            console.log(`[SincronizacionService] Área ${area}: Nivel ${nivelMasAltoCualquierEstado} bloqueado (vidas = 0), retrocediendo a nivel ${nivelesPorArea[area]}`)
          } else {
            nivelesPorArea[area] = Math.min(nivelMasAltoCualquierEstado, 6)
            console.log(`[SincronizacionService] Área ${area}: Retornando nivel ${nivelesPorArea[area]} (nivel más alto disponible: ${nivelMasAltoCualquierEstado}, vidas=${vidasMasAlto}, pero no desbloquea siguiente hasta aprobar)`)
          }
        } else {
          nivelesPorArea[area] = Math.min(nivelMasAltoCualquierEstado, 6)
          console.log(`[SincronizacionService] Área ${area}: Retornando nivel ${nivelesPorArea[area]} (nivel más alto disponible: ${nivelMasAltoCualquierEstado})`)
        }
      } else {
        // Si no hay ningún progreso, el nivel 1 está desbloqueado (por defecto)
        nivelesPorArea[area] = 1
        console.log(`[SincronizacionService] Área ${area}: Retornando nivel 1 (por defecto - sin registros)`)
      }
    }

    console.log(`[SincronizacionService] Niveles desbloqueados finales:`, nivelesPorArea)
    return nivelesPorArea
  }

  /**
   * Actualiza el nivel desbloqueado para un área
   */
  async actualizarNivelDesbloqueado(
    id_usuario: number,
    area: string,
    nivel: number
  ): Promise<void> {
    console.log(`[SincronizacionService] actualizarNivelDesbloqueado - id_usuario: ${id_usuario}, area: "${area}", nivel: ${nivel}`)
    
    // Validar id_usuario (NO debe ser 0)
    if (!id_usuario || id_usuario <= 0) {
      console.error(`[SincronizacionService] ERROR: id_usuario inválido: ${id_usuario}`)
      throw new Error('id_usuario inválido')
    }
    
    const areaCanon = canonArea(area)
    console.log(`[SincronizacionService] Área canonizada: "${areaCanon}"`)
    
    if (!areaCanon || nivel < 1 || nivel > 6) {
      console.log(`[SincronizacionService] ERROR: Validación falló - areaCanon: ${areaCanon}, nivel: ${nivel}`)
      return
    }

    // Obtener el subtema REAL del nivel
    const subtemaReal = obtenerSubtemaPorNivel(areaCanon, nivel)
    if (!subtemaReal) {
      console.error(`[SincronizacionService] ERROR: No se pudo obtener subtema para área ${areaCanon}, nivel ${nivel}`)
      return
    }
    
    const subtema = subtemaReal
    console.log(`[SincronizacionService] Subtema REAL del nivel ${nivel}: "${subtema}"`)

    // BÚSQUEDA EXHAUSTIVA: Buscar TODOS los registros del usuario para este área y nivel
    const subtemaNormalizado = String(subtema).trim()
    console.log(`[SincronizacionService] Buscando registro existente para id_usuario=${id_usuario}, area="${areaCanon}", nivel=${nivel}`)
    
    // Estrategia 1: Búsqueda normalizada (igual que sesiones_service.ts)
    let existing = await ProgresoNivel.query()
      .where('id_usuario', id_usuario)
      .andWhere('area', areaCanon)
      .whereRaw('LOWER(TRIM(subtema)) = LOWER(?)', [subtemaNormalizado])
      .andWhere('nivel_orden', nivel)
      .first()
    
    // Estrategia 2: Búsqueda exacta (igual que sesiones_service.ts)
    if (!existing) {
      console.log(`[SincronizacionService] Búsqueda normalizada no encontró registro, intentando búsqueda exacta`)
      existing = await ProgresoNivel.query()
        .where('id_usuario', id_usuario)
        .andWhere('area', areaCanon)
        .andWhere('subtema', subtema)
        .andWhere('nivel_orden', nivel)
        .first()
    }
    
    // Estrategia 3: Buscar TODOS los registros del usuario para este área y nivel (debug)
    if (!existing) {
      console.log(`[SincronizacionService] Búsqueda exacta no encontró registro, buscando TODOS los registros del usuario para debug`)
      const allRecords = await ProgresoNivel.query()
        .where('id_usuario', id_usuario)
        .andWhere('area', areaCanon)
        .andWhere('nivel_orden', nivel)
        .exec()
      
      console.log(`[SincronizacionService] Encontrados ${Array.isArray(allRecords) ? allRecords.length : 0} registros para id_usuario=${id_usuario}, area="${areaCanon}", nivel=${nivel}`)
      
      if (Array.isArray(allRecords) && allRecords.length > 0) {
        console.log(`[SincronizacionService] Registros encontrados:`)
        allRecords.forEach((r: any, i: number) => {
          console.log(`[SincronizacionService]   ${i + 1}. id_progreso=${r.id_progreso}, subtema="${r.subtema}", nivel_orden=${r.nivel_orden}`)
        })
        
        // Buscar manualmente cualquier registro que coincida con el subtema real (normalizado)
        existing = allRecords.find((r: any) => {
          const rSubtema = String(r.subtema || '').trim().toLowerCase()
          const targetSubtema = subtemaNormalizado.trim().toLowerCase()
          return rSubtema === targetSubtema
        }) || null
        
        // Si hay solo un registro, usarlo
        if (!existing && allRecords.length === 1) {
          existing = allRecords[0]
          console.log(`[SincronizacionService] Usando único registro encontrado: id_progreso=${(existing as any).id_progreso}, subtema="${(existing as any).subtema}"`)
        }
        
        if (existing) {
          console.log(`[SincronizacionService] ✓ Registro encontrado manualmente: id_progreso=${(existing as any).id_progreso}, subtema="${(existing as any).subtema}"`)
        }
      }
    }
    
    console.log(`[SincronizacionService] Registro existente: ${existing ? `Sí (id: ${(existing as any).id_progreso}, estado: ${(existing as any).estado}, nivel_orden: ${(existing as any).nivel_orden}, subtema: "${(existing as any).subtema}")` : 'No'}`)
    
    const existingExact = existing

    if (existingExact) {
      // Si existe, actualizar estado y ultima_vez (igual que sesiones_service.ts)
      // Si existingExact es un objeto plano de SQL, necesitamos cargarlo primero
      if (!(existingExact instanceof ProgresoNivel) && (existingExact as any).id_progreso) {
        const loaded = await ProgresoNivel.find((existingExact as any).id_progreso)
        if (loaded) {
          existingExact = loaded
        }
      }
      
      console.log(`[SincronizacionService] Actualizando registro existente a estado 'en_curso'`)
      await (existingExact as any).merge({ 
        estado: 'en_curso',
        ultima_vez: DateTime.now()
      }).save()
      console.log(`[SincronizacionService] ✓ Registro actualizado exitosamente`)
    } else {
      // Crear nuevo registro (igual que sesiones_service.ts - sin try-catch inicial, solo si falla)
      console.log(`[SincronizacionService] Creando nuevo registro: area=${areaCanon}, subtema="${subtema}", nivel=${nivel}, estado='en_curso'`)
      
      try {
        await ProgresoNivel.create({
          id_usuario,
          area: areaCanon,
          subtema: subtemaNormalizado,
          nivel_orden: nivel,
          estado: 'en_curso',
          preguntas_por_intento: 5,
          aciertos_minimos: 4,
          max_intentos_antes_retroceso: 3,
          intentos: 0,
          vidas_actuales: 3, // Inicia con 3 vidas
          ultima_recarga: null,
          ultima_lectura_detalle: null,
          ultima_vez: DateTime.now(),
          id_sesion: null, // Sincronización no tiene sesión asociada
        } as any)
        console.log(`[SincronizacionService] ✓ Registro creado exitosamente`)
      } catch (error: any) {
        // Si falla por constraint único, buscar y actualizar con BÚSQUEDA EXHAUSTIVA
        if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('unique constraint')) {
          console.log(`[SincronizacionService] Constraint único detectado - buscando registro existente con BÚSQUEDA EXHAUSTIVA`)
          
          // CRÍTICO: El constraint único está bloqueando, significa que YA EXISTE un registro
          // Buscar TODOS los registros del usuario para este área y nivel SIN filtrar por subtema
          const allRecords = await ProgresoNivel.query()
            .where('id_usuario', id_usuario)
            .andWhere('area', areaCanon)
            .andWhere('nivel_orden', nivel)
            .exec()
          
          console.log(`[SincronizacionService] Encontrados ${Array.isArray(allRecords) ? allRecords.length : 0} registros después de constraint para id_usuario=${id_usuario}, area="${areaCanon}", nivel=${nivel}`)
          
          // DEBUG: Mostrar todos los registros encontrados
          if (Array.isArray(allRecords) && allRecords.length > 0) {
            allRecords.forEach((r: any, i: number) => {
              console.log(`[SincronizacionService]   Registro ${i + 1}: id_progreso=${r.id_progreso}, subtema="${r.subtema}", estado="${r.estado}", id_sesion=${r.id_sesion || 'NULL'}, ultima_vez="${r.ultima_vez || 'NULL'}"`)
            })
          }
          
          let registroExistente = null
          
          // Estrategia 1: Si hay registros, usar el MÁS RECIENTE (por ultima_vez)
          // Esto es lo más seguro porque el constraint único está bloqueando, entonces debe existir al menos uno
          if (Array.isArray(allRecords) && allRecords.length > 0) {
            // Ordenar por ultima_vez descendente y tomar el más reciente
            const sortedRecords = allRecords.sort((a: any, b: any) => {
              const aFecha = a.ultima_vez ? new Date(a.ultima_vez).getTime() : 0
              const bFecha = b.ultima_vez ? new Date(b.ultima_vez).getTime() : 0
              return bFecha - aFecha
            })
            registroExistente = sortedRecords[0]
            console.log(`[SincronizacionService] Usando registro más reciente: id_progreso=${(registroExistente as any).id_progreso}, subtema="${(registroExistente as any).subtema}", ultima_vez="${(registroExistente as any).ultima_vez}"`)
          }
          
          // Estrategia 2: Si no encontró con el más reciente, buscar por subtema normalizado
          if (!registroExistente) {
            registroExistente = await ProgresoNivel.query()
              .where('id_usuario', id_usuario)
              .andWhere('area', areaCanon)
              .whereRaw('LOWER(TRIM(subtema)) = LOWER(?)', [subtemaNormalizado])
              .andWhere('nivel_orden', nivel)
              .first()
          }
          
          // Estrategia 3: Búsqueda exacta
          if (!registroExistente) {
            registroExistente = await ProgresoNivel.query()
              .where('id_usuario', id_usuario)
              .andWhere('area', areaCanon)
              .andWhere('subtema', subtema)
              .andWhere('nivel_orden', nivel)
              .first()
          }
          
          // Estrategia 4: Buscar manualmente en todos los registros por subtema real (comparación flexible)
          if (!registroExistente && Array.isArray(allRecords) && allRecords.length > 0) {
            registroExistente = allRecords.find((r: any) => {
              const rSubtema = String(r.subtema || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              const targetSubtema = subtemaNormalizado.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              return rSubtema === targetSubtema
            }) || null
          }
          
          // Estrategia 5: Si aún no encontró, usar CUALQUIER registro del nivel (el constraint indica que existe)
          if (!registroExistente && Array.isArray(allRecords) && allRecords.length > 0) {
            registroExistente = allRecords[0]
            console.log(`[SincronizacionService] Usando cualquier registro encontrado (fallback): id_progreso=${(registroExistente as any).id_progreso}, subtema="${(registroExistente as any).subtema}"`)
          }
          
          if (registroExistente) {
            // Cargar el registro completo si es necesario
            if (!(registroExistente instanceof ProgresoNivel) && (registroExistente as any).id_progreso) {
              const loaded = await ProgresoNivel.find((registroExistente as any).id_progreso)
              if (loaded) {
                registroExistente = loaded
              }
            }
            
            await (registroExistente as any).merge({ 
              estado: 'en_curso',
              subtema: subtemaNormalizado,
              ultima_vez: DateTime.now()
            }).save()
            console.log(`[SincronizacionService] ✓ Registro actualizado después de constraint (id: ${(registroExistente as any).id_progreso})`)
          } else {
            console.error(`[SincronizacionService] ✗ ERROR: No se pudo encontrar registro existente después de constraint`)
            console.error(`[SincronizacionService] Búsqueda realizada con: id_usuario=${id_usuario}, area="${areaCanon}", nivel=${nivel}, subtema="${subtemaNormalizado}"`)
            console.error(`[SincronizacionService] Error original: ${error?.message || error}`)
            // Si el constraint está bloqueando pero no encontramos el registro, es un problema de base de datos
            // En este caso, lanzar un error más descriptivo
            throw new Error(`El constraint único está bloqueando la inserción pero no se encontró el registro existente. Esto indica un problema en la base de datos. Error original: ${error?.message || error}`)
          }
        } else {
          console.error(`[SincronizacionService] ✗ ERROR al crear registro:`, error?.message || error)
          throw error
        }
      }
      
      // Marcar todos los niveles anteriores como superado usando subtemas reales
      for (let i = 1; i < nivel; i++) {
        const subtemaAnteriorReal = obtenerSubtemaPorNivel(areaCanon, i)
        if (!subtemaAnteriorReal) {
          console.log(`[SincronizacionService] No se pudo obtener subtema para nivel ${i}, saltando...`)
          continue
        }
        
        const subtemaAnteriorNormalizado = subtemaAnteriorReal.trim()
        
        let prev = await ProgresoNivel.query()
          .where('id_usuario', id_usuario)
          .andWhere('area', areaCanon)
          .whereRaw('LOWER(TRIM(subtema)) = LOWER(?)', [subtemaAnteriorNormalizado])
          .andWhere('nivel_orden', i)
          .first()

        if (!prev) {
          // Intentar búsqueda exacta si no se encontró con normalización
          prev = await ProgresoNivel.query()
            .where('id_usuario', id_usuario)
            .andWhere('area', areaCanon)
            .andWhere('subtema', subtemaAnteriorReal)
            .andWhere('nivel_orden', i)
            .first()
        }

        if (prev) {
          await (prev as any).merge({ 
            estado: 'superado',
            ultima_vez: DateTime.now()
          }).save()
        } else {
          // Crear registro para nivel anterior con subtema real
          try {
            await ProgresoNivel.create({
              id_usuario,
              area: areaCanon,
              subtema: subtemaAnteriorNormalizado,
              nivel_orden: i,
              estado: 'superado',
              preguntas_por_intento: 5,
              aciertos_minimos: 4,
              max_intentos_antes_retroceso: 3,
              intentos: 0,
              vidas_actuales: 3, // Nivel superado tiene 3 vidas
              ultima_recarga: null,
              ultima_lectura_detalle: null,
              ultima_vez: DateTime.now(),
              id_sesion: null, // Sincronización no tiene sesión asociada
            } as any)
          } catch (error: any) {
            // Si falla por constraint único, actualizar el existente
            if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('unique constraint')) {
              const existente = await ProgresoNivel.query()
                .where('id_usuario', id_usuario)
                .andWhere('area', areaCanon)
                .whereRaw('LOWER(TRIM(subtema)) = LOWER(?)', [subtemaAnteriorNormalizado])
                .andWhere('nivel_orden', i)
                .first()
              if (existente) {
                await (existente as any).merge({ 
                  estado: 'superado',
                  ultima_vez: DateTime.now()
                }).save()
              }
            }
          }
        }
      }
    }
  }

  /**
   * Obtiene vidas restantes por área y nivel
   * Retorna: { "Matematicas": { "2": 3, "3": 2, "6": 1 }, ... }
   * IMPORTANTE: Busca registros con subtemas REALES por nivel
   * Si un nivel está desbloqueado pero no tiene registro, inicializa con 3 vidas por defecto
   */
  async obtenerVidas(id_usuario: number): Promise<Record<string, Record<string, number>>> {
    console.log(`[SincronizacionService] obtenerVidas - id_usuario: ${id_usuario}`)
    
    const vidasPorArea: Record<string, Record<string, number>> = {}
    
    // Obtener niveles desbloqueados primero para inicializar vidas por defecto
    const nivelesDesbloqueados = await this.obtenerNivelesDesbloqueados(id_usuario)
    console.log(`[SincronizacionService] Niveles desbloqueados recibidos:`, nivelesDesbloqueados)

    // Para cada área, buscar registros con subtemas REALES por nivel
    for (const area of ['Matematicas', 'Lenguaje', 'Ciencias', 'Sociales', 'Ingles'] as Area[]) {
      vidasPorArea[area] = {}
      
      // CRÍTICO: Buscar el registro MÁS RECIENTE para cada nivel (historial completo)
      // Puede haber múltiples registros del mismo nivel, necesitamos el más reciente
      const nivelMax = nivelesDesbloqueados[area] || 1
      
      // Para cada nivel desbloqueado (2+), buscar el registro más reciente
      // CRÍTICO: Priorizar registros 'finalizado' o 'superado' sobre 'en_curso'
      // porque 'en_curso' es solo para niveles recién desbloqueados que aún no han sido intentados
      for (let nivel = 2; nivel <= nivelMax && nivel <= 6; nivel++) {
        // Buscar primero registros 'finalizado' o 'superado' (los que ya fueron intentados)
        let progresosNivel = await ProgresoNivel.query()
          .where('id_usuario', id_usuario)
          .where('area', area)
          .where('nivel_orden', nivel)
          .whereNot('subtema', `Nivel Global ${area}`)
          .whereIn('estado', ['finalizado', 'superado']) // Solo intentados
          .orderBy('ultima_vez', 'desc') // Ordenar por más reciente primero
          .orderBy('created_at', 'desc') // Si no hay ultima_vez, usar created_at
          .limit(1) // Solo el más reciente
          .exec()
        
        // Si no hay registros 'finalizado' o 'superado', buscar 'en_curso' (recién desbloqueado)
        if (!Array.isArray(progresosNivel) || progresosNivel.length === 0) {
          progresosNivel = await ProgresoNivel.query()
            .where('id_usuario', id_usuario)
            .where('area', area)
            .where('nivel_orden', nivel)
            .whereNot('subtema', `Nivel Global ${area}`)
            .where('estado', 'en_curso') // Solo recién desbloqueado
            .orderBy('ultima_vez', 'desc')
            .orderBy('created_at', 'desc')
            .limit(1)
            .exec()
        }
        
        const nivelStr = String(nivel)
        
        if (Array.isArray(progresosNivel) && progresosNivel.length > 0) {
          const p = progresosNivel[0] // El más reciente
          const subtema = String((p as any).subtema || '')
          const estado = String((p as any).estado || '')
          
          // CRÍTICO: Usar vidas_actuales directamente del registro más reciente
          // Las vidas representan los intentos restantes (3 - intentos_fallidos)
          // Si no existe, calcular basándose en intentos (retrocompatibilidad)
          let vidas = (p as any).vidas_actuales
          if (vidas === null || vidas === undefined) {
            // Retrocompatibilidad: calcular basándose en intentos FALLIDOS
            // Los intentos en el registro representan intentos fallidos
            const intentos = Number((p as any).intentos || 0)
            const maxIntentos = Number((p as any).max_intentos_antes_retroceso || 3)
            // Vidas = maxIntentos - intentos_fallidos
            vidas = Math.max(0, maxIntentos - intentos)
            console.log(`[SincronizacionService] ⚠ vidas_actuales no encontrado para nivel ${nivel}, calculando: intentos_fallidos=${intentos}, max=${maxIntentos}, vidas=${vidas}`)
          } else {
            // Asegurar que las vidas estén entre 0 y 3
            vidas = Math.max(0, Math.min(3, Number(vidas)))
            const intentos = Number((p as any).intentos || 0)
            console.log(`[SincronizacionService] ✓ Usando vidas_actuales del registro más reciente para nivel ${nivel}: ${vidas} vidas (intentos fallidos: ${intentos}, estado: ${estado})`)
          }
          
          // CRÍTICO: Si las vidas son 0 (3 intentos fallidos), NO incluir este nivel en vidasPorArea
          // Esto significa que el nivel está bloqueado y debe retrocederse
          if (vidas === 0) {
            console.log(`[SincronizacionService] ⚠ Nivel ${nivel} bloqueado por 3 intentos fallidos (vidas = 0). No se incluye en vidasPorArea.`)
            // No agregar este nivel a vidasPorArea, lo que significa que está bloqueado
            continue
          }
          
          vidasPorArea[area][nivelStr] = vidas
          console.log(`[SincronizacionService] Área ${area}, Nivel ${nivel}, Subtema "${subtema}", Estado "${estado}": ${vidas} vidas (registro más reciente)`)
        } else {
          // Si no hay registro para este nivel, inicializar con 3 vidas por defecto
          vidasPorArea[area][nivelStr] = 3
          console.log(`[SincronizacionService] Área ${area}, Nivel ${nivel}: Sin registro, inicializado con 3 vidas por defecto`)
        }
      }
      
      console.log(`[SincronizacionService] Área ${area} - vidas finales:`, vidasPorArea[area])
    }

    console.log(`[SincronizacionService] Vidas finales retornadas:`, vidasPorArea)
    return vidasPorArea
  }

  /**
   * Actualiza las vidas para un área y nivel específico
   */
  async actualizarVidas(
    id_usuario: number,
    area: string,
    nivel: number,
    vidas: number
  ): Promise<void> {
    console.log(`[SincronizacionService] actualizarVidas - id_usuario: ${id_usuario}, area: "${area}", nivel: ${nivel}, vidas: ${vidas}`)
    
    // Validar id_usuario (NO debe ser 0)
    if (!id_usuario || id_usuario <= 0) {
      console.error(`[SincronizacionService] ERROR: id_usuario inválido: ${id_usuario}`)
      throw new Error('id_usuario inválido')
    }
    
    const areaCanon = canonArea(area)
    if (!areaCanon || nivel < 2 || nivel > 6 || vidas < 0 || vidas > 3) {
      console.log(`[SincronizacionService] ERROR: Validación falló - areaCanon: ${areaCanon}, nivel: ${nivel}, vidas: ${vidas}`)
      return
    }

    // Obtener el subtema REAL del nivel
    const subtemaReal = obtenerSubtemaPorNivel(areaCanon, nivel)
    if (!subtemaReal) {
      console.error(`[SincronizacionService] ERROR: No se pudo obtener subtema para área ${areaCanon}, nivel ${nivel}`)
      return
    }
    
    const subtema = subtemaReal
    const subtemaNormalizado = String(subtema).trim()
    const maxIntentos = 3
    const intentos = Math.max(0, maxIntentos - vidas)
    
    console.log(`[SincronizacionService] Subtema REAL del nivel ${nivel}: "${subtema}"`)

    console.log(`[SincronizacionService] Subtema: "${subtemaNormalizado}", intentos: ${intentos}, vidas: ${vidas}`)

    // BÚSQUEDA EXHAUSTIVA: Buscar TODOS los registros del usuario para este área y nivel
    console.log(`[SincronizacionService] Buscando registro existente para id_usuario=${id_usuario}, area="${areaCanon}", nivel=${nivel}`)
    
    // Estrategia 1: Búsqueda normalizada (igual que sesiones_service.ts)
    let existing = await ProgresoNivel.query()
      .where('id_usuario', id_usuario)
      .andWhere('area', areaCanon)
      .whereRaw('LOWER(TRIM(subtema)) = LOWER(?)', [subtemaNormalizado])
      .andWhere('nivel_orden', nivel)
      .first()

    // Estrategia 2: Búsqueda exacta (igual que sesiones_service.ts)
    if (!existing) {
      console.log(`[SincronizacionService] Búsqueda normalizada no encontró registro, intentando búsqueda exacta`)
      existing = await ProgresoNivel.query()
        .where('id_usuario', id_usuario)
        .andWhere('area', areaCanon)
        .andWhere('subtema', subtema)
        .andWhere('nivel_orden', nivel)
        .first()
    }

    // Estrategia 3: Buscar TODOS los registros del usuario para este área y nivel (debug)
    if (!existing) {
      console.log(`[SincronizacionService] Búsqueda exacta no encontró registro, buscando TODOS los registros del usuario para debug`)
      
      // Consulta SQL directa para ver EXACTAMENTE qué hay en la base de datos
      // IMPORTANTE: Buscar TODOS los registros del usuario para esta área (sin filtro de nivel_orden)
      try {
        const Database = (await import('@adonisjs/lucid/services/db')).default
        
        // Buscar TODOS los registros de este usuario para esta área usando SQL directo
        const rawResultsAll = await Database.raw(
          `SELECT id_progreso, id_usuario, area, subtema, nivel_orden, estado, intentos
           FROM progreso_nivel
           WHERE id_usuario = $1 AND area = $2
           ORDER BY nivel_orden, subtema`,
          [id_usuario, areaCanon]
        )
        
        console.log(`[SincronizacionService] === ANÁLISIS: Consulta SQL directa para id_usuario=${id_usuario}, area="${areaCanon}" ===`)
        console.log(`[SincronizacionService] Total de registros encontrados en BD: ${rawResultsAll?.rows?.length || 0}`)
        
        if (rawResultsAll?.rows && rawResultsAll.rows.length > 0) {
          rawResultsAll.rows.forEach((row: any, i: number) => {
            const subtemaRaw = row.subtema
            const subtemaLength = subtemaRaw ? subtemaRaw.length : 0
            const subtemaChars = subtemaRaw ? Array.from(subtemaRaw).map((c: string) => c.charCodeAt(0)).join(',') : 'null'
            console.log(`[SincronizacionService]   Registro ${i + 1}: id_progreso=${row.id_progreso}, nivel_orden=${row.nivel_orden}, subtema="${subtemaRaw}" (length=${subtemaLength}, chars=[${subtemaChars}])`)
          })
          
          // Buscar específicamente el que coincide con nivel_orden
          const matchingRows = rawResultsAll.rows.filter((r: any) => r.nivel_orden === nivel)
          console.log(`[SincronizacionService] Registros que coinciden con nivel_orden=${nivel}: ${matchingRows.length}`)
          
          if (matchingRows.length > 0) {
            matchingRows.forEach((row: any, i: number) => {
              console.log(`[SincronizacionService]   ✓ Coincidencia ${i + 1}: id_progreso=${row.id_progreso}, subtema="${row.subtema}"`)
              // Si no se había encontrado antes, usar este
              if (!existing) {
                // Convertir el row a un objeto ProgresoNivel para usar merge
                existing = { id_progreso: row.id_progreso } as any
                console.log(`[SincronizacionService]   → Usando este registro como existing (id_progreso=${row.id_progreso})`)
              }
            })
          }
        } else {
          console.log(`[SincronizacionService] ⚠ NO se encontraron registros en la BD para id_usuario=${id_usuario}, area="${areaCanon}"`)
        }
      } catch (sqlError: any) {
        console.error(`[SincronizacionService] ✗ ERROR en consulta SQL directa:`, sqlError?.message || sqlError)
        // Si falla SQL directo, usar Lucid como fallback
        console.log(`[SincronizacionService] Usando Lucid como fallback para buscar todos los registros...`)
      }
      
      // También buscar con Lucid SIN filtro de nivel_orden para ver TODOS los registros del área
      console.log(`[SincronizacionService] Buscando con Lucid TODOS los registros para id_usuario=${id_usuario}, area="${areaCanon}" (sin filtro de nivel_orden)...`)
      const allRecordsArea = await ProgresoNivel.query()
        .where('id_usuario', id_usuario)
        .andWhere('area', areaCanon)
        .exec()
      
      console.log(`[SincronizacionService] Encontrados ${Array.isArray(allRecordsArea) ? allRecordsArea.length : 0} registros con Lucid para id_usuario=${id_usuario}, area="${areaCanon}" (TODOS los niveles)`)
      
      if (Array.isArray(allRecordsArea) && allRecordsArea.length > 0) {
        console.log(`[SincronizacionService] Registros encontrados con Lucid (TODOS los niveles):`)
        allRecordsArea.forEach((r: any, i: number) => {
          const subtemaRaw = r.subtema
          const subtemaLength = subtemaRaw ? subtemaRaw.length : 0
          const subtemaChars = subtemaRaw ? Array.from(subtemaRaw).map((c: string) => `${c}(${c.charCodeAt(0)})`).join(' ') : 'null'
          console.log(`[SincronizacionService]   ${i + 1}. id_progreso=${r.id_progreso}, nivel_orden=${r.nivel_orden}, subtema="${subtemaRaw}" (length=${subtemaLength}), chars=[${subtemaChars}]`)
        })
        
        // Buscar específicamente los que coinciden con nivel_orden
        const matchingByNivel = allRecordsArea.filter((r: any) => r.nivel_orden === nivel)
        console.log(`[SincronizacionService] Registros que coinciden con nivel_orden=${nivel}: ${matchingByNivel.length}`)
        
        if (matchingByNivel.length > 0) {
          matchingByNivel.forEach((r: any, i: number) => {
            console.log(`[SincronizacionService]   ✓ Coincidencia ${i + 1}: id_progreso=${r.id_progreso}, subtema="${r.subtema}"`)
            // Si no se había encontrado antes, usar este
            if (!existing) {
              existing = r
              console.log(`[SincronizacionService]   → Usando este registro como existing (id_progreso=${r.id_progreso})`)
            }
          })
        }
        
        // Si aún no encuentra, buscar manualmente cualquier registro que coincida con el subtema real
        if (!existing) {
          existing = allRecordsArea.find((r: any) => {
            const rSubtema = String(r.subtema || '').trim().toLowerCase()
            const targetSubtema = subtemaNormalizado.trim().toLowerCase()
            return rSubtema === targetSubtema && r.nivel_orden === nivel
          }) || null
          
          if (existing) {
            console.log(`[SincronizacionService] ✓ Registro encontrado manualmente (con subtema real): id_progreso=${(existing as any).id_progreso}, subtema="${(existing as any).subtema}", nivel_orden=${(existing as any).nivel_orden}`)
          }
        }
        
        // Si hay solo un registro, usarlo
        if (!existing && allRecordsArea.length === 1) {
          existing = allRecordsArea[0]
          console.log(`[SincronizacionService] Usando único registro encontrado: id_progreso=${(existing as any).id_progreso}, subtema="${(existing as any).subtema}", nivel_orden=${(existing as any).nivel_orden}`)
        }
      } else {
        console.log(`[SincronizacionService] ⚠ NO se encontraron registros con Lucid para id_usuario=${id_usuario}, area="${areaCanon}"`)
      }
    }

    console.log(`[SincronizacionService] Registro existente para vidas: ${existing ? `Sí (id: ${(existing as any).id_progreso}, subtema: "${(existing as any).subtema}")` : 'No'}`)

    if (existing) {
      // Si existe, actualizar (igual que sesiones_service.ts)
      // Si existing es un objeto plano de SQL, necesitamos cargarlo primero
      if (!(existing instanceof ProgresoNivel) && (existing as any).id_progreso) {
        const loaded = await ProgresoNivel.find((existing as any).id_progreso)
        if (loaded) {
          existing = loaded
        }
      }
      
      await (existing as any).merge({ 
        intentos,
        ultima_vez: DateTime.now()
      }).save()
      console.log(`[SincronizacionService] ✓ Vidas actualizadas exitosamente (intentos: ${intentos})`)
    } else {
      // Usar updateOrCreate para manejar automáticamente el constraint único
      console.log(`[SincronizacionService] Usando updateOrCreate para id_usuario=${id_usuario}, area="${areaCanon}", nivel=${nivel}, subtema="${subtemaNormalizado}"`)
      
      try {
        const registro = await ProgresoNivel.updateOrCreate(
          {
            id_usuario,
            area: areaCanon,
            subtema: subtemaNormalizado,
            nivel_orden: nivel,
          },
          {
            id_usuario,
            area: areaCanon,
            subtema: subtemaNormalizado,
            nivel_orden: nivel,
            estado: 'en_curso',
            preguntas_por_intento: 5,
            aciertos_minimos: 4,
            max_intentos_antes_retroceso: maxIntentos,
            intentos,
            vidas_actuales: vidas, // Vidas actuales desde el backend
            ultima_recarga: null,
            ultima_lectura_detalle: null,
            ultima_vez: DateTime.now(),
            id_sesion: null, // Sincronización no tiene sesión asociada
          } as any
        )
        console.log(`[SincronizacionService] ✓ Registro de vidas creado/actualizado exitosamente con id_progreso=${(registro as any).id_progreso}`)
      } catch (error: any) {
        // Si updateOrCreate falla, intentar con create y catch constraint
        console.log(`[SincronizacionService] updateOrCreate falló, intentando create manual:`, error?.message)
        // Si falla por constraint único, buscar y actualizar (igual que sesiones_service.ts)
        if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('unique constraint')) {
          console.log(`[SincronizacionService] Constraint único detectado en vidas - buscando registro existente con BÚSQUEDA EXHAUSTIVA`)
          
          // Buscar TODOS los registros del usuario para este área y nivel
          const allRecords = await ProgresoNivel.query()
            .where('id_usuario', id_usuario)
            .andWhere('area', areaCanon)
            .andWhere('nivel_orden', nivel)
            .exec()
          
          console.log(`[SincronizacionService] Encontrados ${Array.isArray(allRecords) ? allRecords.length : 0} registros después de constraint`)
          
          let registroExistente = null
          
          // Estrategia 1: Búsqueda normalizada
          registroExistente = await ProgresoNivel.query()
            .where('id_usuario', id_usuario)
            .andWhere('area', areaCanon)
            .whereRaw('LOWER(TRIM(subtema)) = LOWER(?)', [subtemaNormalizado])
            .andWhere('nivel_orden', nivel)
            .first()
          
          // Estrategia 2: Búsqueda exacta
          if (!registroExistente) {
            registroExistente = await ProgresoNivel.query()
              .where('id_usuario', id_usuario)
              .andWhere('area', areaCanon)
              .andWhere('subtema', subtema)
              .andWhere('nivel_orden', nivel)
              .first()
          }
          
          // Estrategia 3: Buscar manualmente en todos los registros por subtema real
          if (!registroExistente && Array.isArray(allRecords) && allRecords.length > 0) {
            registroExistente = allRecords.find((r: any) => {
              const rSubtema = String(r.subtema || '').trim().toLowerCase()
              const targetSubtema = subtemaNormalizado.trim().toLowerCase()
              return rSubtema === targetSubtema
            }) || null
          }
          
          // Estrategia 4: Si hay solo un registro, usarlo
          if (!registroExistente && Array.isArray(allRecords) && allRecords.length === 1) {
            registroExistente = allRecords[0]
            console.log(`[SincronizacionService] Usando único registro encontrado: id_progreso=${(registroExistente as any).id_progreso}, subtema="${(registroExistente as any).subtema}"`)
          }
          
          if (registroExistente) {
            await (registroExistente as any).merge({ 
              intentos,
              subtema: subtemaNormalizado,
              ultima_vez: DateTime.now()
            }).save()
            console.log(`[SincronizacionService] ✓ Vidas actualizadas después de constraint (id: ${(registroExistente as any).id_progreso})`)
          } else {
            console.error(`[SincronizacionService] ✗ ERROR: No se pudo encontrar registro existente para vidas después de constraint`)
            console.error(`[SincronizacionService] Búsqueda realizada con: id_usuario=${id_usuario}, area="${areaCanon}", nivel=${nivel}, subtema="${subtemaNormalizado}"`)
            throw new Error(`No se pudo crear ni actualizar el registro de vidas. Error original: ${error?.message || error}`)
          }
        } else {
          console.error(`[SincronizacionService] ✗ ERROR al crear registro de vidas:`, error?.message || error)
          throw error
        }
      }
    }
  }

  /**
   * Sincroniza todos los datos de niveles y vidas desde el móvil
   */
  async sincronizarTodo(
    id_usuario: number,
    niveles: Record<string, number>,
    vidas: Record<string, Record<string, number>>
  ): Promise<void> {
    // Sincronizar niveles desbloqueados
    for (const [area, nivel] of Object.entries(niveles)) {
      await this.actualizarNivelDesbloqueado(id_usuario, area, nivel)
    }

    // Sincronizar vidas
    for (const [area, nivelesVidas] of Object.entries(vidas)) {
      for (const [nivelStr, vidasCount] of Object.entries(nivelesVidas)) {
        const nivel = Number(nivelStr)
        if (nivel >= 2 && nivel <= 6) {
          await this.actualizarVidas(id_usuario, area, nivel, vidasCount)
        }
      }
    }
  }
}

