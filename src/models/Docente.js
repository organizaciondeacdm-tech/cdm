const { BaseMongoModel, BaseMongoDocument, toObjectId } = require('./base/mongoModel');

class Docente extends BaseMongoModel {
  static collectionName = 'docentes';
  static sensitiveFields = ['dni', 'cuil', 'email', 'emailSecundario', 'telefonos.numero'];
  static references = {
    escuela: { model: () => require('./Escuela'), localField: 'escuela', isArray: false },
    titularId: { model: () => require('./Docente'), localField: 'titularId', isArray: false },
    suplentes: { model: () => require('./Docente'), localField: 'suplentes', isArray: true }
  };

  static async preSave(payload) {
    if (payload.escuela) payload.escuela = toObjectId(payload.escuela);
    if (payload.titularId) payload.titularId = toObjectId(payload.titularId);
    if (payload.createdBy) payload.createdBy = toObjectId(payload.createdBy);
    if (payload.updatedBy) payload.updatedBy = toObjectId(payload.updatedBy);

    if (Array.isArray(payload.suplentes)) {
      payload.suplentes = payload.suplentes
        .map((s) => toObjectId(typeof s === 'object' ? (s._id || s.id || s) : s))
        .filter(Boolean);
    }
    // If suplentes is not in payload, leave existing value untouched (no else branch)

    if (payload.cargo === 'Suplente' && !payload.titularId) {
      throw new Error('Suplente debe tener un titular asociado');
    }

    if (payload.estado === 'Licencia' && !payload.fechaFinLicencia) {
      const defaultFin = new Date();
      defaultFin.setDate(defaultFin.getDate() + 30);
      payload.fechaFinLicencia = defaultFin;
    }

    if (!payload.activo && payload.activo !== false) payload.activo = true;
  }

  static findByEstado(estado) {
    return this.find({ estado, activo: true }).populate({ path: 'escuela', select: 'escuela de' });
  }

  static findLicenciasProximas(dias = 10) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + Number(dias || 10));

    return this.find({
      estado: 'Licencia',
      fechaFinLicencia: { $lte: fechaLimite, $gte: new Date() },
      activo: true
    }).populate({ path: 'escuela', select: 'escuela de' });
  }
}

Docente.documentPrototype = Object.create(BaseMongoDocument.prototype);
Docente.documentPrototype.agregarSuplente = async function agregarSuplente(suplenteId) {
  this.suplentes = this.suplentes || [];
  const id = String(suplenteId);
  if (!this.suplentes.some((s) => String(s) === id)) {
    this.suplentes.push(toObjectId(suplenteId));
    await this.save();
  }
};

Docente.documentPrototype.removerSuplente = async function removerSuplente(suplenteId) {
  this.suplentes = (this.suplentes || []).filter((id) => String(id) !== String(suplenteId));
  await this.save();
};

module.exports = Docente;
