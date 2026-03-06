const normalizeTelefonos = (telefonos = []) => {
  if (!Array.isArray(telefonos)) return [];
  return telefonos
    .map((telefono) => {
      if (typeof telefono === 'string') {
        const trimmed = telefono.trim();
        return trimmed ? { numero: trimmed, tipo: 'fijo', principal: false } : null;
      }

      if (telefono && typeof telefono === 'object' && telefono.numero) {
        return {
          numero: String(telefono.numero).trim(),
          tipo: telefono.tipo || 'fijo',
          principal: Boolean(telefono.principal)
        };
      }

      return null;
    })
    .filter(Boolean);
};

const inferLocalidad = (direccion = '') => {
  if (!direccion || typeof direccion !== 'string') return 'CABA';
  const parts = direccion.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : 'CABA';
};

const normalizeTurno = (turno) => {
  if (turno === 'Completa') return 'Completo';
  return turno;
};

class EscuelaEntity {
  static normalizePayload(input = {}, { partial = false } = {}) {
    const payload = { ...(input || {}) };

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

    // On partial update, skip de if it's empty (avoid wiping existing value)
    if (partial && Object.prototype.hasOwnProperty.call(payload, 'de') && !payload.de) {
      delete payload.de;
    }

    if (!partial || payload.ubicacion !== undefined || (payload.lat != null && payload.lat !== 0) || (payload.lng != null && payload.lng !== 0)) {
      const currentCoordinates = payload.ubicacion?.coordinates;
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);

      if (Array.isArray(currentCoordinates) && currentCoordinates.length === 2) {
        payload.ubicacion = {
          type: 'Point',
          coordinates: [Number(currentCoordinates[0]), Number(currentCoordinates[1])]
        };
      } else if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0)) {
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
  }

  static sanitizeNestedPayload(collection, source = {}) {
    const payload = source && typeof source === 'object' ? source : {};
    if (collection !== 'informes') return payload;

    return {
      titulo: String(payload.titulo || '').trim() || 'Sin título',
      estado: String(payload.estado || 'Pendiente').trim() || 'Pendiente',
      fechaEntrega: payload.fechaEntrega || null,
      observaciones: String(payload.observaciones || '').trim()
    };
  }
}

module.exports = EscuelaEntity;
