const Alumno = require('../models/Alumno');
const Escuela = require('../models/Escuela');

const splitNombreApellido = (nombreCompleto = '') => {
  const value = String(nombreCompleto).trim();
  if (!value) return { nombre: '', apellido: '' };
  if (value.includes(',')) {
    const [apellido, nombre] = value.split(',').map(v => v.trim());
    return { nombre: nombre || '', apellido: apellido || '' };
  }
  const parts = value.split(/\s+/);
  const nombre = parts.pop() || '';
  const apellido = parts.join(' ') || value;
  return { nombre, apellido };
};

const normalizeAlumnoPayload = (payload = {}, { partial = false } = {}) => {
  const normalized = { ...payload };
  const parsed = splitNombreApellido(normalized.nombre);

  if (!normalized.apellido && parsed.apellido) normalized.apellido = parsed.apellido;
  if (parsed.nombre) normalized.nombre = parsed.nombre;

  if (!partial) {
    const uniqueSeed = Date.now().toString().slice(-8);
    normalized.dni = normalized.dni || uniqueSeed;
    normalized.fechaNacimiento = normalized.fechaNacimiento || '2015-01-01';
    normalized.gradoSalaAnio = normalized.gradoSalaAnio || 'Sin grado';
    normalized.diagnostico = normalized.diagnostico || 'Sin especificar';
  }

  delete normalized.id;
  delete normalized._id;

  return normalized;
};

const getAlumnos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      escuela,
      gradoSalaAnio,
      diagnostico,
      search
    } = req.query;

    const query = { activo: true };

    if (escuela) query.escuela = escuela;
    if (gradoSalaAnio) query.gradoSalaAnio = gradoSalaAnio;
    if (diagnostico) query['diagnosticoDetallado.tipo'] = diagnostico;

    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { apellido: { $regex: search, $options: 'i' } },
        { dni: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [alumnos, total] = await Promise.all([
      Alumno.find(query)
        .populate('escuela', 'escuela de')
        .sort({ apellido: 1, nombre: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Alumno.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        alumnos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener alumnos'
    });
  }
};

const getAlumnoById = async (req, res) => {
  try {
    const alumno = await Alumno.findById(req.params.id)
      .populate('escuela', 'escuela de')
      .lean();

    if (!alumno) {
      return res.status(404).json({
        success: false,
        error: 'Alumno no encontrado'
      });
    }

    res.json({
      success: true,
      data: alumno
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener alumno'
    });
  }
};

const createAlumno = async (req, res) => {
  try {
    const escuelaId = req.body.escuela || req.body.escuelaId;
    const alumnoData = normalizeAlumnoPayload(req.body);

    // Verificar escuela
    const escuela = await Escuela.findById(escuelaId);
    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    const alumno = new Alumno({
      ...alumnoData,
      escuela: escuelaId,
      createdBy: req.user._id
    });

    await alumno.save();

    // Actualizar estadísticas de la escuela
    await escuela.actualizarEstadisticas();

    res.status(201).json({
      success: true,
      data: alumno,
      message: 'Alumno creado exitosamente'
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'El DNI ya existe'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear alumno'
    });
  }
};

const updateAlumno = async (req, res) => {
  try {
    const alumno = await Alumno.findById(req.params.id);

    if (!alumno) {
      return res.status(404).json({
        success: false,
        error: 'Alumno no encontrado'
      });
    }

    Object.assign(alumno, normalizeAlumnoPayload(req.body, { partial: true }));
    alumno.updatedBy = req.user._id;

    await alumno.save();

    res.json({
      success: true,
      data: alumno,
      message: 'Alumno actualizado exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar alumno'
    });
  }
};

const deleteAlumno = async (req, res) => {
  try {
    const alumno = await Alumno.findById(req.params.id);

    if (!alumno) {
      return res.status(404).json({
        success: false,
        error: 'Alumno no encontrado'
      });
    }

    // Soft delete
    alumno.activo = false;
    alumno.updatedBy = req.user._id;
    await alumno.save();

    // Actualizar estadísticas de la escuela
    const escuela = await Escuela.findById(alumno.escuela);
    await escuela.actualizarEstadisticas();

    res.json({
      success: true,
      message: 'Alumno eliminado exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar alumno'
    });
  }
};

const getEstadisticasAlumnos = async (req, res) => {
  try {
    const estadisticas = await Alumno.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          porDiagnostico: {
            $push: '$diagnosticoDetallado.tipo'
          },
          porEdad: {
            $push: {
              $let: {
                vars: {
                  edad: {
                    $floor: {
                      $divide: [
                        { $subtract: [new Date(), '$fechaNacimiento'] },
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
                input: {
                  $range: [0, 18, 3]
                },
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

    res.json({
      success: true,
      data: estadisticas[0] || { total: 0, porDiagnostico: [], porEdad: {} }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

module.exports = {
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno,
  getEstadisticasAlumnos
};
