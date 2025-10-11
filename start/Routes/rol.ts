import Route from '@adonisjs/core/services/router'
import { onlyRol } from '#middleware/only_rol'

import RegistroController from '../../app/controller/registro_controller.js'
import AuthController     from '../../app/controller/auth_controller.js'
import AdminController    from '../../app/controller/admin_controller.js'
import MovilController    from '../../app/controller/movil_controller.js'

// PÚBLICAS
Route.post('instituciones/registro', (ctx) => new RegistroController().registrarInstitucion(ctx))
Route.post('admin/login', (ctx) => new AuthController().loginAdministrador(ctx))
Route.post('estudiante/login', (ctx) => new AuthController().loginEstudiante(ctx))
Route.post('auth/recovery/admin/enviar', (ctx) => new AuthController().enviarRecoveryAdmin(ctx))
Route.post('auth/recovery/admin/restablecer', (ctx) => new AuthController().restablecerAdmin(ctx))
Route.post('auth/recovery/estudiante/enviar', (ctx) => new AuthController().enviarRecoveryEstudiante(ctx))
Route.post('auth/recovery/estudiante/restablecer', (ctx) => new AuthController().restablecerEstudiante(ctx))

// ADMINISTRADOR
Route.get('admin/estudiantes', (ctx) => new AdminController().listarEstudiantes(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.post('admin/estudiantes', (ctx) => new AdminController().crearEstudiante(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.post('admin/estudiantes/importar', (ctx) => new AdminController().importarEstudiantes(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.put('admin/estudiantes/:id', (ctx) => new AdminController().editarEstudiante(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.delete('admin/estudiantes/:id', (ctx) => new AdminController().eliminarEstudiante(ctx)).use(onlyRol({ rol: 'administrador' }))

Route.get('admin/notificaciones', (ctx) => new AdminController().notificaciones(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.post('admin/notificaciones/generar', (ctx) => new AdminController().generarNotificaciones(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.post('admin/notificaciones/marcar', (ctx) => new AdminController().marcarLeidas(ctx)).use(onlyRol({ rol: 'administrador' }))

Route.get('admin/perfil', (ctx) => new AdminController().verPerfilInstitucion(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.put('admin/perfil', (ctx) => new AdminController().actualizarPerfilInstitucion(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.post('admin/perfil/cambiar-password', (ctx) => new AdminController().cambiarPasswordInstitucion(ctx)).use(onlyRol({ rol: 'administrador' }))

// MÓVIL (estudiante)
Route.get('estudiante/perfil', (ctx) => new MovilController().perfilEstudiante(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('kolb/preguntas', (ctx) => new MovilController().kolbItems(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('kolb/enviar', (ctx) => new MovilController().kolbGuardar(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('kolb/resultado', (ctx) => new MovilController().kolbResultado(ctx)).use(onlyRol({ rol: 'estudiante' }))

Route.post('quizz/iniciar', (ctx) => new MovilController().quizInicialIniciar(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('quiz-inicial/cerrar',(ctx) => new MovilController().quizInicialCerrar(ctx)).use(onlyRol({ rol: 'estudiante' }))

/*MOVIL NIVELES */
Route.post('sesion/parada', (ctx) => new MovilController().crearParada(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('sesion/cerrar', (ctx) => new MovilController().cerrarSesion(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('movil/simulacro', (ctx) => new MovilController().crearSimulacro(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('movil/simulacro/cerrar', (ctx) => new MovilController().cerrarSimulacro(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/sesion/:id_sesion/detalle', (ctx) => new MovilController().detalleSesion(ctx)).use(onlyRol({ rol: 'estudiante' }))


// ISLA DEL CONOCIMIENTO 
Route.post('movil/isla/simulacro', (ctx) => new MovilController().islaSimulacroIniciar(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('movil/isla/simulacro/cerrar', (ctx) => new MovilController().islaSimulacroCerrar(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/isla/simulacro/:id_sesion/resumen', (ctx) => new MovilController().islaSimulacroResumen(ctx)).use(onlyRol({ rol: 'estudiante' }))

// PROGRESO MOVIL
Route.get('movil/progreso/resumen',   (ctx) => new MovilController().progresoResumen(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/progreso/materias',  (ctx) => new MovilController().progresoPorMaterias(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/progreso/historial', (ctx) => new MovilController().progresoHistorial(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/progreso/historial/:id_sesion', (ctx) => new MovilController().progresoHistorialDetalle(ctx)).use(onlyRol({ rol: 'estudiante' }))

//SEGUIMIENTO   WEB
Route.get('web/seguimiento/resumen',            (ctx) => new AdminController().webSeguimientoResumen(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.get('web/seguimiento/cursos',             (ctx) => new AdminController().webSeguimientoCursos(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.get('web/seguimiento/areas-refuerzo',     (ctx) => new AdminController().webAreasRefuerzo(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.get('web/seguimiento/estudiantes-alerta', (ctx) => new AdminController().webEstudiantesAlerta(ctx)).use(onlyRol({ rol: 'administrador' }))

//INICIO WEB
Route.get('web/seguimiento/areas/activos',      (ctx) => new AdminController().webAreasActivos(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.get('web/seguimiento/series/progreso-por-area', (ctx) => new AdminController().webSerieProgresoPorArea(ctx)).use(onlyRol({ rol: 'administrador' }))
Route.get('web/seguimiento/rendimiento-por-area',     (ctx) => new AdminController().webRendimientoPorArea(ctx)).use(onlyRol({ rol: 'administrador' }))

// RANKING Y LOGROS
Route.get('movil/ranking', (ctx) => new MovilController().ranking(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/logros', (ctx) => new MovilController().misLogros(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('movil/logros/otorgar-area', (ctx) => new MovilController().otorgarInsigniaArea(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/logros/todos', (ctx) => new MovilController().logrosTodos(ctx)).use(onlyRol({ rol: 'estudiante' }))

// RETO 1 VS 1
Route.get('movil/retos/oponentes', (ctx) => new MovilController().listarOponentes(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('movil/retos', (ctx) => new MovilController().crearReto(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('movil/retos/:id_reto/aceptar', (ctx) => new MovilController().aceptarReto(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.post('movil/retos/ronda', (ctx) => new MovilController().responderRonda(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/retos/:id_reto/estado', (ctx) => new MovilController().estadoReto(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.get('movil/retos', (ctx) => new MovilController().listarRetos(ctx)).use(onlyRol({ rol: 'estudiante' }))

//PERFIL DEL ESTUDIANTE

Route.put('movil/perfil/:id', (ctx) => new MovilController().editarMiPerfilContacto(ctx)).use(onlyRol({ rol: 'estudiante' }))
Route.put('movil/password', (ctx) => new MovilController().cambiarPasswordEstudiante(ctx)).use(onlyRol({ rol: 'estudiante' }))





