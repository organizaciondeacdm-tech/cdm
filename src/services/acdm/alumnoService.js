const alumnoRepository = require('../../repositories/alumnoRepository');
const escuelaRepository = require('../../repositories/escuelaRepository');
const AlumnoEntity = require('../../entities/AlumnoEntity');
const { canViewAllRecords } = require('./accessService');
const { httpError } = require('../../utils/errorFactory');
const domainEventOutboxService = require('../domainEventOutboxService');

class AlumnoService {
  async list(query = {}, currentUser) {
    const { page, limit, skip } = query;
    const filter = { activo: true };

    if (!await canViewAllRecords(currentUser)) {
      filter.createdBy = currentUser?._id;
    }

    if (query.escuela) filter.escuela = query.escuela;
    if (query.gradoSalaAnio) filter.gradoSalaAnio = query.gradoSalaAnio;
    if (query.diagnostico) filter['diagnosticoDetallado.tipo'] = query.diagnostico;

    if (query.search) {
      filter.$or = [
        { nombre: { $regex: query.search, $options: 'i' } },
        { apellido: { $regex: query.search, $options: 'i' } },
        { dni: { $regex: query.search, $options: 'i' } }
      ];
    }

    const { items, total } = await alumnoRepository.list(filter, { skip, limit });

    return {
      alumnos: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id) {
    const alumno = await alumnoRepository.findById(id);
    if (!alumno) throw httpError(404, 'Alumno no encontrado');
    return alumno;
  }

  async create(payload = {}, userId) {
    const escuelaId = payload.escuela || payload.escuelaId;
    const escuela = await escuelaRepository.findDocumentById(escuelaId);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    const alumno = await alumnoRepository.create({
      ...AlumnoEntity.normalizePayload(payload),
      escuela: escuelaId,
      createdBy: userId
    });

    await escuela.actualizarEstadisticas();
    await domainEventOutboxService.enqueue({
      aggregate: 'Alumno',
      aggregateId: alumno?._id,
      eventType: 'alumno.created',
      payload: { escuelaId: escuelaId },
      actorId: userId
    });
    return alumno;
  }

  async update(id, payload = {}, userId) {
    const alumno = await alumnoRepository.updateById(id, AlumnoEntity.normalizePayload(payload, { partial: true }), userId);
    if (!alumno) throw httpError(404, 'Alumno no encontrado');
    await domainEventOutboxService.enqueue({
      aggregate: 'Alumno',
      aggregateId: alumno?._id || id,
      eventType: 'alumno.updated',
      payload: { fields: Object.keys(payload || {}) },
      actorId: userId
    });
    return alumno;
  }

  async remove(id, userId) {
    const alumno = await alumnoRepository.softDeleteById(id, userId);
    if (!alumno) throw httpError(404, 'Alumno no encontrado');

    const escuela = await escuelaRepository.findDocumentById(alumno.escuela);
    if (escuela) await escuela.actualizarEstadisticas();
    await domainEventOutboxService.enqueue({
      aggregate: 'Alumno',
      aggregateId: alumno?._id || id,
      eventType: 'alumno.deleted',
      payload: { escuelaId: alumno?.escuela },
      actorId: userId
    });

    return true;
  }

  async getStats() {
    const stats = await alumnoRepository.getStats();
    return stats[0] || { total: 0, porDiagnostico: [], porEdad: {} };
  }
}

module.exports = new AlumnoService();
