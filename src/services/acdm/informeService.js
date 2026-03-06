const escuelaRepository = require('../../repositories/escuelaRepository');
const InformeEntity = require('../../entities/InformeEntity');
const { toObjectId } = require('../../models/base/mongoModel');
const { httpError } = require('../../utils/errorFactory');

class InformeService {
  async resolveEscuela(informeId, escuelaId) {
    if (escuelaId) return escuelaRepository.findDocumentById(escuelaId);
    if (!informeId) return null;
    return escuelaRepository.findForInformeById(informeId);
  }

  findInformeIndex(escuela, informeId) {
    return (escuela.informes || []).findIndex((informe) => String(informe._id) === String(informeId));
  }

  async create(payload = {}) {
    let escuelaId = payload.escuelaId;

    if (!escuelaId) {
      const primera = await escuelaRepository.list({}, { sort: { _id: 1 }, skip: 0, limit: 1 });
      escuelaId = primera.items?.[0]?._id;
      if (!escuelaId) {
        throw httpError(400, 'escuelaId es requerido y no hay escuelas disponibles');
      }
    }

    const escuela = await escuelaRepository.findDocumentById(escuelaId);
    if (!escuela) throw httpError(404, 'Escuela no encontrada');

    escuelaRepository.ensureSubdocIds(escuela);
    escuela.informes.push({ _id: toObjectId(), ...InformeEntity.normalizePayload(payload) });
    await escuela.save();

    return escuela.informes[escuela.informes.length - 1];
  }

  async list(escuelaId) {
    if (escuelaId) {
      const escuela = await escuelaRepository.findDocumentById(escuelaId);
      if (!escuela) throw httpError(404, 'Escuela no encontrada');
      return { informes: escuela.informes || [] };
    }

    const { items: escuelas } = await escuelaRepository.list({}, { sort: { _id: 1 }, skip: 0, limit: 10_000 });
    const informes = escuelas.flatMap((escuela) => (escuela.informes || []).map((informe) => ({
      ...informe,
      escuelaId: escuela._id,
      escuela: escuela.escuela,
      de: escuela.de
    })));

    return { informes };
  }

  async getById(informeId, escuelaId) {
    const escuela = await this.resolveEscuela(informeId, escuelaId);
    if (!escuela) throw httpError(404, 'Informe no encontrado');

    const index = this.findInformeIndex(escuela, informeId);
    if (index < 0) throw httpError(404, 'Informe no encontrado');

    return { informe: escuela.informes[index] };
  }

  async update(informeId, payload = {}, escuelaId) {
    const escuela = await this.resolveEscuela(informeId, escuelaId);
    if (!escuela) throw httpError(404, 'Informe no encontrado');

    const index = this.findInformeIndex(escuela, informeId);
    if (index < 0) throw httpError(404, 'Informe no encontrado');

    const updates = InformeEntity.normalizePayload(payload);
    if (Object.prototype.hasOwnProperty.call(payload, 'titulo')) escuela.informes[index].titulo = updates.titulo;
    if (Object.prototype.hasOwnProperty.call(payload, 'estado')) escuela.informes[index].estado = updates.estado;
    if (Object.prototype.hasOwnProperty.call(payload, 'fechaEntrega')) escuela.informes[index].fechaEntrega = updates.fechaEntrega;
    if (Object.prototype.hasOwnProperty.call(payload, 'observaciones')) escuela.informes[index].observaciones = updates.observaciones;

    await escuela.save();
    return { informe: escuela.informes[index] };
  }

  async remove(informeId, escuelaId) {
    const escuela = await this.resolveEscuela(informeId, escuelaId);
    if (!escuela) throw httpError(404, 'Informe no encontrado');

    const index = this.findInformeIndex(escuela, informeId);
    if (index < 0) throw httpError(404, 'Informe no encontrado');

    escuela.informes.splice(index, 1);
    await escuela.save();
    return true;
  }
}

module.exports = new InformeService();
