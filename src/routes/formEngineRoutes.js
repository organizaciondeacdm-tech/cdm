const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/formEngineController');
const { optionalAuth, authMiddleware, requirePermission } = require('../middleware/auth');

router.get('/templates', optionalAuth, listTemplates);
router.post('/templates', authMiddleware, requirePermission('gestionar_formularios'), createTemplate);
router.put('/templates/:id', authMiddleware, requirePermission('gestionar_formularios'), updateTemplate);
router.delete('/templates/:id', authMiddleware, requirePermission('gestionar_formularios'), deleteTemplate);

router.get('/submissions', optionalAuth, listSubmissions);
router.post('/submissions', authMiddleware, requirePermission('gestionar_formularios'), createSubmission);
router.post('/submissions/bulk', authMiddleware, requirePermission('gestionar_formularios'), bulkCreateSubmissions);
router.put('/submissions/:id', authMiddleware, requirePermission('gestionar_formularios'), updateSubmission);
router.delete('/submissions/:id', authMiddleware, requirePermission('gestionar_formularios'), deleteSubmission);

router.get('/suggestions', optionalAuth, getSuggestions);

module.exports = router;
