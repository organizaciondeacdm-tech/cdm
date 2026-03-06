const Docente = require('../models/Docente');

class DocenteRepository {
  list(query = {}, { skip = 0, limit = 20 } = {}) {
    return Promise.all([
      Docente.find(query)
        .populate('escuela', 'escuela de')
        .populate('titularId', 'nombre apellido')
        .populate('suplentes', 'nombre apellido')
        .sort({ apellido: 1, nombre: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Docente.countDocuments(query)
    ]).then(([items, total]) => ({ items, total }));
  }

  findById(id, { populate = true } = {}) {
    const base = Docente.findById(id);
    return (populate
      ? base.populate('escuela', 'escuela de').populate('titularId', 'nombre apellido').populate('suplentes', 'nombre apellido email telefono')
      : base
    ).lean();
  }

  async findDocumentById(id) {
    return Docente.findById(id);
  }

  async create(payload) {
    const docente = new Docente(payload);
    await docente.save();
    return docente;
  }

  async addSuplenteToTitular(titularId, suplenteId) {
    return Docente.findByIdAndUpdate(titularId, { $addToSet: { suplentes: suplenteId } });
  }

  async removeSuplenteFromTitular(titularId, suplenteId) {
    return Docente.findByIdAndUpdate(titularId, { $pull: { suplentes: suplenteId } });
  }

  findLicenciasProximas(dias = 10) {
    return Docente.findLicenciasProximas(dias);
  }

  getStats() {
    return Docente.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          activos: { $sum: { $cond: [{ $eq: ['$estado', 'Activo'] }, 1, 0] } },
          licencia: { $sum: { $cond: [{ $eq: ['$estado', 'Licencia'] }, 1, 0] } },
          porCargo: { $push: '$cargo' }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          activos: 1,
          licencia: 1,
          porCargo: 1
        }
      }
    ]);
  }
}

module.exports = new DocenteRepository();
