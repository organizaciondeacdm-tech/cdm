import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils/apiConfig.js';

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

const mapDocente = (docente) => ({
  ...docente,
  id: docente._id || docente.id,
  nombreApellido: docente.nombreApellido || [docente.apellido, docente.nombre].filter(Boolean).join(', '),
  jornada: docente.jornada || 'Completa',
  suplentes: (docente.suplentes || []).map((suplente) => ({
    ...suplente,
    id: suplente._id || suplente.id,
    nombreApellido: suplente.nombreApellido || [suplente.apellido, suplente.nombre].filter(Boolean).join(', '),
    fechaInicioLicencia: toDateInput(suplente.fechaInicioLicencia),
    fechaFinLicencia: toDateInput(suplente.fechaFinLicencia)
  })),
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
  docentes: (escuela.docentes || []).map(mapDocente),
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
    fechaEntrega: toDateInput(informe.fechaEntrega)
  }))
});

const buildEscuelaPayload = (form = {}) => ({
  de: form.de ? form.de.toUpperCase().replace(/^DE(\d{2})$/, 'DE $1').replace(/^DE\s*(\d{2})$/, 'DE $1').trim() : form.de,
  escuela: form.escuela,
  nivel: form.nivel,
  direccion: form.direccion,
  localidad: form.localidad,
  jornada: form.jornada,
  turno: form.turno,
  email: form.mail || form.email,
  telefonos: Array.isArray(form.telefonos) ? form.telefonos : [],
  lat: form.lat,
  lng: form.lng,
  estado: form.estado
});

const buildDocentePayload = (form = {}, escuelaId, titularId) => {
  const parsed = splitNombreApellido(form.nombreApellido);
  const payload = {
    escuela: escuelaId,
    titularId: titularId || null,
    cargo: form.cargo,
    nombre: form.nombre || parsed.nombre,
    apellido: form.apellido || parsed.apellido,
    estado: form.estado,
    motivo: form.motivo === 'Otro' ? (form.motivoPersonalizado || form.motivo) : (form.motivo || '-'),
    diasAutorizados: Number(form.diasAutorizados || 0),
    fechaInicioLicencia: form.fechaInicioLicencia || null,
    fechaFinLicencia: form.fechaFinLicencia || null,
    jornada: form.jornada || 'Completa',
    dni: form.dni,
    email: form.email,
    fechaNacimiento: form.fechaNacimiento
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

export function useAcdmMongoData(currentUser) {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  const request = useCallback(async (path, options = {}) => {
    if (!token) throw new Error('No hay token de autenticación');

    const response = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = payload.error || (payload.errors && payload.errors.length > 0 ? payload.errors.map(e => e.msg || e.message).join(', ') : `Error HTTP ${response.status}`);
      throw new Error(errorMessage);
    }

    return payload;
  }, [token]);

  const loadAllData = useCallback(async () => {
    if (!currentUser || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const escuelasRes = await request('/api/escuelas?limit=200');
      const escuelas = (escuelasRes.data?.escuelas || []).map(mapEscuela);

      setDb({
        escuelas,
        alumnos: [],
        docentes: [],
        usuarios: [currentUser],
        visitas: [],
        proyectos: [],
        informes: []
      });
    } catch (err) {
      console.error('Error cargando datos ACDM:', err);
      setError(err.message);
      setDb({ escuelas: [], alumnos: [], docentes: [], usuarios: [currentUser], visitas: [], proyectos: [], informes: [] });
    } finally {
      setLoading(false);
    }
  }, [currentUser, request, token]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const saveEscuela = useCallback(async (form) => {
    try {
      const isUpdate = Boolean(form.id);
      const endpoint = isUpdate ? `/api/escuelas/${form.id}` : '/api/escuelas';
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
    if (!confirm('¿Eliminar escuela?')) return;

    try {
      await request(`/api/escuelas/${id}`, { method: 'DELETE' });
      await loadAllData();
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
    if (!confirm('¿Eliminar docente?')) return;

    try {
      await request(`/api/docentes/${docId}`, { method: 'DELETE' });
      await loadAllData();
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
    if (!confirm('¿Eliminar alumno?')) return;

    try {
      await request(`/api/alumnos/${alumId}`, { method: 'DELETE' });
      await loadAllData();
    } catch (err) {
      console.error('Error eliminando alumno:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addVisita = useCallback(async (escuelaId, visitaForm) => {
    try {
      await request(`/api/escuelas/${escuelaId}/visitas`, {
        method: 'POST',
        body: JSON.stringify(visitaForm)
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
      const visitaId = visitaForm.id || visitaForm._id;
      await request(`/api/escuelas/${escuelaId}/visitas/${visitaId}`, {
        method: 'PUT',
        body: JSON.stringify(visitaForm)
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando visita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteVisita = useCallback(async (escuelaId, visitaId) => {
    if (!confirm('¿Eliminar visita?')) return;

    try {
      await request(`/api/escuelas/${escuelaId}/visitas/${visitaId}`, { method: 'DELETE' });
      await loadAllData();
    } catch (err) {
      console.error('Error eliminando visita:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addProyecto = useCallback(async (escuelaId, proyectoForm) => {
    try {
      await request(`/api/escuelas/${escuelaId}/proyectos`, {
        method: 'POST',
        body: JSON.stringify(proyectoForm)
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
      const proyectoId = proyectoForm.id || proyectoForm._id;
      await request(`/api/escuelas/${escuelaId}/proyectos/${proyectoId}`, {
        method: 'PUT',
        body: JSON.stringify(proyectoForm)
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando proyecto:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteProyecto = useCallback(async (escuelaId, proyectoId) => {
    if (!confirm('¿Eliminar proyecto?')) return;

    try {
      await request(`/api/escuelas/${escuelaId}/proyectos/${proyectoId}`, { method: 'DELETE' });
      await loadAllData();
    } catch (err) {
      console.error('Error eliminando proyecto:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const addInforme = useCallback(async (escuelaId, informeForm) => {
    try {
      await request(`/api/escuelas/${escuelaId}/informes`, {
        method: 'POST',
        body: JSON.stringify(informeForm)
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
      const informeId = informeForm.id || informeForm._id;
      await request(`/api/escuelas/${escuelaId}/informes/${informeId}`, {
        method: 'PUT',
        body: JSON.stringify(informeForm)
      });
      await loadAllData();
    } catch (err) {
      console.error('Error actualizando informe:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAllData, request]);

  const deleteInforme = useCallback(async (escuelaId, informeId) => {
    if (!confirm('¿Eliminar informe?')) return;

    try {
      await request(`/api/escuelas/${escuelaId}/informes/${informeId}`, { method: 'DELETE' });
      await loadAllData();
    } catch (err) {
      console.error('Error eliminando informe:', err);
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
    reload: loadAllData
  };
}
