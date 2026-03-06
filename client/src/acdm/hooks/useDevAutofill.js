/**
 * useDevAutofill
 * Provee datos de prueba para autocompletar formularios.
 * Solo disponible para el rol "desarrollador".
 */

const ESCUELAS_FAKE = [
  { de: 'DE 01', escuela: 'Escuela N°1 República del Perú', nivel: 'Primario', direccion: 'Av. Corrientes 1234, CABA', lat: -34.6037, lng: -58.3816, mail: 'e1.de01@bue.edu.ar', jornada: 'Completa', turno: 'Mañana', telefonos: ['011-4321-0001'] },
  { de: 'DE 03', escuela: 'Jardín N°5 Pequeños Exploradores', nivel: 'Inicial', direccion: 'Av. Santa Fe 890, CABA', lat: -34.5955, lng: -58.3944, mail: 'j5.de03@bue.edu.ar', jornada: 'Simple', turno: 'Tarde', telefonos: ['011-4322-0005'] },
  { de: 'DE 07', escuela: 'Escuela Secundaria N°12 Manuel Belgrano', nivel: 'Secundario', direccion: 'Perú 272, CABA', lat: -34.6113, lng: -58.3739, mail: 'es12.de07@bue.edu.ar', jornada: 'Completa', turno: 'Completa', telefonos: ['011-4300-0012', '011-4300-0013'] },
  { de: 'DE 11', escuela: 'Escuela de Educación Especial N°8', nivel: 'Especial', direccion: 'Tucumán 456, CABA', lat: -34.5998, lng: -58.3741, mail: 'eee8.de11@bue.edu.ar', jornada: 'Extendida', turno: 'Mañana', telefonos: ['011-4328-0008'] },
];

const ALUMNOS_FAKE = [
  { gradoSalaAnio: '3° Grado', nombre: 'García, Lucía', diagnostico: 'TEA Nivel 1', observaciones: 'Requiere adaptaciones curriculares y acompañamiento en socialización.' },
  { gradoSalaAnio: '1° Año', nombre: 'Rodríguez, Tomás', diagnostico: 'TDAH - Tipo Combinado', observaciones: 'Estrategias de segmentación de tareas. Trabajo coordinado con familia.' },
  { gradoSalaAnio: 'Sala de 4', nombre: 'López, Valentina', diagnostico: 'Discapacidad Motriz Leve', observaciones: 'Adaptación de espacio físico. Sin limitaciones cognitivas.' },
  { gradoSalaAnio: '5° Grado', nombre: 'Martínez, Santiago', diagnostico: 'Hipoacusia Bilateral', observaciones: 'Usa audífonos. Ubicación preferencial en el aula. Apoyo del DOAM.' },
];

const DOCENTES_FAKE = [
  { cargo: 'Titular', nombreApellido: 'Fernández, María Laura', estado: 'Activo', motivo: '-', diasAutorizados: 0, jornada: 'Completa' },
  { cargo: 'Suplente', nombreApellido: 'Gómez, Carlos Andrés', estado: 'Activo', motivo: '-', diasAutorizados: 0, jornada: 'Simple' },
  { cargo: 'Titular', nombreApellido: 'Pérez, Ana Beatriz', estado: 'Licencia', motivo: 'Art. 102 - Familiar enfermo', diasAutorizados: 15, fechaInicioLicencia: new Date().toISOString().split('T')[0], fechaFinLicencia: new Date(Date.now() + 15 * 864e5).toISOString().split('T')[0], jornada: 'Completa' },
  { cargo: 'Interino', nombreApellido: 'Torres, Ricardo Pablo', estado: 'Activo', motivo: '-', diasAutorizados: 0, jornada: 'Extendida' },
];

const VISITAS_FAKE = [
  { fecha: new Date().toISOString().split('T')[0], observaciones: 'Visita de diagnóstico inicial. Se relevaron necesidades del aula. Coordinación con directivos y docente titular.' },
  { fecha: new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0], observaciones: 'Seguimiento mensual. Alumno presenta avances significativos en la integración social.' },
  { fecha: new Date(Date.now() - 14 * 864e5).toISOString().split('T')[0], observaciones: 'Reunión con equipo docente. Se acordaron estrategias de adaptación curricular para el próximo trimestre.' },
];

const INFORMES_FAKE = [
  { titulo: 'Informe Trimestral - Primer Trimestre', estado: 'Pendiente', fechaEntrega: new Date(Date.now() + 10 * 864e5).toISOString().split('T')[0], observaciones: 'Informe de avance del primer trimestre. Incluye evaluación de adaptaciones curriculares implementadas.' },
  { titulo: 'Informe de Diagnóstico Inicial', estado: 'Entregado', fechaEntrega: new Date().toISOString().split('T')[0], observaciones: 'Diagnóstico inicial del alumno. Recomendaciones para la inclusión y adaptaciones necesarias.' },
  { titulo: 'Informe de Reunión Familiar', estado: 'En Progreso', fechaEntrega: new Date(Date.now() + 5 * 864e5).toISOString().split('T')[0], observaciones: 'Síntesis de la reunión con la familia del alumno. Acuerdos y compromisos para el período.' },
];

const PROYECTOS_FAKE = [
  { nombre: 'Adaptación de Material Didáctico', descripcion: 'Elaboración y adaptación de materiales pedagógicos accesibles para alumnos con necesidades especiales.', estado: 'En Progreso', fechaInicio: new Date().toISOString().split('T')[0], fechaBaja: new Date(Date.now() + 60 * 864e5).toISOString().split('T')[0] },
  { nombre: 'Taller de Integración Social', descripcion: 'Actividades grupales para fomentar la inclusión y el vínculo entre alumnos con y sin discapacidad.', estado: 'En Progreso', fechaInicio: new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0], fechaBaja: '' },
  { nombre: 'Capacitación Docente en DUA', descripcion: 'Diseño Universal para el Aprendizaje. Jornadas de formación para el equipo docente de la institución.', estado: 'Completado', fechaInicio: new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0], fechaBaja: new Date(Date.now() - 10 * 864e5).toISOString().split('T')[0] },
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function useDevAutofill() {
  return {
    getEscuela: () => ({ ...pickRandom(ESCUELAS_FAKE) }),
    getAlumno: () => ({ ...pickRandom(ALUMNOS_FAKE) }),
    getDocente: () => ({ ...pickRandom(DOCENTES_FAKE), id: `d${Date.now()}`, suplentes: [] }),
    getVisita: () => ({ ...pickRandom(VISITAS_FAKE), id: `v${Date.now()}` }),
    getInforme: () => ({ ...pickRandom(INFORMES_FAKE) }),
    getProyecto: () => ({ ...pickRandom(PROYECTOS_FAKE), id: `p${Date.now()}` }),
  };
}
