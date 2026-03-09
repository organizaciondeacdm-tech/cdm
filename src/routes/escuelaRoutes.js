const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/escuelaController');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateEscuela } = require('../middleware/validation');

router.get('/buscar', authMiddleware, buscarEscuelas);
router.get('/estadisticas', authMiddleware, getEstadisticasEscuela);
router.get('/:id/estadisticas', authMiddleware, getEstadisticasEscuela);
router.get('/', authMiddleware, getEscuelas);
router.get('/:id/visitas', authMiddleware, getVisitas);
router.post('/:id/visitas', authMiddleware, createVisita);
router.put('/:id/visitas/:visitaId', authMiddleware, updateVisita);
router.delete('/:id/visitas/:visitaId', authMiddleware, deleteVisita);
router.get('/:id/proyectos', authMiddleware, getProyectos);
router.post('/:id/proyectos', authMiddleware, createProyecto);
router.put('/:id/proyectos/:proyectoId', authMiddleware, updateProyecto);
router.delete('/:id/proyectos/:proyectoId', authMiddleware, deleteProyecto);
router.get('/:id/informes', authMiddleware, getInformesEscuela);
router.post('/:id/informes', authMiddleware, createInformeEscuela);
router.put('/:id/informes/:informeId', authMiddleware, updateInformeEscuela);
router.delete('/:id/informes/:informeId', authMiddleware, deleteInformeEscuela);
router.get('/:id/citas', authMiddleware, getCitas);
router.post('/:id/citas', authMiddleware, createCita);
router.put('/:id/citas/:citaId', authMiddleware, updateCita);
router.delete('/:id/citas/:citaId', authMiddleware, deleteCita);
router.get('/:id', authMiddleware, getEscuelaById);
router.post('/', 
  authMiddleware, 
  requirePermission('crear_escuela'),
  validateEscuela, 
  createEscuela
);
router.put('/:id', 
  authMiddleware, 
  requirePermission('editar_escuela'),
  validateEscuela, 
  updateEscuela
);
router.delete('/:id', 
  authMiddleware, 
  requirePermission('eliminar_escuela'),
  deleteEscuela
);

module.exports = router;
