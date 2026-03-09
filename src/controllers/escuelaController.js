const BaseController = require('./BaseController');
const escuelaService = require('../services/acdm/escuelaService');

const getEscuelas = BaseController.handle(async (req, res) => {
  const pagination = BaseController.parsePagination(req.query, { defaultLimit: 10, maxLimit: 500 });
  const data = await escuelaService.list({ ...req.query, ...pagination }, req.user);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener escuelas' });

const getEscuelaById = BaseController.handle(async (req, res) => {
  const data = await escuelaService.getById(req.params.id);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener escuela' });

const createEscuela = BaseController.handle(async (req, res) => {
  const data = await escuelaService.create(req.body, req.user._id);
  return BaseController.created(res, data, 'Escuela creada exitosamente');
}, { defaultMessage: 'Error al crear escuela' });

const updateEscuela = BaseController.handle(async (req, res) => {
  const data = await escuelaService.update(req.params.id, req.body, req.user._id);
  return BaseController.ok(res, data, 'Escuela actualizada exitosamente');
}, { defaultMessage: 'Error al actualizar escuela' });

const deleteEscuela = BaseController.handle(async (req, res) => {
  await escuelaService.remove(req.params.id);
  return BaseController.ok(res, undefined, 'Escuela eliminada exitosamente');
}, { defaultMessage: 'Error al eliminar escuela' });

const getEstadisticasEscuela = BaseController.handle(async (req, res) => {
  const data = await escuelaService.getStats(req.params.id || null);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al obtener estadísticas' });

const buscarEscuelas = BaseController.handle(async (req, res) => {
  const data = await escuelaService.search(req.query);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al buscar escuelas' });

const getNestedCollection = (collection) => BaseController.handle(async (req, res) => {
  const data = await escuelaService.getNestedCollection(req.params.id, collection);
  return BaseController.ok(res, data);
}, { defaultMessage: `Error al obtener ${collection}` });

const createNestedCollectionItem = (collection) => BaseController.handle(async (req, res) => {
  const data = await escuelaService.createNestedCollectionItem(req.params.id, collection, req.body || {}, req.user._id);
  return BaseController.created(res, data, `${collection.slice(0, -1)} creado exitosamente`);
}, { defaultMessage: `Error al crear ${collection.slice(0, -1)}` });

const updateNestedCollectionItem = (collection, idParam) => BaseController.handle(async (req, res) => {
  const data = await escuelaService.updateNestedCollectionItem(req.params.id, collection, req.params[idParam], req.body || {}, req.user._id);
  return BaseController.ok(res, data, `${collection.slice(0, -1)} actualizado exitosamente`);
}, { defaultMessage: `Error al actualizar ${collection.slice(0, -1)}` });

const deleteNestedCollectionItem = (collection, idParam) => BaseController.handle(async (req, res) => {
  await escuelaService.deleteNestedCollectionItem(req.params.id, collection, req.params[idParam], req.user._id);
  return BaseController.ok(res, undefined, `${collection.slice(0, -1)} eliminado exitosamente`);
}, { defaultMessage: `Error al eliminar ${collection.slice(0, -1)}` });

const getVisitas = getNestedCollection('visitas');
const createVisita = createNestedCollectionItem('visitas');
const updateVisita = updateNestedCollectionItem('visitas', 'visitaId');
const deleteVisita = deleteNestedCollectionItem('visitas', 'visitaId');

const getProyectos = getNestedCollection('proyectos');
const createProyecto = createNestedCollectionItem('proyectos');
const updateProyecto = updateNestedCollectionItem('proyectos', 'proyectoId');
const deleteProyecto = deleteNestedCollectionItem('proyectos', 'proyectoId');

const getInformesEscuela = getNestedCollection('informes');
const createInformeEscuela = createNestedCollectionItem('informes');
const updateInformeEscuela = updateNestedCollectionItem('informes', 'informeId');
const deleteInformeEscuela = deleteNestedCollectionItem('informes', 'informeId');

const getCitas = getNestedCollection('citas');
const createCita = createNestedCollectionItem('citas');
const updateCita = updateNestedCollectionItem('citas', 'citaId');
const deleteCita = deleteNestedCollectionItem('citas', 'citaId');

module.exports = {
  getEscuelas,
  getEscuelaById,
  createEscuela,
  updateEscuela,
  deleteEscuela,
  getEstadisticasEscuela,
  buscarEscuelas,
  getVisitas,
  createVisita,
  updateVisita,
  deleteVisita,
  getProyectos,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  getInformesEscuela,
  createInformeEscuela,
  updateInformeEscuela,
  deleteInformeEscuela,
  getCitas,
  createCita,
  updateCita,
  deleteCita
};
