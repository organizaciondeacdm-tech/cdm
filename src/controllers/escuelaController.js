const Escuela = require('../models/Escuela');
const Docente = require('../models/Docente');
const Alumno = require('../models/Alumno');

const normalizeTelefonos = (telefonos = []) => {
  if (!Array.isArray(telefonos)) return [];
  return telefonos
    .map(t => {
      if (typeof t === 'string') {
        return t.trim() ? { numero: t.trim(), tipo: 'fijo', principal: false } : null;
      }
      if (t && typeof t === 'object' && t.numero) {
        return {
          numero: String(t.numero).trim(),
          tipo: t.tipo || 'fijo',
          principal: Boolean(t.principal)
        };
      }
      return null;
    })
    .filter(Boolean);
};

const inferLocalidad = (direccion = '') => {
  if (!direccion || typeof direccion !== 'string') return 'CABA';
  const parts = direccion.split(',').map(p => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : 'CABA';
};

const normalizeTurno = (turno) => {
  if (turno === 'Completa') return 'Completo';
  return turno;
};

const buildEscuelaPayload = (input = {}, { partial = false } = {}) => {
  const payload = { ...input };

  if (Object.prototype.hasOwnProperty.call(payload, 'mail') && !Object.prototype.hasOwnProperty.call(payload, 'email')) {
    payload.email = payload.mail;
  }

  if (!partial) {
    payload.localidad = payload.localidad || inferLocalidad(payload.direccion);
  } else if (payload.localidad !== undefined) {
    payload.localidad = payload.localidad || inferLocalidad(payload.direccion);
  }

  if (!partial || payload.turno !== undefined) {
    payload.turno = normalizeTurno(payload.turno || 'Mañana');
  }

  if (!partial || payload.jornada !== undefined) {
    payload.jornada = payload.jornada || 'Simple';
  }

  if (!partial || payload.telefonos !== undefined) {
    payload.telefonos = normalizeTelefonos(payload.telefonos || []);
  }

  if (!partial || payload.ubicacion !== undefined || payload.lat !== undefined || payload.lng !== undefined) {
    const currentCoordinates = payload.ubicacion?.coordinates;
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);

    if (Array.isArray(currentCoordinates) && currentCoordinates.length === 2) {
      payload.ubicacion = {
        type: 'Point',
        coordinates: [Number(currentCoordinates[0]), Number(currentCoordinates[1])]
      };
    } else if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      payload.ubicacion = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }
  }

  if (!partial) {
    payload.estado = payload.estado || 'activa';
    payload.email = payload.email || 'sin-email@acdm.local';
  }

  delete payload.id;
  delete payload._id;
  delete payload.mail;
  delete payload.lat;
  delete payload.lng;

  return payload;
};

const isAdminOrSuperUser = (user) => {
  const rol = String(user?.rol || '');
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];;
  return rol === 'admin' || permisos.includes('*');
};

const getEscuelas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      de,
      nivel,
      estado,
      search,
      sortBy = 'escuela',
      order = 'asc'
    } = req.query;

    const query = {};

    // Los usuarios no-admin solo ven sus propios registros
    if (!isAdminOrSuperUser(req.user)) {
      query.createdBy = req.user._id;
    }

    if (de) query.de = de;
    if (nivel) query.nivel = nivel;
    if (estado) {
      query.estado = estado;
    } else {
      query.estado = { $ne: 'inactiva' };
    }
    if (search) {
      query.$or = [
        { escuela: { $regex: search, $options: 'i' } },
        { de: { $regex: search, $options: 'i' } },
        { direccion: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [escuelas, total] = await Promise.all([
      Escuela.find(query)
        .populate({
          path: 'docentes',
          match: { activo: true }
        })
        .populate({
          path: 'alumnos',
          match: { activo: true }
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Escuela.countDocuments(query)
    ]);

    const estadisticas = {
      totalEscuelas: total,
      porNivel: await Escuela.aggregate([
        { $match: query },
        { $group: { _id: '$nivel', count: { $sum: 1 } } }
      ]),
      porDE: await Escuela.aggregate([
        { $match: query },
        { $group: { _id: '$de', count: { $sum: 1 } } }
      ])
    };

    res.json({
      success: true,
      data: {
        escuelas,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10))
        },
        estadisticas
      }
    });
  } catch (error) {
    console.error('Error getting escuelas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener escuelas'
    });
  }
};

