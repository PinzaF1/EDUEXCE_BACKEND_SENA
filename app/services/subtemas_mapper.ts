// Mapeo de subtemas del sistema a subtemas de la API de IA
// Lista oficial de subtemas que acepta la API

export const SUBTEMAS_API_MAPPER: Record<string, Record<string, string>> = {
  // ========== MATEMÁTICAS ==========
  'Matematicas': {
    // Mapeos exactos (si ya vienen bien formateados)
    'Operaciones con números enteros': 'Operaciones con números enteros',
    'Razones y proporciones': 'Razones y proporciones',
    'Regla de tres simple y compuesta': 'Regla de tres simple y compuesta',
    'Porcentajes y tasas (aumento, descuento, interés simple)': 'Porcentajes y tasas (aumento, descuento, interés simple)',
    'Ecuaciones lineales y sistemas 2×2': 'Ecuaciones lineales y sistemas 2×2',
    
    // Variaciones comunes que pueden venir de la BD o frontend
    'Números enteros': 'Operaciones con números enteros',
    'Enteros': 'Operaciones con números enteros',
    'Razones': 'Razones y proporciones',
    'Proporciones': 'Razones y proporciones',
    'Regla de tres': 'Regla de tres simple y compuesta',
    'Porcentajes': 'Porcentajes y tasas (aumento, descuento, interés simple)',
    'Ecuaciones': 'Ecuaciones lineales y sistemas 2×2',
    'Ecuaciones lineales': 'Ecuaciones lineales y sistemas 2×2',
    'Sistemas de ecuaciones': 'Ecuaciones lineales y sistemas 2×2',
  },

  // ========== LENGUAJE ==========
  'Lenguaje': {
    // Mapeos exactos
    'Comprensión lectora (sentido global y local)': 'Comprensión lectora (sentido global y local)',
    'Conectores lógicos (causa, contraste, condición, secuencia)': 'Conectores lógicos (causa, contraste, condición, secuencia)',
    'Identificación de argumentos y contraargumentos': 'Identificación de argumentos y contraargumentos',
    'Idea principal y propósito comunicativo': 'Idea principal y propósito comunicativo',
    'Hecho vs. opinión e inferencias': 'Hecho vs. opinión e inferencias',
    
    // Variaciones comunes
    'Comprensión lectora': 'Comprensión lectora (sentido global y local)',
    'Lectura comprensiva': 'Comprensión lectora (sentido global y local)',
    'Conectores': 'Conectores lógicos (causa, contraste, condición, secuencia)',
    'Conectores lógicos': 'Conectores lógicos (causa, contraste, condición, secuencia)',
    'Argumentos': 'Identificación de argumentos y contraargumentos',
    'Idea principal': 'Idea principal y propósito comunicativo',
    'Propósito comunicativo': 'Idea principal y propósito comunicativo',
    'Inferencias': 'Hecho vs. opinión e inferencias',
    'Hecho y opinión': 'Hecho vs. opinión e inferencias',
  },

  // ========== SOCIALES ==========
  'sociales': {
    // Mapeos exactos
    'Constitución de 1991 y organización del Estado': 'Constitución de 1991 y organización del Estado',
    'Historia de Colombia - Frente Nacional': 'Historia de Colombia - Frente Nacional',
    'Guerras Mundiales y Guerra Fría': 'Guerras Mundiales y Guerra Fría',
    'Geografía de Colombia (mapas, territorio y ambiente)': 'Geografía de Colombia (mapas, territorio y ambiente)',
    
    // Variaciones comunes
    'Constitución': 'Constitución de 1991 y organización del Estado',
    'Constitución de 1991': 'Constitución de 1991 y organización del Estado',
    'Organización del Estado': 'Constitución de 1991 y organización del Estado',
    'Historia': 'Historia de Colombia - Frente Nacional',
    'Historia de Colombia': 'Historia de Colombia - Frente Nacional',
    'Frente Nacional': 'Historia de Colombia - Frente Nacional',
    'Guerras Mundiales': 'Guerras Mundiales y Guerra Fría',
    'Guerra Fría': 'Guerras Mundiales y Guerra Fría',
    'Geografía': 'Geografía de Colombia (mapas, territorio y ambiente)',
    'Geografía de Colombia': 'Geografía de Colombia (mapas, territorio y ambiente)',
    'Mapas': 'Geografía de Colombia (mapas, territorio y ambiente)',
  },

  // ========== CIENCIAS NATURALES ==========
  'Ciencias': {
    // Mapeos exactos
    'Indagación científica (variables, control e interpretación de datos)': 'Indagación científica (variables, control e interpretación de datos)',
    'Fuerzas, movimiento y energía': 'Fuerzas, movimiento y energía',
    'Materia y cambios (mezclas, reacciones y conservación)': 'Materia y cambios (mezclas, reacciones y conservación)',
    'Genética y herencia': 'Genética y herencia',
    'Ecosistemas y cambio climático (CTS)': 'Ecosistemas y cambio climático (CTS)',
    
    // Variaciones comunes
    'Indagación científica': 'Indagación científica (variables, control e interpretación de datos)',
    'Método científico': 'Indagación científica (variables, control e interpretación de datos)',
    'Fuerzas': 'Fuerzas, movimiento y energía',
    'Movimiento': 'Fuerzas, movimiento y energía',
    'Energía': 'Fuerzas, movimiento y energía',
    'Física': 'Fuerzas, movimiento y energía',
    'Materia': 'Materia y cambios (mezclas, reacciones y conservación)',
    'Química': 'Materia y cambios (mezclas, reacciones y conservación)',
    'Reacciones químicas': 'Materia y cambios (mezclas, reacciones y conservación)',
    'Genética': 'Genética y herencia',
    'Herencia': 'Genética y herencia',
    'Biología': 'Genética y herencia',
    'Ecosistemas': 'Ecosistemas y cambio climático (CTS)',
    'Cambio climático': 'Ecosistemas y cambio climático (CTS)',
  },

  // ========== INGLÉS ==========
  'Ingles': {
    // Mapeos exactos
    'Verb to be (am, is, are)': 'Verb to be (am, is, are)',
    'Present Simple (afirmación, negación y preguntas)': 'Present Simple (afirmación, negación y preguntas)',
    'Past Simple (verbos regulares e irregulares)': 'Past Simple (verbos regulares e irregulares)',
    'Comparatives and superlatives': 'Comparatives and superlatives',
    'Subject/Object pronouns & Possessive adjectives': 'Subject/Object pronouns & Possessive adjectives',
    
    // Variaciones comunes
    'Verb to be': 'Verb to be (am, is, are)',
    'To be': 'Verb to be (am, is, are)',
    'Present Simple': 'Present Simple (afirmación, negación y preguntas)',
    'Simple Present': 'Present Simple (afirmación, negación y preguntas)',
    'Past Simple': 'Past Simple (verbos regulares e irregulares)',
    'Simple Past': 'Past Simple (verbos regulares e irregulares)',
    'Comparatives': 'Comparatives and superlatives',
    'Superlatives': 'Comparatives and superlatives',
    'Pronouns': 'Subject/Object pronouns & Possessive adjectives',
    'Possessive': 'Subject/Object pronouns & Possessive adjectives',
    'Possessive adjectives': 'Subject/Object pronouns & Possessive adjectives',
  },
}

