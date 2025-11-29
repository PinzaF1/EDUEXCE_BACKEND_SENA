-- Migración: Agregar campos de soft delete a notificaciones
-- Fecha: 28 de noviembre de 2025

-- Agregar columnas para soft delete
ALTER TABLE notificaciones 
ADD COLUMN IF NOT EXISTS eliminada BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS eliminada_en TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS eliminada_por BIGINT NULL;

-- Agregar foreign key para eliminada_por
ALTER TABLE notificaciones
ADD CONSTRAINT fk_notificaciones_eliminada_por 
FOREIGN KEY (eliminada_por) 
REFERENCES usuarios(id_usuario) 
ON DELETE SET NULL;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_notificaciones_eliminada 
ON notificaciones(eliminada);

-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notificaciones'
AND column_name IN ('eliminada', 'eliminada_en', 'eliminada_por');
