const escuelaRepository = require('../../repositories/escuelaRepository');
const docenteRepository = require('../../repositories/docenteRepository');
const Docente = require('../../models/Docente');
const Escuela = require('../../models/Escuela');
const Alumno = require('../../models/Alumno');
const EscuelaEntity = require('../../entities/EscuelaEntity');
const { canViewAllRecords } = require('./accessService');
const { httpError } = require('../../utils/errorFactory');
const domainEventOutboxService = require('../domainEventOutboxService');

class EscuelaService {
  async list(query = {}, currentUser) {
    const { page, limit, skip } = query;
    const filter = {};

    if (!await canViewAllRecords(currentUser)) {
      filter.createdBy = currentUser?._id;
    }

    if (query.de) filter.de = query.de;
    if (query.nivel) filter.nivel = query.nivel;
    if (query.estado) filter.estado = query.estado;
    else filter.estado = { $ne: 'inactiva' };

    if (query.search) {
      filter.$or = [
        { escuela: { $regex: query.search, $options: 'i' } },
        { de: { $regex: query.search, $options: 'i' } },
        { direccion: { $regex: query.search, $options: 'i' } }
      ];
    }

    const sort = { [query.sortBy || 'escuela']: query.order === 'desc' ? -1 : 1 };
    const { items, total } = await escuelaRepository.list(filter, { sort, skip, limit });

    const [porNivel, porDE] = await Promise.all([
      Escuela.aggregate([{ $match: filter }, { $group: { _id: '$nivel', count: { $sum: 1 } } }]),
      Escuela.aggregate([{ $match: filter }, { $group: { _id: '$de', count: { $sum: 1 } } }])
    ]);

    return {
      escuelas: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      estadisticas: { totalEscuelas: total, porNivel, porDE }
    };
  }

  async getById(id) {
    const escuela = await escuelaRepository.findById(id, { withNested: true });
    if (!escuela) throw httpError(404, 'Escuela no encontrada');
    return escuela;
  }

  async create(payload = {}, userId) {
    const escuela = await escuelaRepository.create({
      ...EscuelaEntity.normalizePayload(payload),
      createdBy: userId
    });
    await domainEventOutboxService.enqueue({
      aggregate: 'Escuela',
      aggregateId: escuela?._id,
      eventType: 'escuela.created',
      payload: { de: escuela?.de, nivel: escuela?.nivel },
      actorId: userId
    });
    return escuela;
  }

  async update(id, payload = {}, userId) {
    const escuela = await escuelaRepository.findDocumentById(id);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    Object.assign(escuela, EscuelaEntity.normalizePayload(payload, { partial: true }));
    escuela.updatedBy = userId;
    await escuela.save();
    await domainEventOutboxService.enqueue({
      aggregate: 'Escuela',
      aggregateId: escuela?._id || id,
      eventType: 'escuela.updated',
      payload: { fields: Object.keys(payload || {}) },
      actorId: userId
    });
    return escuela;
  }

  async remove(id) {
    const escuela = await escuelaRepository.findDocumentById(id);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    const { docentes, alumnos } = await escuelaRepository.countRelatedActive(escuela._id);
    if (docentes > 0 || alumnos > 0) {
      throw httpError(400, 'No se puede eliminar la escuela porque tiene docentes o alumnos asociados');
    }

    await escuelaRepository.deleteById(escuela._id);
    await domainEventOutboxService.enqueue({
      aggregate: 'Escuela',
      aggregateId: escuela?._id || id,
      eventType: 'escuela.deleted',
      payload: { de: escuela?.de, nivel: escuela?.nivel },
      actorId: null
    });
    return true;
  }