const getEscuelaById = async (req, res) => {
  try {
    const escuela = await Escuela.findById(req.params.id)
      .populate({
        path: 'docentes',
        match: { activo: true },
        populate: {
          path: 'suplentes',
          match: { activo: true }
        }
      })
      .populate({
        path: 'alumnos',
        match: { activo: true }
      })
      .lean();

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    res.json({
      success: true,
      data: escuela
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener escuela'
    });
  }
};

const createEscuela = async (req, res) => {
  try {
    const escuelaData = {
      ...buildEscuelaPayload(req.body),
      createdBy: req.user._id
    };

    const escuela = new Escuela(escuelaData);
    await escuela.save();

    res.status(201).json({
      success: true,
      data: escuela,
      message: 'Escuela creada exitosamente'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'La escuela ya existe'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear escuela'
    });
  }
};

const updateEscuela = async (req, res) => {
  try {
    const escuela = await Escuela.findById(req.params.id);

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    Object.assign(escuela, buildEscuelaPayload(req.body, { partial: true }));
    escuela.updatedBy = req.user._id;

    await escuela.save();

    res.json({
      success: true,
      data: escuela,
      message: 'Escuela actualizada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar escuela'
    });
  }
};

const deleteEscuela = async (req, res) => {
  try {
    const escuela = await Escuela.findById(req.params.id);

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    const [docentes, alumnos] = await Promise.all([
      Docente.countDocuments({ escuela: escuela._id, activo: true }),
      Alumno.countDocuments({ escuela: escuela._id, activo: true })
    ]);

    if (docentes > 0 || alumnos > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar la escuela porque tiene docentes o alumnos asociados'
      });
    }

    escuela.estado = 'inactiva';
    escuela.updatedBy = req.user._id;
    await escuela.save();

    res.json({
      success: true,
      message: 'Escuela eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar escuela'
    });
  }
};

