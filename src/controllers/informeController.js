const Escuela = require('../models/Escuela');
const { v4: uuidv4 } = require('uuid');

// Crear informe
exports.createInforme = async (req, res) => {
  try {
    const { escuelaId, titulo, estado, fechaEntrega, observaciones } = req.body;

    if (!escuelaId) {
      return res.status(400).json({ success: false, error: 'escuelaId es requerido' });
    }

    const escuela = await Escuela.findById(escuelaId);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    const newInforme = {
      _id: uuidv4(),
      titulo: titulo || 'Sin título',
      estado: estado || 'Pendiente',
      fechaEntrega: fechaEntrega || new Date(),
      observaciones: observaciones || '',
      fechaCreacion: new Date()
    };

    escuela.informes = escuela.informes || [];
    escuela.informes.push(newInforme);

    await escuela.save();

    res.status(201).json({
      success: true,
      data: { informe: newInforme }
    });
  } catch (error) {
    console.error('Error creating informe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obtener informes de una escuela
exports.getInformes = async (req, res) => {
  try {
    const { escuelaId } = req.query;

    if (escuelaId) {
      const escuela = await Escuela.findById(escuelaId);
      if (!escuela) {
        return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
      }
      return res.json({
        success: true,
        data: { informes: escuela.informes || [] }
      });
    }

    // Obtener todos los informes de todas las escuelas
    const escuelas = await Escuela.find({});
    const allInformes = [];
    escuelas.forEach(esc => {
      (esc.informes || []).forEach(inf => {
        allInformes.push({
          ...inf.toObject ? inf.toObject() : inf,
          escuelaId: esc._id,
          escuela: esc.escuela
        });
      });
    });

    res.json({
      success: true,
      data: { informes: allInformes }
    });
  } catch (error) {
    console.error('Error getting informes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obtener informe por ID
exports.getInformeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { escuelaId } = req.query;

    if (!escuelaId) {
      return res.status(400).json({ success: false, error: 'escuelaId es requerido' });
    }

    const escuela = await Escuela.findById(escuelaId);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    const informe = (escuela.informes || []).find(i => i._id === id || i.id === id);
    if (!informe) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    res.json({
      success: true,
      data: { informe }
    });
  } catch (error) {
    console.error('Error getting informe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Actualizar informe
exports.updateInforme = async (req, res) => {
  try {
    const { id } = req.params;
    const { escuelaId, titulo, estado, fechaEntrega, observaciones } = req.body;

    if (!escuelaId) {
      return res.status(400).json({ success: false, error: 'escuelaId es requerido' });
    }

    const escuela = await Escuela.findById(escuelaId);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    const informeIndex = (escuela.informes || []).findIndex(i => i._id === id || i.id === id);
    if (informeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    const updatedInforme = {
      ...escuela.informes[informeIndex],
      titulo: titulo !== undefined ? titulo : escuela.informes[informeIndex].titulo,
      estado: estado !== undefined ? estado : escuela.informes[informeIndex].estado,
      fechaEntrega: fechaEntrega !== undefined ? fechaEntrega : escuela.informes[informeIndex].fechaEntrega,
      observaciones: observaciones !== undefined ? observaciones : escuela.informes[informeIndex].observaciones,
      fechaActualizacion: new Date()
    };

    escuela.informes[informeIndex] = updatedInforme;
    await escuela.save();

    res.json({
      success: true,
      data: { informe: updatedInforme }
    });
  } catch (error) {
    console.error('Error updating informe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Eliminar informe
exports.deleteInforme = async (req, res) => {
  try {
    const { id } = req.params;
    const { escuelaId } = req.query;

    if (!escuelaId) {
      return res.status(400).json({ success: false, error: 'escuelaId es requerido' });
    }

    const escuela = await Escuela.findById(escuelaId);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    const informeIndex = (escuela.informes || []).findIndex(i => i._id === id || i.id === id);
    if (informeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    escuela.informes.splice(informeIndex, 1);
    await escuela.save();

    res.json({
      success: true,
      message: 'Informe eliminado correctamente'
    });
  } catch (error) {
    console.error('Error deleting informe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
