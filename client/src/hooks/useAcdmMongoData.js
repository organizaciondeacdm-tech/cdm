import { useState, useEffect, useCallback } from 'react';
import { authFetch, getAuthSession } from '../utils/authSession.js';
import { ACDM_EVENTS, emitAcdmEvent, useAcdmEvent } from './useAcdmEvents.js';
import { readJsonPayload } from '../utils/payloadCrypto.js';

const toDateInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

const splitNombreApellido = (value = '') => {
  const normalized = String(value).trim();
  if (!normalized) return { nombre: '', apellido: '' };

  if (normalized.includes(',')) {
    const [apellido, nombre] = normalized.split(',').map(part => part.trim());
    return { nombre: nombre || '', apellido: apellido || '' };
  }

  const parts = normalized.split(/\s+/);
  const nombre = parts.pop() || '';
  const apellido = parts.join(' ') || normalized;
  return { nombre, apellido };
};

const resolveEntityId = (value) => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const id = String(value).trim();
    return id || null;
  }
  if (typeof value !== 'object') return null;
  const id = value._id || value.id;
  if (!id) return null;
  return String(id).trim() || null;
};

const toDocenteDisplayName = (docente = {}) => {
  const explicit = String(docente.nombreApellido || '').trim();
  if (explicit) return explicit;
  const apellido = String(docente.apellido || '').trim();
  const nombre = String(docente.nombre || '').trim();
  const combined = [apellido, nombre].filter(Boolean).join(', ');
  return combined || 'Sin nombre';
};

const mapSuplente = (suplente) => {
  const id = resolveEntityId(suplente);
  if (!id) return null;
  const raw = (suplente && typeof suplente === 'object') ? suplente : { _id: id };
  return {
    ...raw,
    id,
    titularId: resolveEntityId(raw.titularId),
    cargo: raw.cargo || 'Suplente',
    nombreApellido: toDocenteDisplayName(raw),
    estado: raw.estado || 'Activo',
    jornada: raw.jornada || 'Completa',
    motivo: raw.motivo || '-',
    diasAutorizados: Number(raw.diasAutorizados || 0),
    fechaInicioLicencia: toDateInput(raw.fechaInicioLicencia),
    fechaFinLicencia: toDateInput(raw.fechaFinLicencia)
  };
};

const mapDocente = (docente = {}) => ({
  ...docente,
  id: resolveEntityId(docente),
  titularId: resolveEntityId(docente.titularId),
  cargo: docente.cargo || 'Interino',
  nombreApellido: toDocenteDisplayName(docente),
  jornada: docente.jornada || 'Completa',
  estado: docente.estado || 'Activo',
  motivo: docente.motivo || '-',
  diasAutorizados: Number(docente.diasAutorizados || 0),
  suplentes: (docente.suplentes || []).map(mapSuplente).filter(Boolean),
  fechaInicioLicencia: toDateInput(docente.fechaInicioLicencia),
  fechaFinLicencia: toDateInput(docente.fechaFinLicencia)
});

const mapAlumno = (alumno) => ({
  ...alumno,
  id: alumno._id || alumno.id,
  nombre: alumno.nombreCompleto || [alumno.apellido, alumno.nombre].filter(Boolean).join(', ')
});

const mapEscuela = (escuela) => ({
  ...escuela,
  id: escuela._id || escuela.id,
  lat: escuela.ubicacion?.coordinates?.[1] ?? escuela.lat ?? null,
  lng: escuela.ubicacion?.coordinates?.[0] ?? escuela.lng ?? null,
  mail: escuela.mail || escuela.email || '',
  telefonos: Array.isArray(escuela.telefonos)
    ? escuela.telefonos.map((t) => (typeof t === 'string' ? t : (t?.numero || ''))).filter(Boolean)
    : [],
  docentes: (escuela.docentes || []).map(mapDocente).filter((docente) => Boolean(docente?.id)),
  alumnos: (escuela.alumnos || []).map(mapAlumno),
  visitas: (escuela.visitas || []).map((visita) => ({ ...visita, id: visita._id || visita.id, fecha: toDateInput(visita.fecha) })),
  proyectos: (escuela.proyectos || []).map((proyecto) => ({
    ...proyecto,
    id: proyecto._id || proyecto.id,
    fechaInicio: toDateInput(proyecto.fechaInicio),
    fechaBaja: toDateInput(proyecto.fechaBaja)
  })),
  informes: (escuela.informes || []).map((informe) => ({
    ...informe,
    id: informe._id || informe.id,
    titulo: String(informe.titulo || '').trim() || 'Sin título',
    estado: String(informe.estado || 'Pendiente').trim() || 'Pendiente',
    observaciones: String(informe.observaciones || '').trim(),
    fechaEntrega: toDateInput(informe.fechaEntrega)
  }))
});

