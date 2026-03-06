const BaseController = require('./BaseController');
const alumnoService = require('../services/acdm/alumnoService');

const getAlumnos = BaseController.handle(async (req, res) => {
  const pagination = BaseController.parsePagination(req.query, { defaultLimit: 20, maxLimit: 500 });
  const data = await alumnoService.list({ ...req.query, ...pagination }, req.user);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener alumnos' });

const getAlumnoById = BaseController.handle(async (req, res) => {
  const data = await alumnoService.getById(req.params.id);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener alumno' });

const createAlumno = BaseController.handle(async (req, res) => {
  const data = await alumnoService.create(req.body, req.user._id);
  return BaseController.created(res, data, 'Alumno creado exitosamente');
}, { defaultMessage: 'Error al crear alumno' });

const updateAlumno = BaseController.handle(async (req, res) => {
  const data = await alumnoService.update(req.params.id, req.body, req.user._id);
  return BaseController.ok(res, data, 'Alumno actualizado exitosamente');
}, { defaultMessage: 'Error al actualizar alumno' });

const deleteAlumno = BaseController.handle(async (req, res) => {
  await alumnoService.remove(req.params.id, req.user._id);
  return BaseController.ok(res, undefined, 'Alumno eliminado exitosamente');
}, { defaultMessage: 'Error al eliminar alumno' });

const getEstadisticasAlumnos = BaseController.handle(async (_req, res) => {
  const data = await alumnoService.getStats();
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener estadísticas' });

module.exports = {
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno,
  getEstadisticasAlumnos
};
