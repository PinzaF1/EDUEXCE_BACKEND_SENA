// Script para limpiar migración corrupta
import { Database } from '@adonisjs/lucid/database'
import app from '@adonisjs/core/services/app'

async function fixCorruptMigration() {
  try {
    await app.init()
    const db = await app.container.make('lucid.db')

    console.log('🔍 Verificando migraciones corruptas...')

    // Ver todas las migraciones
    const migrations = await db.from('adonis_schema').orderBy('batch', 'desc')
    console.log('\n📋 Migraciones actuales:')
    migrations.forEach(m => {
      console.log(`  - ${m.name} (batch: ${m.batch})`)
    })

    // Buscar migración corrupta
    const corrupt = migrations.find(m => m.name.includes('es_detalles'))
    
    if (corrupt) {
      console.log(`\n⚠️  Migración corrupta encontrada: ${corrupt.name}`)
      console.log('🗑️  Eliminando registro corrupto...')
      
      await db.from('adonis_schema')
        .where('name', corrupt.name)
        .delete()
      
      console.log('✅ Migración corrupta eliminada')
    } else {
      console.log('\n✅ No se encontraron migraciones corruptas')
    }

    // Verificar si el campo preguntas_generadas existe
    console.log('\n🔍 Verificando campo preguntas_generadas...')
    const columns = await db.rawQuery(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'sesiones' 
       AND column_name = 'preguntas_generadas'`
    )

    if (columns.rows && columns.rows.length > 0) {
      console.log('✅ Campo preguntas_generadas ya existe:')
      console.log(`   - Tipo: ${columns.rows[0].data_type}`)
      console.log(`   - Nullable: ${columns.rows[0].is_nullable}`)
    } else {
      console.log('⚠️  Campo preguntas_generadas NO existe')
      console.log('   Ejecuta: node ace migration:run')
    }

    console.log('\n✅ Proceso completado')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixCorruptMigration()
