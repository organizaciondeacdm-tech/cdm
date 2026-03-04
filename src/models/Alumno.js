const { BaseMongoModel, BaseMongoDocument, toObjectId } = require('./base/mongoModel');

class Alumno extends BaseMongoModel {
  static collectionName = 'alumnos';
  static sensitiveFields = ['dni', 'contactos.telefono', 'contactos.email', 'obraSocial.numeroAfiliado', 'emergencias.telefonoEmergencia'];
  static references = {
    escuela: { model: () => require('./Escuela'), localField: 'escuela', isArray: false }
  };

  static async preSave(payload) {
    if (payload.escuela) payload.escuela = toObjectId(payload.escuela);
    if (payload.createdBy) payload.createdBy = toObjectId(payload.createdBy);
    if (payload.updatedBy) payload.updatedBy = toObjectId(payload.updatedBy);
    if (!payload.activo && payload.activo !== false) payload.activo = true;
    if (!Array.isArray(payload.contactos)) payload.contactos = [];
  }

  static findByEscuela(escuelaId) {
    return this.find({ escuela: toObjectId(escuelaId), activo: true }).sort({ gradoSalaAnio: 1, apellido: 1 });
  }

  static findByDiagnostico(tipoDiagnostico) {
    return this.find({ 'diagnosticoDetallado.tipo': tipoDiagnostico, activo: true }).populate({ path: 'escuela', select: 'escuela de' });
  }
}

Alumno.documentPrototype = Object.create(BaseMongoDocument.prototype);
Alumno.documentPrototype.agregarContacto = function agregarContacto(contacto) {
  this.contactos = this.contactos || [];
  if (contacto?.principal) {
    this.contactos.forEach((c) => { c.principal = false; });
  }
  this.contactos.push(contacto);
};

Alumno.documentPrototype.getContactoPrincipal = function getContactoPrincipal() {
  return (this.contactos || []).find((c) => c.principal) || (this.contactos || [])[0] || null;
};

module.exports = Alumno;
