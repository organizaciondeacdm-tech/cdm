const Escuela = require('../models/Escuela');
const { toObjectId } = require('../models/base/mongoModel');

const ensureSubdocIds = (escuela) => {
  escuela.informes = (escuela.informes || []).map((inf) => ({
    ...inf,
    _id: inf._id || toObjectId()
  }));
};

const findInformeIndex = (escuela, informeId) => (
  (escuela.informes || []).findIndex((inf) => String(inf._id) === String(informeId))
);

const findEscuela = async (escuelaId) => {
  if (!escuelaId) return null;
  return Escuela.findById(escuelaId);
};

const findEscuelaByInformeId = async (informeId) => {
  if (!informeId) return null;
  return Escuela.findOne({ 'informes._id': informeId });
};

const resolveEscuelaForInforme = async (informeId, escuelaId) => {
  if (escuelaId) {
    return findEscuela(escuelaId);
  }
  return findEscuelaByInformeId(informeId);
};

exports.createInforme = async (req, res) => {
  try {
    let { escuelaId, titulo, estado, fechaEntrega, observaciones } = req.body;

    // If no escuelaId provided, use the first available escuela
    if (!escuelaId) {
      const primera = await Escuela.findOne({}).select('_id').lean();
      if (!primera) {
        return res.status(400).json({ success: false, error: 'escuelaId es requerido y no hay escuelas disponibles' });
      }
      escuelaId = primera._id.toString();
    }

    const escuela = await findEscuela(escuelaId);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    ensureSubdocIds(escuela);
    escuela.informes.push({
      _id: toObjectId(),
      titulo: titulo || 'Sin título',
      estado: estado || 'Pendiente',
      fechaEntrega: fechaEntrega || null,
      observaciones: observaciones || ''
    });

    await escuela.save();
    const informe = escuela.informes[escuela.informes.length - 1];

    res.status(201).json({
      success: true,
      data: informe
    });
  } catch (error) {
    console.error('Error creating informe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInformes = async (req, res) => {
  try {
    const { escuelaId } = req.query;

    if (escuelaId) {
      const escuela = await findEscuela(escuelaId);
      if (!escuela) {
        return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
      }

      return res.json({
        success: true,
        data: { informes: escuela.informes || [] }
      });
    }

    const escuelas = await Escuela.find({}, { escuela: 1, de: 1, informes: 1 }).lean();
    const allInformes = escuelas.flatMap(esc =>
      (esc.informes || []).map(inf => ({
        ...inf,
        escuelaId: esc._id,
        escuela: esc.escuela,
        de: esc.de
      }))
    );

    res.json({
      success: true,
      data: { informes: allInformes }
    });
  } catch (error) {
    console.error('Error getting informes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInformeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { escuelaId } = req.query;

    const escuela = await resolveEscuelaForInforme(id, escuelaId);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    const idx = findInformeIndex(escuela, id);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    res.json({
      success: true,
      data: { informe: escuela.informes[idx] }
    });
  } catch (error) {
    console.error('Error getting informe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateInforme = async (req, res) => {
  try {
    const { id } = req.params;
    const { escuelaId, titulo, estado, fechaEntrega, observaciones } = req.body;
    const escuelaIdFromQuery = req.query?.escuelaId;

    const escuela = await resolveEscuelaForInforme(id, escuelaId || escuelaIdFromQuery);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    const idx = findInformeIndex(escuela, id);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    if (titulo !== undefined) escuela.informes[idx].titulo = titulo;
    if (estado !== undefined) escuela.informes[idx].estado = estado;
    if (fechaEntrega !== undefined) escuela.informes[idx].fechaEntrega = fechaEntrega;
    if (observaciones !== undefined) escuela.informes[idx].observaciones = observaciones;

    await escuela.save();

    res.json({
      success: true,
      data: { informe: escuela.informes[idx] }
    });
  } catch (error) {
    console.error('Error updating informe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteInforme = async (req, res) => {
  try {
    const { id } = req.params;
    const { escuelaId } = req.query;
    const escuelaIdFromBody = req.body?.escuelaId;

    const escuela = await resolveEscuelaForInforme(id, escuelaId || escuelaIdFromBody);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    const idx = findInformeIndex(escuela, id);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Informe no encontrado' });
    }

    escuela.informes.splice(idx, 1);
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
