const BaseController = require('./BaseController');
const formEngineService = require('../aad/application/services/formEngineService');

const getActor = (req) => req.user?.username || req.user?.email || 'anonymous';

const parseColumnFilters = (raw = '{}') => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const createTemplate = BaseController.handle(async (req, res) => {
  const template = await formEngineService.createTemplate(req.body);
  return BaseController.created(res, template);
}, { defaultMessage: 'Error al crear template', defaultStatus: 400 });

const listTemplates = BaseController.handle(async (req, res) => {
  const templates = await formEngineService.listTemplates({
    entityType: req.query.entityType,
    isActive: req.query.isActive === undefined ? true : req.query.isActive === 'true',
    isLatest: req.query.isLatest === undefined ? true : req.query.isLatest === 'true'
  });
  return BaseController.ok(res, templates);
}, { defaultMessage: 'Error loading templates' });

const updateTemplate = BaseController.handle(async (req, res) => {
  const template = await formEngineService.updateTemplate(req.params.id, req.body);
  return BaseController.ok(res, template);
}, { defaultMessage: 'Error al actualizar template', defaultStatus: 400 });

const deleteTemplate = BaseController.handle(async (req, res) => {
  await formEngineService.deleteTemplate(req.params.id);
  return BaseController.ok(res, undefined, 'Template deleted');
}, { defaultMessage: 'Error deleting template' });

const createSubmission = BaseController.handle(async (req, res) => {
  const created = await formEngineService.saveSubmission({
    ...req.body,
    idempotencyKey: req.body?.idempotencyKey || req.headers['x-idempotency-key']
  }, getActor(req));

  if (created.queued) {
    return res.status(202).json({ success: true, data: created });
  }

  return BaseController.created(res, created);
}, { defaultMessage: 'Error al crear envío', defaultStatus: 400 });

const bulkCreateSubmissions = BaseController.handle(async (req, res) => {
  const rows = Array.isArray(req.body?.submissions) ? req.body.submissions : [];
  if (!rows.length) {
    const error = new Error('submissions is required');
    error.statusCode = 400;
    throw error;
  }

  const created = await formEngineService.bulkSaveSubmissions(rows, getActor(req));
  return BaseController.created(res, { inserted: created.length });
}, { defaultMessage: 'Error en carga masiva', defaultStatus: 400 });

const listSubmissions = BaseController.handle(async (req, res) => {
  const data = await formEngineService.listSubmissions({
    templateId: req.query.templateId,
    search: req.query.search,
    status: req.query.status,
    sortBy: req.query.sortBy,
    order: req.query.order,
    page: req.query.page,
    limit: req.query.limit,
    filters: parseColumnFilters(req.query.columnFilters)
  });

  return BaseController.ok(res, data);
}, { defaultMessage: 'Error loading submissions' });

const updateSubmission = BaseController.handle(async (req, res) => {
  const data = await formEngineService.updateSubmission(req.params.id, req.body, getActor(req));
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al actualizar envío', defaultStatus: 400 });

const deleteSubmission = BaseController.handle(async (req, res) => {
  await formEngineService.deleteSubmission(req.params.id);
  return BaseController.ok(res, undefined, 'Submission deleted');
}, { defaultMessage: 'Error deleting submission' });

const getSuggestions = BaseController.handle(async (req, res) => {
  const source = req.query.source || 'none';
  const q = req.query.q || '';
  if (!q.trim()) {
    return BaseController.ok(res, []);
  }

  const data = await formEngineService.getSuggestions(source, q, req.query.limit);
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error loading suggestions' });

module.exports = {
  createTemplate,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  createSubmission,
  bulkCreateSubmissions,
  listSubmissions,
  updateSubmission,
  deleteSubmission,
  getSuggestions
};
