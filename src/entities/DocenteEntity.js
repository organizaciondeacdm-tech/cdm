const { splitNombreApellido } = require('./nameUtils');

class DocenteEntity {
  static normalizePayload(payload = {}, { partial = false } = {}) {
    const normalized = { ...(payload || {}) };
    const parsed = splitNombreApellido(normalized.nombreApellido);

    if (!normalized.nombre && parsed.nombre) normalized.nombre = parsed.nombre;
    if (!normalized.apellido && parsed.apellido) normalized.apellido = parsed.apellido;

    if (!partial) {
      const uniqueSeed = Date.now().toString().slice(-8);
      normalized.dni = normalized.dni || uniqueSeed;
      normalized.email = normalized.email || `${(normalized.nombre || 'docente').toLowerCase().replace(/\s+/g, '.')}.${uniqueSeed}@acdm.local`;
      normalized.fechaNacimiento = normalized.fechaNacimiento || '1990-01-01';
      normalized.cargo = normalized.cargo || 'Titular';
    }

    delete normalized.nombreApellido;
    delete normalized.id;
    delete normalized._id;
    delete normalized.suplentes; // managed server-side via addSuplenteToTitular
    delete normalized.escuela;   // comes from route context, not payload

    return normalized;
  }
}

module.exports = DocenteEntity;
