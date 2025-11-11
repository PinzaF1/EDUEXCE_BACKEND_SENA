-- Script para limpiar migración corrupta y ejecutar la nueva migración

-- 1. Ver las migraciones registradas
SELECT * FROM adonis_schema ORDER BY batch DESC, id DESC;

-- 2. Eliminar la migración corrupta del batch 4
DELETE FROM adonis_schema 
WHERE name LIKE '%es_detalles%' 
AND batch = 4;

-- 3. Verificar que se eliminó
SELECT * FROM adonis_schema ORDER BY batch DESC, id DESC;

-- 4. Verificar si el campo preguntas_generadas ya existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sesiones' 
AND column_name = 'preguntas_generadas';