const getEstadisticasEscuela = async (req, res) => {
  try {
    if (!req.params.id) {
      const [totalEscuelas, totalDocentes, totalAlumnos, totalVisitas, totalProyectos, totalInformes] = await Promise.all([
        Escuela.countDocuments({ estado: { $ne: 'inactiva' } }),
        Docente.countDocuments({ activo: true }),
        Alumno.countDocuments({ activo: true }),
        Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$visitas', []] } } } } }]),
        Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$proyectos', []] } } } } }]),
        Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$informes', []] } } } } }])
      ]);

      return res.json({
        success: true,
        data: {
          totalEscuelas,
          totalDocentes,
          totalAlumnos,
          totalVisitas: totalVisitas[0]?.total || 0,
          totalProyectos: totalProyectos[0]?.total || 0,
          totalInformes: totalInformes[0]?.total || 0
        }
      });
    }

    const escuela = await Escuela.findById(req.params.id);

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    const [alumnosPorGrado, docentesPorCargo, licenciasActivas, totalAlumnos, totalDocentes] = await Promise.all([
      Alumno.aggregate([
        { $match: { escuela: escuela._id, activo: true } },
        { $group: { _id: '$gradoSalaAnio', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Docente.aggregate([
        { $match: { escuela: escuela._id, activo: true } },
        { $group: { _id: '$cargo', count: { $sum: 1 } } }
      ]),
      Docente.countDocuments({
        escuela: escuela._id,
        estado: 'Licencia',
        activo: true
      }),
      Alumno.countDocuments({ escuela: escuela._id, activo: true }),
      Docente.countDocuments({ escuela: escuela._id, activo: true })
    ]);

    res.json({
      success: true,
      data: {
        totalAlumnos,
        totalDocentes,
        totalVisitas: (escuela.visitas || []).length,
        totalProyectos: (escuela.proyectos || []).length,
        totalInformes: (escuela.informes || []).length,
        alumnosPorGrado,
        docentesPorCargo,
        licenciasActivas,
        alertas: {
          sinDocentes: totalDocentes === 0,
          licenciasProximas: await Docente.findLicenciasProximas(10).countDocuments()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

const buscarEscuelas = async (req, res) => {
  try {
    const { q, lat, lng, radio } = req.query;

    const query = { estado: 'activa' };

    if (q) {
      query.$or = [
        { escuela: { $regex: q, $options: 'i' } },
        { de: { $regex: q, $options: 'i' } },
        { direccion: { $regex: q, $options: 'i' } }
      ];
    }

    if (lat && lng && radio) {
      query.ubicacion = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radio, 10) * 1000
        }
      };
    }

    const escuelas = await Escuela.find(query)
      .limit(50)
      .populate('docentes', 'nombre apellido cargo estado')
      .lean();

    res.json({
      success: true,
      data: escuelas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar escuelas'
    });
  }
};

const getNestedCollection = async (req, res, collection) => {
  try {
    const escuela = await Escuela.findById(req.params.id).select(collection);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    res.json({
      success: true,
      data: escuela[collection] || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: `Error al obtener ${collection}` });
  }
};

const createNestedCollectionItem = async (req, res, collection) => {
  try {
    const escuela = await Escuela.findById(req.params.id);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    escuela[collection].push(req.body || {});
    escuela.updatedBy = req.user._id;
    await escuela.save();

    const created = escuela[collection][escuela[collection].length - 1];

    res.status(201).json({
      success: true,
      data: created,
      message: `${collection.slice(0, -1)} creado exitosamente`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: `Error al crear ${collection.slice(0, -1)}` });
  }
};

const updateNestedCollectionItem = async (req, res, collection, idParam) => {
  try {
    const escuela = await Escuela.findById(req.params.id);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    const item = escuela[collection].id(req.params[idParam]);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    Object.assign(item, req.body || {});
    escuela.updatedBy = req.user._id;
    await escuela.save();

    res.json({
      success: true,
      data: item,
      message: `${collection.slice(0, -1)} actualizado exitosamente`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: `Error al actualizar ${collection.slice(0, -1)}` });
  }
};

const deleteNestedCollectionItem = async (req, res, collection, idParam) => {
  try {
    const escuela = await Escuela.findById(req.params.id);
    if (!escuela) {
      return res.status(404).json({ success: false, error: 'Escuela no encontrada' });
    }

    const item = escuela[collection].id(req.params[idParam]);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    item.deleteOne();
    escuela.updatedBy = req.user._id;
    await escuela.save();

    res.json({
      success: true,
      message: `${collection.slice(0, -1)} eliminado exitosamente`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: `Error al eliminar ${collection.slice(0, -1)}` });
  }
};

const getVisitas = (req, res) => getNestedCollection(req, res, 'visitas');
const createVisita = (req, res) => createNestedCollectionItem(req, res, 'visitas');
const updateVisita = (req, res) => updateNestedCollectionItem(req, res, 'visitas', 'visitaId');
const deleteVisita = (req, res) => deleteNestedCollectionItem(req, res, 'visitas', 'visitaId');

const getProyectos = (req, res) => getNestedCollection(req, res, 'proyectos');
const createProyecto = (req, res) => createNestedCollectionItem(req, res, 'proyectos');
const updateProyecto = (req, res) => updateNestedCollectionItem(req, res, 'proyectos', 'proyectoId');
const deleteProyecto = (req, res) => deleteNestedCollectionItem(req, res, 'proyectos', 'proyectoId');

const getInformesEscuela = (req, res) => getNestedCollection(req, res, 'informes');
const createInformeEscuela = (req, res) => createNestedCollectionItem(req, res, 'informes');
const updateInformeEscuela = (req, res) => updateNestedCollectionItem(req, res, 'informes', 'informeId');
const deleteInformeEscuela = (req, res) => deleteNestedCollectionItem(req, res, 'informes', 'informeId');

module.exports = {
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
  deleteInformeEscuela
};
