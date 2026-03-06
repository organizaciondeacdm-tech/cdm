const Escuela = require('../models/Escuela');
const Docente = require('../models/Docente');
const Alumno = require('../models/Alumno');
const { toObjectId } = require('../models/base/mongoModel');

class EscuelaRepository {
  list(query = {}, { sort = { escuela: 1 }, skip = 0, limit = 10 } = {}) {
    return Promise.all([
      Escuela.find(query)
        .populate({
          path: 'docentes',
          match: { activo: true },
          populate: { path: 'suplentes', match: { activo: true } }
        })
        .populate({ path: 'alumnos', match: { activo: true } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Escuela.countDocuments(query)
    ]).then(([items, total]) => ({ items, total }));
  }

  findById(id, { withNested = false } = {}) {
    const query = Escuela.findById(id);
    if (!withNested) return query.lean();

    return query
      .populate({ path: 'docentes', match: { activo: true }, populate: { path: 'suplentes', match: { activo: true } } })
      .populate({ path: 'alumnos', match: { activo: true } })
      .lean();
  }

  findDocumentById(id, select = null) {
    const query = Escuela.findById(id);
    return select ? query.select(select) : query;
  }

  async create(payload) {
    const escuela = new Escuela(payload);
    await escuela.save();
    return escuela;
  }

  async deleteById(id) {
    return Escuela.deleteOne({ _id: id });
  }

  async countRelatedActive(escuelaId) {
    const [docentes, alumnos] = await Promise.all([
      Docente.countDocuments({ escuela: escuelaId, activo: true }),
      Alumno.countDocuments({ escuela: escuelaId, activo: true })
    ]);
    return { docentes, alumnos };
  }

  search(query = {}, limit = 50) {
    return Escuela.find(query)
      .limit(limit)
      .populate('docentes', 'nombre apellido cargo estado')
      .lean();
  }

  findForInformeById(informeId) {
    return Escuela.findOne({ 'informes._id': informeId });
  }

  ensureSubdocIds(escuela) {
    escuela.informes = (escuela.informes || []).map((informe) => ({
      ...informe,
      _id: informe._id || toObjectId()
    }));
  }

  findNestedIndex(items, id) {
    const target = String(id || '').trim();
    if (!target) return -1;
    return (Array.isArray(items) ? items : []).findIndex((item) => String(item?._id || item?.id || '').trim() === target);
  }
}

module.exports = new EscuelaRepository();
