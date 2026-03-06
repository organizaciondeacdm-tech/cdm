const Alumno = require('../models/Alumno');

class AlumnoRepository {
  list(query = {}, { skip = 0, limit = 20 } = {}) {
    return Promise.all([
      Alumno.find(query)
        .populate('escuela', 'escuela de')
        .sort({ apellido: 1, nombre: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alumno.countDocuments(query)
    ]).then(([items, total]) => ({ items, total }));
  }

  findById(id, { populate = true } = {}) {
    const baseQuery = Alumno.findById(id);
    return (populate ? baseQuery.populate('escuela', 'escuela de') : baseQuery).lean();
  }

  async create(payload) {
    const alumno = new Alumno(payload);
    await alumno.save();
    return alumno;
  }

  async updateById(id, payload, updatedBy) {
    const alumno = await Alumno.findById(id);
    if (!alumno) return null;
    Object.assign(alumno, payload);
    alumno.updatedBy = updatedBy;
    await alumno.save();
    return alumno;
  }

  async softDeleteById(id, updatedBy) {
    const alumno = await Alumno.findById(id);
    if (!alumno) return null;
    alumno.activo = false;
    alumno.updatedBy = updatedBy;
    await alumno.save();
    return alumno;
  }

  getStats() {
    return Alumno.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          porDiagnostico: { $push: '$diagnosticoDetallado.tipo' }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          porDiagnostico: 1,
          porEdad: { $literal: {} }
        }
      }
    ]);
  }
}

module.exports = new AlumnoRepository();
