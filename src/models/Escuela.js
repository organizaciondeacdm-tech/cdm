const { BaseMongoModel, BaseMongoDocument, toObjectId } = require('./base/mongoModel');

class Escuela extends BaseMongoModel {
  static collectionName = 'escuelas';
  static sensitiveFields = ['email', 'emailSecundario', 'telefonos.numero', 'director.telefono', 'vicedirector.telefono', 'secretario.telefono'];
  static references = {
    docentes: { model: () => require('./Docente'), foreignField: 'escuela', isArray: true },
    alumnos: { model: () => require('./Alumno'), foreignField: 'escuela', isArray: true }
  };

  static async preSave(payload) {
    if (payload.de) {
      const deNum = String(payload.de).replace(/\D/g, '');
      payload.de = `DE ${deNum.padStart(2, '0')}`;
    }

    if (!Array.isArray(payload.visitas)) payload.visitas = [];
    if (!Array.isArray(payload.proyectos)) payload.proyectos = [];
    if (!Array.isArray(payload.informes)) payload.informes = [];
    if (!Array.isArray(payload.citas)) payload.citas = [];

    payload.visitas = payload.visitas.map((item) => ({
      _id: item?._id ? toObjectId(item._id) : toObjectId(),
      fecha: item?.fecha ? new Date(item.fecha) : new Date(),
      visitante: item?.visitante || '',
      observaciones: item?.observaciones || '',
      createdAt: item?.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: new Date()
    }));

    payload.proyectos = payload.proyectos.map((item) => ({
      _id: item?._id ? toObjectId(item._id) : toObjectId(),
      nombre: item?.nombre || 'Sin nombre',
      descripcion: item?.descripcion || '',
      estado: item?.estado || 'En Progreso',
      fechaInicio: item?.fechaInicio ? new Date(item.fechaInicio) : new Date(),
      fechaBaja: item?.fechaBaja ? new Date(item.fechaBaja) : null,
      createdAt: item?.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: new Date()
    }));

    payload.informes = payload.informes.map((item) => ({
      _id: item?._id ? toObjectId(item._id) : toObjectId(),
      titulo: item?.titulo || 'Sin título',
      estado: item?.estado || 'Pendiente',
      fechaEntrega: item?.fechaEntrega ? new Date(item.fechaEntrega) : null,
      observaciones: item?.observaciones || '',
      createdAt: item?.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: new Date()
    }));

    payload.citas = payload.citas.map((item) => ({
      _id: item?._id ? toObjectId(item._id) : toObjectId(),
      titulo: item?.titulo || 'Sin título',
      descripcion: item?.descripcion || '',
      fecha: item?.fecha ? new Date(item.fecha) : new Date(),
      hora: item?.hora || '',
      participantes: item?.participantes || '',
      visitaId: item?.visitaId ? toObjectId(item.visitaId) : null,
      createdAt: item?.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: new Date()
    }));

    if (payload.createdBy) payload.createdBy = toObjectId(payload.createdBy);
    if (payload.updatedBy) payload.updatedBy = toObjectId(payload.updatedBy);
  }
}

Escuela.documentPrototype = Object.create(BaseMongoDocument.prototype);
Escuela.documentPrototype.actualizarEstadisticas = async function actualizarEstadisticas() {
  const Alumno = require('./Alumno');
  const Docente = require('./Docente');

  const [totalAlumnos, totalDocentes] = await Promise.all([
    Alumno.countDocuments({ escuela: this._id, activo: true }),
    Docente.countDocuments({ escuela: this._id, activo: true })
  ]);

  this.estadisticas = this.estadisticas || {};
  this.estadisticas.totalAlumnos = totalAlumnos;
  this.estadisticas.totalDocentes = totalDocentes;

  return this.save();
};

module.exports = Escuela;
