// start/cron.ts
/**
 * Sistema de triggers automáticos para notificaciones en tiempo real
 * Este archivo se ejecuta al iniciar el servidor y configura tareas periódicas
 */

import NotificacionesRealtimeService from '../app/services/notificaciones_realtime_service.js'
import Institucion from '../app/models/institucione.js'

const realtimeService = new NotificacionesRealtimeService()

// Flag para evitar ejecuciones múltiples en desarrollo con HMR
let cronInicializado = false

export function iniciarCronNotificaciones() {
  if (cronInicializado) {
    console.log('[Cron] Ya inicializado, saltando...')
    return
  }
  
  cronInicializado = true
  console.log('[Cron] Iniciando sistema de notificaciones automáticas')
  
  // ========== DETECCIÓN DE ÁREAS CRÍTICAS ==========
  // Ejecutar cada 5 minutos
  const INTERVALO_AREAS_CRITICAS = 5 * 60 * 1000
  
  setInterval(async () => {
    try {
      console.log('[Cron] Ejecutando detección de áreas críticas...')
      const instituciones = await Institucion.query().select(['id_institucion'])
      
      let totalDetectadas = 0
      for (const inst of instituciones) {
        const detectadas = await realtimeService.detectarAreasCriticas(inst.id_institucion)
        totalDetectadas += detectadas
      }
      
      if (totalDetectadas > 0) {
        console.log(`[Cron] ✅ Detectadas ${totalDetectadas} áreas críticas en total`)
      }
    } catch (error) {
      console.error('[Cron] Error detectando áreas críticas:', error)
    }
  }, INTERVALO_AREAS_CRITICAS)
  
  console.log(`[Cron] ✓ Detección de áreas críticas activada (cada ${INTERVALO_AREAS_CRITICAS / 60000} min)`)
  
  // ========== ESTUDIANTES EN ALERTA ==========
  // Ejecutar cada 30 minutos
  const INTERVALO_ESTUDIANTES_ALERTA = 30 * 60 * 1000
  
  setInterval(async () => {
    try {
      console.log('[Cron] Ejecutando detección de estudiantes en alerta...')
      const instituciones = await Institucion.query().select(['id_institucion'])
      
      let totalDetectados = 0
      for (const inst of instituciones) {
        const detectados = await realtimeService.detectarEstudiantesAlerta(inst.id_institucion)
        totalDetectados += detectados
      }
      
      if (totalDetectados > 0) {
        console.log(`[Cron] ✅ Detectados ${totalDetectados} estudiantes en alerta`)
      }
    } catch (error) {
      console.error('[Cron] Error detectando estudiantes en alerta:', error)
    }
  }, INTERVALO_ESTUDIANTES_ALERTA)
  
  console.log(`[Cron] ✓ Detección de estudiantes en alerta activada (cada ${INTERVALO_ESTUDIANTES_ALERTA / 60000} min)`)
  
  // ========== DETECCIÓN DE INACTIVIDAD ==========
  // Ejecutar cada 2 horas
  const INTERVALO_INACTIVIDAD = 2 * 60 * 60 * 1000
  
  setInterval(async () => {
    try {
      console.log('[Cron] Ejecutando detección de inactividad...')
      const instituciones = await Institucion.query().select(['id_institucion'])
      
      let totalDetectados = 0
      for (const inst of instituciones) {
        const detectados = await realtimeService.detectarInactividad(inst.id_institucion)
        totalDetectados += detectados
      }
      
      if (totalDetectados > 0) {
        console.log(`[Cron] ✅ Detectados ${totalDetectados} estudiantes inactivos`)
      }
    } catch (error) {
      console.error('[Cron] Error detectando inactividad:', error)
    }
  }, INTERVALO_INACTIVIDAD)
  
  console.log(`[Cron] ✓ Detección de inactividad activada (cada ${INTERVALO_INACTIVIDAD / 3600000} horas)`)
  
  // ========== EJECUCIÓN INICIAL (después de 30 segundos) ==========
  // Para no sobrecargar el inicio del servidor
  setTimeout(async () => {
    console.log('[Cron] Ejecutando primera detección completa...')
    
    try {
      const instituciones = await Institucion.query().select(['id_institucion'])
      
      for (const inst of instituciones) {
        await realtimeService.ejecutarDeteccionCompleta(inst.id_institucion)
      }
      
      console.log('[Cron] ✅ Primera detección completa finalizada')
    } catch (error) {
      console.error('[Cron] Error en primera detección:', error)
    }
  }, 30000) // 30 segundos después del inicio
  
  console.log('[Cron] 🚀 Sistema de notificaciones automáticas iniciado exitosamente')
}

// Exportar para que pueda ser importado desde el servidor
export default iniciarCronNotificaciones

