const BaseController = require('./BaseController');
const docenteService = require('../services/acdm/docenteService');

const getDocentes = BaseController.handle(async (req, res) => {
  const pagination = BaseController.parsePagination(req.query, { defaultLimit: 20, maxLimit: 500 });
  const data = await docenteService.list({ ...req.query, ...pagination }, req.user);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener docentes' });

const getDocenteById = BaseController.handle(async (req, res) => {
  const data = await docenteService.getById(req.params.id);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener docente' });

const createDocente = BaseController.handle(async (req, res) => {
  const data = await docenteService.create(req.body, req.user._id);
  return BaseController.created(res, data, 'Docente creado exitosamente');
}, { defaultMessage: 'Error al crear docente' });

const updateDocente = BaseController.handle(async (req, res) => {
  const data = await docenteService.update(req.params.id, req.body, req.user._id);
  return BaseController.ok(res, data, 'Docente actualizado exitosamente');
}, { defaultMessage: 'Error al actualizar docente' });

const deleteDocente = BaseController.handle(async (req, res) => {
  await docenteService.remove(req.params.id, req.user._id);
  return BaseController.ok(res, undefined, 'Docente eliminado exitosamente');
}, { defaultMessage: 'Error al eliminar docente' });

const getLicenciasProximas = BaseController.handle(async (req, res) => {
  const dias = Number.parseInt(req.query.dias, 10) || 10;
  const data = await docenteService.getLicenciasProximas(dias);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener licencias próximas' });

const getEstadisticasDocentes = BaseController.handle(async (_req, res) => {
  const data = await docenteService.getStats();
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener estadísticas' });

module.exports = {
  getDocentes,
  getDocenteById,
  createDocente,
  updateDocente,
  deleteDocente,
  getLicenciasProximas,
  getEstadisticasDocentes
};
