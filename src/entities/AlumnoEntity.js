const { splitNombreApellido } = require('./nameUtils');

class AlumnoEntity {
  static normalizePayload(payload = {}, { partial = false } = {}) {
    const normalized = { ...(payload || {}) };
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
  }
}

module.exports = AlumnoEntity;
