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
          porDiagnostico: { $push: '$diagnosticoDetallado.tipo' },
          porEdad: {
            $push: {
              $let: {
                vars: {
                  edad: {
                    $floor: {
                      $divide: [
                        { $subtract: [new Date(), { $toDate: { $ifNull: ['$fechaNacimiento', new Date()] } }] },
                        365 * 24 * 60 * 60 * 1000
                      ]
                    }
                  }
                },
                in: '$$edad'
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          porDiagnostico: 1,
          porEdad: {
            $arrayToObject: {
              $map: {
                input: { $range: [0, 18, 3] },
                as: 'rango',
                in: {
                  k: { $concat: [{ $toString: '$$rango' }, '-', { $toString: { $add: ['$$rango', 3] } }] },
                  v: {
                    $size: {
                      $filter: {
                        input: '$porEdad',
                        cond: {
                          $and: [
                            { $gte: ['$$this', '$$rango'] },
                            { $lt: ['$$this', { $add: ['$$rango', 3] }] }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);
  }
}

module.exports = new AlumnoRepository();
