const docenteRepository = require('../../repositories/docenteRepository');
const escuelaRepository = require('../../repositories/escuelaRepository');
const DocenteEntity = require('../../entities/DocenteEntity');
const { canViewAllRecords } = require('./accessService');
const { httpError } = require('../../utils/errorFactory');
const domainEventOutboxService = require('../domainEventOutboxService');

class DocenteService {
  async list(query = {}, currentUser) {
    const { page, limit, skip } = query;
    const filter = { activo: true };

    if (!await canViewAllRecords(currentUser)) {
      filter.createdBy = currentUser?._id;
    }

    if (query.escuela) filter.escuela = query.escuela;
    if (query.estado) filter.estado = query.estado;
    if (query.cargo) filter.cargo = query.cargo;

    if (query.licenciasProximas) {
      const dias = Number.parseInt(query.licenciasProximas, 10) || 10;
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + dias);
      filter.estado = 'Licencia';
      filter.fechaFinLicencia = { $lte: fechaLimite, $gte: new Date() };
    }

    if (query.search) {
      filter.$or = [
        { nombre: { $regex: query.search, $options: 'i' } },
        { apellido: { $regex: query.search, $options: 'i' } },
        { dni: { $regex: query.search, $options: 'i' } }
      ];
    }

    const { items, total } = await docenteRepository.list(filter, { skip, limit });

    return {
      docentes: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id) {
    const docente = await docenteRepository.findById(id);
    if (!docente) throw httpError(404, 'Docente no encontrado');
    return docente;
  }

  async create(payload = {}, userId) {
    const escuelaId = payload.escuela || payload.escuelaId;
    const titularId = payload.titularId;

    const escuela = await escuelaRepository.findDocumentById(escuelaId);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    const docenteData = DocenteEntity.normalizePayload(payload);

    if (docenteData.cargo === 'Suplente') {
      if (!titularId) throw httpError(400, 'Suplente debe tener un titular asociado');
      const titular = await docenteRepository.findDocumentById(titularId);
      if (!titular) throw httpError(404, 'Titular no encontrado');
      if (String(titular.escuela) !== String(escuelaId)) {
        throw httpError(400, 'Titular debe pertenecer a la misma escuela');
      }
    }

    const docente = await docenteRepository.create({
      ...docenteData,
      escuela: escuelaId,
      titularId,
      createdBy: userId
    });

    if (docenteData.cargo === 'Suplente' && titularId) {
      await docenteRepository.addSuplenteToTitular(titularId, docente._id);
    }

    await escuela.actualizarEstadisticas();
    await domainEventOutboxService.enqueue({
      aggregate: 'Docente',
      aggregateId: docente?._id,
      eventType: 'docente.created',
      payload: { escuelaId, titularId: titularId || null, cargo: docenteData.cargo },
      actorId: userId
    });
    return docente;
  }

  async update(id, payload = {}, userId) {
    const docente = await docenteRepository.findDocumentById(id);
    if (!docente) throw httpError(404, 'Docente no encontrado');

    const oldEstado = docente.estado;
    const newEstado = payload.estado;

    Object.assign(docente, DocenteEntity.normalizePayload(payload, { partial: true }));
    docente.updatedBy = userId;
    await docente.save();

    if (oldEstado !== newEstado) {
      const escuela = await escuelaRepository.findDocumentById(docente.escuela);
      if (escuela) await escuela.actualizarEstadisticas();
    }
    await domainEventOutboxService.enqueue({
      aggregate: 'Docente',
      aggregateId: docente?._id || id,
      eventType: 'docente.updated',
      payload: { oldEstado, newEstado, fields: Object.keys(payload || {}) },
      actorId: userId
    });

    return docente;
  }

  async remove(id, userId) {
    const docente = await docenteRepository.findDocumentById(id);
    if (!docente) throw httpError(404, 'Docente no encontrado');

    docente.activo = false;
    docente.estado = 'Renunció';
    docente.updatedBy = userId;
    await docente.save();

    if (docente.titularId) {
      await docenteRepository.removeSuplenteFromTitular(docente.titularId, docente._id);
    }

    const escuela = await escuelaRepository.findDocumentById(docente.escuela);
    if (escuela) await escuela.actualizarEstadisticas();
    await domainEventOutboxService.enqueue({
      aggregate: 'Docente',
      aggregateId: docente?._id || id,
      eventType: 'docente.deleted',
      payload: { escuelaId: docente?.escuela, titularId: docente?.titularId || null },
      actorId: userId
    });

    return true;
  }

  async getLicenciasProximas(dias = 10) {
    return docenteRepository.findLicenciasProximas(dias);
  }

  async getStats() {
    const stats = await docenteRepository.getStats();
    const result = stats[0] || { total: 0, activos: 0, licencia: 0, porCargo: [] };

    const cargoMap = {};
    (result.porCargo || []).forEach((cargo) => {
      cargoMap[cargo] = (cargoMap[cargo] || 0) + 1;
    });

    return {
      ...result,
      porCargo: cargoMap
    };
  }
}

module.exports = new DocenteService();
