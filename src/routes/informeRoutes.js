const express = require('express');
const {
  createInforme,
  getInformes,
  getInformeById,
  updateInforme,
  deleteInforme
} = require('../controllers/informeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// CRUD operations
router.post('/', authMiddleware, createInforme);
router.get('/', authMiddleware, getInformes);
router.get('/:id', authMiddleware, getInformeById);
router.put('/:id', authMiddleware, updateInforme);
router.delete('/:id', authMiddleware, deleteInforme);

module.exports = router;
