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
const { optionalAuth, authMiddleware } = require('../middleware/auth');

router.get('/templates', optionalAuth, listTemplates);
router.post('/templates', authMiddleware, createTemplate);
router.put('/templates/:id', authMiddleware, updateTemplate);
router.delete('/templates/:id', authMiddleware, deleteTemplate);

router.get('/submissions', optionalAuth, listSubmissions);
router.post('/submissions', optionalAuth, createSubmission);
router.post('/submissions/bulk', optionalAuth, bulkCreateSubmissions);
router.put('/submissions/:id', optionalAuth, updateSubmission);
router.delete('/submissions/:id', optionalAuth, deleteSubmission);

router.get('/suggestions', optionalAuth, getSuggestions);

module.exports = router;
