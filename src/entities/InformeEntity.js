class InformeEntity {
  static normalizePayload(source = {}) {
    const payload = source && typeof source === 'object' ? source : {};
    return {
      titulo: String(payload.titulo || '').trim() || 'Sin título',
      estado: String(payload.estado || 'Pendiente').trim() || 'Pendiente',
      fechaEntrega: payload.fechaEntrega || null,
      observaciones: String(payload.observaciones || '').trim()
    };
  }
}

module.exports = InformeEntity;