/**
 * Normaliza subtemas para que coincidan con los que acepta la API de IA
 * @param area Área de conocimiento
 * @param subtemaOriginal Subtema que viene del frontend/BD
 * @returns Subtema normalizado que acepta la API
 */
export function mapearSubtema(area: string, subtemaOriginal: string): string {
  // Normalizar el nombre del área por si viene con mayúsculas/minúsculas diferentes
  const areaNormalizada = area.toLowerCase()
  
  // Buscar el mapper correspondiente al área
  let areaMap: Record<string, string> | undefined
  
  // Buscar con diferentes variaciones del nombre del área
  for (const key of Object.keys(SUBTEMAS_API_MAPPER)) {
    if (key.toLowerCase() === areaNormalizada) {
      areaMap = SUBTEMAS_API_MAPPER[key]
      break
    }
  }
  
  // Si no hay mapper para esta área, devolver el subtema original
  if (!areaMap) {
    console.warn(`[Mapper] No hay mapper para el área: "${area}"`)
    return subtemaOriginal
  }
  
  // Buscar el subtema mapeado (primero exacto, luego case-insensitive)
  const subtemaExacto = areaMap[subtemaOriginal]
  if (subtemaExacto) {
    return subtemaExacto
  }
  
  // Buscar case-insensitive
  const subtemaLower = subtemaOriginal.toLowerCase()
  for (const [key, value] of Object.entries(areaMap)) {
    if (key.toLowerCase() === subtemaLower) {
      return value
    }
  }
  
  // Si no se encuentra mapeo, devolver el original y advertir
  console.warn(`[Mapper] No hay mapeo para: Área="${area}", Subtema="${subtemaOriginal}"`)
  return subtemaOriginal
}