const buildInformePayload = (form = {}) => ({
  titulo: String(form.titulo || '').trim(),
  estado: String(form.estado || 'Pendiente').trim() || 'Pendiente',
  fechaEntrega: form.fechaEntrega || null,
  observaciones: String(form.observaciones || '').trim()
});

const buildCitaPayload = (form = {}) => ({
  titulo: String(form.titulo || '').trim(),
  descripcion: String(form.descripcion || '').trim(),
  fecha: form.fecha || null,
  hora: String(form.hora || '').trim(),
  participantes: String(form.participantes || '').trim(),
  visitaId: form.visitaId || null
});

const buildVisitaPayload = (form = {}) => ({
  fecha: form.fecha || null,
  observaciones: String(form.observaciones || '').trim()
});

const buildEscuelaPayload = (form = {}) => {
  const deRaw = String(form.de || '').replace(/\D/g, '');
  const payload = {
    escuela: form.escuela,
    nivel: form.nivel,
    direccion: form.direccion,
    jornada: form.jornada,
    turno: form.turno,
    email: form.mail || form.email,
    telefonos: Array.isArray(form.telefonos) ? form.telefonos : []
  };

  // Only send de if non-empty (avoids wiping existing value)
  if (deRaw) payload.de = `DE ${deRaw.padStart(2, '0')}`;

  // Only send location if both lat and lng are valid non-zero numbers
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0)) {
    payload.lat = lat;
    payload.lng = lng;
  }

  // Only send optional fields if they have values
  if (form.localidad) payload.localidad = form.localidad;
  if (form.estado) payload.estado = form.estado;

  // Remove undefined values
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

