const formEngineService = require('../aad/application/services/formEngineService');

const getActor = (req) => req.user?.username || req.user?.email || 'anonymous';

const parseColumnFilters = (raw = '{}') => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const createTemplate = async (req, res) => {
  try {
    const template = await formEngineService.createTemplate(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const listTemplates = async (req, res) => {
  try {
    const templates = await formEngineService.listTemplates({
      entityType: req.query.entityType,
      isActive: req.query.isActive === undefined ? true : req.query.isActive === 'true',
      isLatest: req.query.isLatest === undefined ? true : req.query.isLatest === 'true'
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error loading templates' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const template = await formEngineService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    await formEngineService.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error deleting template' });
  }
};

const createSubmission = async (req, res) => {
  try {
    const created = await formEngineService.saveSubmission({
      ...req.body,
      idempotencyKey: req.body?.idempotencyKey || req.headers['x-idempotency-key']
    }, getActor(req));
    res.status(created.queued ? 202 : 201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const bulkCreateSubmissions = async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.submissions) ? req.body.submissions : [];
    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'submissions is required' });
    }

    const created = await formEngineService.bulkSaveSubmissions(rows, getActor(req));
    res.status(201).json({ success: true, data: { inserted: created.length } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const listSubmissions = async (req, res) => {
  try {
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

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error loading submissions' });
  }
};

const updateSubmission = async (req, res) => {
  try {
    const data = await formEngineService.updateSubmission(req.params.id, req.body, getActor(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const deleteSubmission = async (req, res) => {
  try {
    await formEngineService.deleteSubmission(req.params.id);
    res.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error deleting submission' });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const source = req.query.source || 'none';
    const q = req.query.q || '';
    if (!q.trim()) {
      return res.json({ success: true, data: [] });
    }

    const data = await formEngineService.getSuggestions(source, q, req.query.limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error loading suggestions' });
  }
};

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