  async getStats(id = null) {
    if (!id) {
      const [totalEscuelas, totalDocentes, totalAlumnos, totalVisitas, totalProyectos, totalInformes] = await Promise.all([
        Escuela.countDocuments({ estado: { $ne: 'inactiva' } }),
        Docente.countDocuments({ activo: true }),
        Alumno.countDocuments({ activo: true }),
        Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$visitas', []] } } } } }]),
        Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$proyectos', []] } } } } }]),
        Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$informes', []] } } } } }])
      ]);

      return {
        totalEscuelas,
        totalDocentes,
        totalAlumnos,
        totalVisitas: totalVisitas[0]?.total || 0,
        totalProyectos: totalProyectos[0]?.total || 0,
        totalInformes: totalInformes[0]?.total || 0
      };
    }

    const escuela = await escuelaRepository.findDocumentById(id);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    const [alumnosPorGrado, docentesPorCargo, licenciasActivas, totalAlumnos, totalDocentes] = await Promise.all([
      Alumno.aggregate([{ $match: { escuela: escuela._id, activo: true } }, { $group: { _id: '$gradoSalaAnio', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Docente.aggregate([{ $match: { escuela: escuela._id, activo: true } }, { $group: { _id: '$cargo', count: { $sum: 1 } } }]),
      Docente.countDocuments({ escuela: escuela._id, estado: 'Licencia', activo: true }),
      Alumno.countDocuments({ escuela: escuela._id, activo: true }),
      Docente.countDocuments({ escuela: escuela._id, activo: true })
    ]);

    return {
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
        licenciasProximas: await docenteRepository.findLicenciasProximas(10).countDocuments()
      }
    };
  }

  async search(query = {}) {
    const filter = { estado: 'activa' };

    if (query.q) {
      filter.$or = [
        { escuela: { $regex: query.q, $options: 'i' } },
        { de: { $regex: query.q, $options: 'i' } },
        { direccion: { $regex: query.q, $options: 'i' } }
      ];
    }

    if (query.lat && query.lng && query.radio) {
      filter.ubicacion = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number.parseFloat(query.lng), Number.parseFloat(query.lat)]
          },
          $maxDistance: (Number.parseInt(query.radio, 10) || 0) * 1000
        }
      };
    }

    return escuelaRepository.search(filter, 50);
  }

  async getNestedCollection(escuelaId, collection) {
    const escuela = await escuelaRepository.findDocumentById(escuelaId, collection);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');
    return escuela[collection] || [];
  }

  async createNestedCollectionItem(escuelaId, collection, payload, userId) {
    const escuela = await escuelaRepository.findDocumentById(escuelaId);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    if (!Array.isArray(escuela[collection])) escuela[collection] = [];
    escuela[collection].push(EscuelaEntity.sanitizeNestedPayload(collection, payload));
    escuela.updatedBy = userId;
    await escuela.save();
    await domainEventOutboxService.enqueue({
      aggregate: 'Escuela',
      aggregateId: escuela?._id || escuelaId,
      eventType: `escuela.${collection}.created`,
      payload: { collection },
      actorId: userId
    });

    return escuela[collection][escuela[collection].length - 1];
  }

  async updateNestedCollectionItem(escuelaId, collection, itemId, payload, userId) {
    const escuela = await escuelaRepository.findDocumentById(escuelaId);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    const items = Array.isArray(escuela[collection]) ? [...escuela[collection]] : [];
    const index = escuelaRepository.findNestedIndex(items, itemId);
    if (index < 0) throw httpError(404, 'Registro no encontrado');

    const current = items[index] || {};
    const incoming = EscuelaEntity.sanitizeNestedPayload(collection, payload);
    const updated = {
      ...current,
      ...incoming,
      _id: current._id || incoming._id
    };
    delete updated.id;

    items[index] = updated;
    escuela[collection] = items;
    escuela.updatedBy = userId;
    await escuela.save();
    await domainEventOutboxService.enqueue({
      aggregate: 'Escuela',
      aggregateId: escuela?._id || escuelaId,
      eventType: `escuela.${collection}.updated`,
      payload: { collection, itemId },
      actorId: userId
    });

    return escuela[collection][index];
  }

  async deleteNestedCollectionItem(escuelaId, collection, itemId, userId) {
    const escuela = await escuelaRepository.findDocumentById(escuelaId);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    const items = Array.isArray(escuela[collection]) ? [...escuela[collection]] : [];
    const index = escuelaRepository.findNestedIndex(items, itemId);
    if (index < 0) throw httpError(404, 'Registro no encontrado');

    items.splice(index, 1);
    escuela[collection] = items;
    escuela.updatedBy = userId;
    await escuela.save();
    await domainEventOutboxService.enqueue({
      aggregate: 'Escuela',
      aggregateId: escuela?._id || escuelaId,
      eventType: `escuela.${collection}.deleted`,
      payload: { collection, itemId },
      actorId: userId
    });
    return true;
  }
}

module.exports = new EscuelaService();