const buildDocentePayload = (form = {}, escuelaId, titularId) => {
  const parsed = splitNombreApellido(form.nombreApellido);
  const formTitularId = resolveEntityId(form.titularId || form.titular || form.docenteTitularId);
  const resolvedTitularId = resolveEntityId(titularId) || formTitularId;
  const estado = String(form.estado || 'Activo').trim() || 'Activo';
  const isLicencia = estado === 'Licencia';
  const motivo = form.motivo === 'Otro'
    ? (String(form.motivoPersonalizado || '').trim() || 'Otro')
    : (String(form.motivo || '-').trim() || '-');

  const payload = {
    escuela: escuelaId,
    titularId: resolvedTitularId || null,
    cargo: form.cargo,
    nombre: form.nombre || parsed.nombre,
    apellido: form.apellido || parsed.apellido,
    estado,
    motivo: isLicencia ? motivo : '-',
    diasAutorizados: isLicencia ? Number(form.diasAutorizados || 0) : 0,
    fechaInicioLicencia: isLicencia ? (form.fechaInicioLicencia || null) : null,
    fechaFinLicencia: isLicencia ? (form.fechaFinLicencia || null) : null,
    jornada: form.jornada || 'Completa',
    dni: form.dni,
    email: form.email,
    fechaNacimiento: form.fechaNacimiento
    // suplentes is NOT sent — managed server-side
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

const buildAlumnoPayload = (form = {}, escuelaId) => {
  const parsed = splitNombreApellido(form.nombre);

  const payload = {
    escuela: escuelaId,
    nombre: form.nombreSimple || parsed.nombre,
    apellido: form.apellido || parsed.apellido,
    gradoSalaAnio: form.gradoSalaAnio,
    diagnostico: form.diagnostico,
    observaciones: form.observaciones,
    dni: form.dni,
    fechaNacimiento: form.fechaNacimiento
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

const isPersistedMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || '').trim());

export function useAcdmMongoData(currentUser) {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    const session = await getAuthSession();
    if (!session?.tokens?.refresh) throw new Error('No hay sesión autenticada');
    const method = String(options.method || 'GET').toUpperCase();
    const response = await authFetch(path, {
      ...(method === 'GET' ? { cache: 'no-store' } : {}),
      ...options
    });

    const payload = await readJsonPayload(response, {});
    if (!response.ok) {
      const errorMessage = payload.error || (payload.errors && payload.errors.length > 0 ? payload.errors.map(e => e.msg || e.message).join(', ') : `Error HTTP ${response.status}`);
      emitAcdmEvent(ACDM_EVENTS.ERROR, { path, method, message: errorMessage, status: response.status });
      throw new Error(errorMessage);
    }

    if (method !== 'GET') {
      emitAcdmEvent(ACDM_EVENTS.MUTATION, {
        path,
        method,
        success: true
      });
    }

    return payload;
  }, []);

  const loadAllData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const escuelasRes = await request('/api/escuelas?limit=200');
      const escuelas = (escuelasRes.data?.escuelas || []).map(mapEscuela);

      const nextDb = {
        escuelas,
        alumnos: [],
        docentes: [],
        usuarios: [currentUser],
        visitas: [],
        proyectos: [],
        informes: []
      };

      setDb(nextDb);
      emitAcdmEvent(ACDM_EVENTS.LOADED, {
        escuelas: nextDb.escuelas.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error cargando datos ACDM:', err);
      setError(err.message);
      setDb({ escuelas: [], alumnos: [], docentes: [], usuarios: [currentUser], visitas: [], proyectos: [], informes: [] });
      emitAcdmEvent(ACDM_EVENTS.ERROR, { source: 'loadAllData', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [currentUser, request]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useAcdmEvent(ACDM_EVENTS.RELOAD_REQUEST, () => {
    loadAllData();
  });

  const saveEscuela = useCallback(async (form, options = {}) => {
    try {
      const persistedId = form?._id || form?.id;
      const forceUpdate = options?.isNew === false;
      const isUpdate = forceUpdate ? Boolean(persistedId) : isPersistedMongoId(persistedId);
      const endpoint = isUpdate ? `/api/escuelas/${persistedId}` : '/api/escuelas';
      const method = isUpdate ? 'PUT' : 'POST';

      await request(endpoint, {
        method,
        body: JSON.stringify(buildEscuelaPayload(form))
      });

      await loadAllData();
    } catch (err) {
      console.error('Error guardando escuela:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteEscuela = useCallback(async (id) => {
    if (!confirm('¿Eliminar escuela?')) return false;

    try {
      await request(`/api/escuelas/${id}`, { method: 'DELETE' });
      await loadAllData();
      return true;
    } catch (err) {
      console.error('Error eliminando escuela:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addDocente = useCallback(async (escuelaId, docForm, titularId) => {
    try {
      await request('/api/docentes', {
        method: 'POST',
        body: JSON.stringify(buildDocentePayload(docForm, escuelaId, titularId))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error agregando docente:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const updateDocente = useCallback(async (escuelaId, docForm, titularId) => {
    try {
      const id = docForm.id || docForm._id;
      if (!id) {
        throw new Error('Docente inválido para actualizar');
      }
      await request(`/api/docentes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(buildDocentePayload(docForm, escuelaId, titularId))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando docente:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteDocente = useCallback(async (_escuelaId, docId) => {
    if (!confirm('¿Eliminar docente?')) return false;

    try {
      await request(`/api/docentes/${docId}`, { method: 'DELETE' });
      await loadAllData();
      return true;
    } catch (err) {
      console.error('Error eliminando docente:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addAlumno = useCallback(async (escuelaId, alumForm) => {
    try {
      await request('/api/alumnos', {
        method: 'POST',
        body: JSON.stringify(buildAlumnoPayload(alumForm, escuelaId))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error agregando alumno:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const updateAlumno = useCallback(async (escuelaId, alumForm) => {
    try {
      const id = alumForm.id || alumForm._id;
      await request(`/api/alumnos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(buildAlumnoPayload(alumForm, escuelaId))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando alumno:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteAlumno = useCallback(async (_escuelaId, alumId) => {
    if (!confirm('¿Eliminar alumno?')) return false;

    try {
      await request(`/api/alumnos/${alumId}`, { method: 'DELETE' });
      await loadAllData();
      return true;
    } catch (err) {
      console.error('Error eliminando alumno:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addVisita = useCallback(async (escuelaId, visitaForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      await request(`/api/escuelas/${escuelaId}/visitas`, {
        method: 'POST',
        body: JSON.stringify(buildVisitaPayload(visitaForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error agregando visita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const updateVisita = useCallback(async (escuelaId, visitaForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      const visitaId = visitaForm.id || visitaForm._id;
      if (!visitaId) {
        throw new Error('La visita seleccionada no tiene identificador. Eliminela y vuelva a crearla.');
      }
      await request(`/api/escuelas/${escuelaId}/visitas/${visitaId}`, {
        method: 'PUT',
        body: JSON.stringify(buildVisitaPayload(visitaForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando visita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteVisita = useCallback(async (escuelaId, visitaId) => {
    if (!confirm('¿Eliminar visita?')) return false;

    try {
      if (!escuelaId || !visitaId) {
        throw new Error('Visita inválida para eliminar');
      }
      await request(`/api/escuelas/${escuelaId}/visitas/${visitaId}`, { method: 'DELETE' });
      await loadAllData();
      return true;
    } catch (err) {
      console.error('Error eliminando visita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addProyecto = useCallback(async (escuelaId, proyectoForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      await request(`/api/escuelas/${escuelaId}/proyectos`, {
        method: 'POST',
        body: JSON.stringify(buildProyectoPayload(proyectoForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error agregando proyecto:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const updateProyecto = useCallback(async (escuelaId, proyectoForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      const proyectoId = proyectoForm.id || proyectoForm._id;
      if (!proyectoId) {
        throw new Error('Proyecto inválido para actualizar');
      }
      await request(`/api/escuelas/${escuelaId}/proyectos/${proyectoId}`, {
        method: 'PUT',
        body: JSON.stringify(buildProyectoPayload(proyectoForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando proyecto:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteProyecto = useCallback(async (escuelaId, proyectoId) => {
    if (!confirm('¿Eliminar proyecto?')) return false;

    try {
      await request(`/api/escuelas/${escuelaId}/proyectos/${proyectoId}`, { method: 'DELETE' });
      await loadAllData();
      return true;
    } catch (err) {
      console.error('Error eliminando proyecto:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addInforme = useCallback(async (escuelaId, informeForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      await request(`/api/escuelas/${escuelaId}/informes`, {
        method: 'POST',
        body: JSON.stringify(buildInformePayload(informeForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error agregando informe:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const updateInforme = useCallback(async (escuelaId, informeForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      const informeId = informeForm.id || informeForm._id;
      if (!informeId) {
        throw new Error('Informe inválido');
      }
      await request(`/api/escuelas/${escuelaId}/informes/${informeId}`, {
        method: 'PUT',
        body: JSON.stringify(buildInformePayload(informeForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando informe:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteInforme = useCallback(async (escuelaId, informeId) => {
    if (!confirm('¿Eliminar informe?')) return false;

    try {
      await request(`/api/escuelas/${escuelaId}/informes/${informeId}`, { method: 'DELETE' });
      await loadAllData();
      return true;
    } catch (err) {
      console.error('Error eliminando informe:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addCita = useCallback(async (escuelaId, citaForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      await request(`/api/escuelas/${escuelaId}/citas`, {
        method: 'POST',
        body: JSON.stringify(buildCitaPayload(citaForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error agregando cita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const updateCita = useCallback(async (escuelaId, citaForm) => {
    try {
      if (!escuelaId) {
        throw new Error('Debe seleccionar una escuela');
      }
      const citaId = citaForm.id || citaForm._id;
      if (!citaId) {
        throw new Error('Cita inválida');
      }
      await request(`/api/escuelas/${escuelaId}/citas/${citaId}`, {
        method: 'PUT',
        body: JSON.stringify(buildCitaPayload(citaForm))
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando cita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteCita = useCallback(async (escuelaId, citaId) => {
    if (!confirm('¿Eliminar cita?')) return false;

    try {
      await request(`/api/escuelas/${escuelaId}/citas/${citaId}`, { method: 'DELETE' });
      await loadAllData();
      return true;
    } catch (err) {
      console.error('Error eliminando cita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  return {
    db,
    loading,
    error,
    saveEscuela,
    deleteEscuela,
    addDocente,
    updateDocente,
    deleteDocente,
    addAlumno,
    updateAlumno,
    deleteAlumno,
    addVisita,
    updateVisita,
    deleteVisita,
    addProyecto,
    updateProyecto,
    deleteProyecto,
    addInforme,
    updateInforme,
    deleteInforme,
    addCita,
    updateCita,
    deleteCita,
    reload: loadAllData
  };
}
