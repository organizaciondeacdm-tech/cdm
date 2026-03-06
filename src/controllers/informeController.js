const BaseController = require('./BaseController');
const informeService = require('../services/acdm/informeService');

const createInforme = BaseController.handle(async (req, res) => {
  const data = await informeService.create(req.body || {});
  return BaseController.created(res, data);
}, { defaultMessage: 'Error al crear informe' });

const getInformes = BaseController.handle(async (req, res) => {
  const data = await informeService.list(req.query.escuelaId);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener informes' });

const getInformeById = BaseController.handle(async (req, res) => {
  const data = await informeService.getById(req.params.id, req.query.escuelaId);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener informe' });

const updateInforme = BaseController.handle(async (req, res) => {
  const escuelaId = req.body?.escuelaId || req.query?.escuelaId;
  const data = await informeService.update(req.params.id, req.body || {}, escuelaId);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al actualizar informe' });

const deleteInforme = BaseController.handle(async (req, res) => {
  const escuelaId = req.query?.escuelaId || req.body?.escuelaId;
  await informeService.remove(req.params.id, escuelaId);
  return BaseController.ok(res, undefined, 'Informe eliminado correctamente');
}, { defaultMessage: 'Error al eliminar informe' });

module.exports = {
  createInforme,
  getInformes,
  getInformeById,
  updateInforme,
  deleteInforme
};
