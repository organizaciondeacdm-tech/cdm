import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para cargar y sincronizar datos ACDM desde MongoDB
 * Reemplaza el almacenamiento local (acdm_db) con API real
 */
export function useAcdmMongoData(currentUser) {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Token desde localStorage
  const token = localStorage.getItem('authToken');

  // Cargar datos iniciales
  useEffect(() => {
    if (!currentUser || !token) {
      setLoading(false);
      return;
    }

    loadAllData();
  }, [currentUser, token]);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = { 'Authorization': `Bearer ${token}` };

      // Solo cargar escuelas (contienen alumnos y docentes anidados)
      const escuelasRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/escuelas`, { headers });

      if (!escuelasRes.ok) {
        throw new Error('Error cargando escuelas del servidor');
      }

      const escuelasData = await escuelasRes.json();

      // Normalizar estructura de datos desde MongoDB
      const normalizeEscuelas = (escuelas) => {
        return (escuelas || []).map(esc => ({
          ...esc,
          id: esc._id || esc.id,
          telefonos: Array.isArray(esc.telefonos) 
            ? esc.telefonos.map(t => typeof t === 'string' ? t : (t.numero || ''))
            : [],
          alumnos: (esc.alumnos || []).map(a => ({
            ...a,
            id: a._id || a.id
          })),
          docentes: (esc.docentes || []).map(d => ({
            ...d,
            id: d._id || d.id,
            suplentes: (d.suplentes || []).map(s => ({
              ...s,
              id: s._id || s.id
            }))
          }))
        }));
      };

      // Organizar datos en estructura de db
      const newDb = {
        escuelas: normalizeEscuelas(escuelasData.data?.escuelas || []),
        alumnos: [],
        docentes: [],
        usuarios: [currentUser],
        visitas: [],
        proyectos: [],
        informes: []
      };

      setDb(newDb);
    } catch (err) {
      console.error('Error cargando datos ACDM:', err);
      setError(err.message);
      setDb({ escuelas: [], alumnos: [], docentes: [], usuarios: [currentUser], visitas: [], proyectos: [], informes: [] });
    } finally {
      setLoading(false);
    }
  }, [token, currentUser]);

  // Operaciones CRUD para escuelas
  const saveEscuela = useCallback(async (form) => {
    if (!token) return;
    try {
      const method = form.id && db?.escuelas.some(e => e.id === form.id) ? 'PUT' : 'POST';
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/escuelas`;
      const endpoint = method === 'PUT' ? `${url}/${form.id}` : url;

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error('Error guardando escuela');

      const data = await res.json();
      const savedEscuela = data.data?.escuela || form;

      setDb(prev => {
        const idx = prev.escuelas.findIndex(e => e.id === savedEscuela.id);
        if (idx >= 0) {
          const updated = [...prev.escuelas];
          updated[idx] = savedEscuela;
          return { ...prev, escuelas: updated };
        }
        return { ...prev, escuelas: [...prev.escuelas, savedEscuela] };
      });
    } catch (err) {
      console.error('Error guardando escuela:', err);
    }
  }, [token, db]);

  const deleteEscuela = useCallback(async (id) => {
    if (!token || !confirm('¿Eliminar escuela?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/escuelas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error eliminando escuela');

      setDb(prev => ({
        ...prev,
        escuelas: prev.escuelas.filter(e => e.id !== id)
      }));
    } catch (err) {
      console.error('Error eliminando escuela:', err);
    }
  }, [token]);

  // Operaciones CRUD para docentes
  const addDocente = useCallback(async (escuelaId, docForm, titularId) => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/docentes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...docForm, escuelaId, titularId })
      });

      if (!res.ok) throw new Error('Error agregando docente');

      const data = await res.json();
      const newDocente = data.data?.docente || docForm;

      setDb(prev => ({
        ...prev,
        escuelas: prev.escuelas.map(esc => {
          if (esc.id !== escuelaId) return esc;
          if (titularId) {
            return {
              ...esc,
              docentes: esc.docentes.map(d =>
                d.id === titularId
                  ? { ...d, suplentes: [...(d.suplentes || []), newDocente] }
                  : d
              )
            };
          }
          return { ...esc, docentes: [...esc.docentes, { ...newDocente, suplentes: [] }] };
        })
      }));
    } catch (err) {
      console.error('Error agregando docente:', err);
    }
  }, [token, db]);

  const updateDocente = useCallback(async (escuelaId, docForm, titularId) => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/docentes/${docForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(docForm)
      });

      if (!res.ok) throw new Error('Error actualizando docente');

      const data = await res.json();
      const updatedDocente = data.data?.docente || docForm;

      setDb(prev => ({
        ...prev,
        escuelas: prev.escuelas.map(esc => {
          if (esc.id !== escuelaId) return esc;
          if (titularId) {
            return {
              ...esc,
              docentes: esc.docentes.map(d =>
                d.id === titularId
                  ? { ...d, suplentes: d.suplentes.map(s => s.id === docForm.id ? updatedDocente : s) }
                  : d
              )
            };
          }
          return {
            ...esc,
            docentes: esc.docentes.map(d =>
              d.id === docForm.id ? { ...updatedDocente, suplentes: d.suplentes } : d
            )
          };
        })
      }));
    } catch (err) {
      console.error('Error actualizando docente:', err);
    }
  }, [token, db]);

  const deleteDocente = useCallback(async (escuelaId, docId, titularId) => {
    if (!token || !confirm('¿Eliminar docente?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/docentes/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error eliminando docente');

      setDb(prev => ({
        ...prev,
        escuelas: prev.escuelas.map(esc => {
          if (esc.id !== escuelaId) return esc;
          if (titularId) {
            return {
              ...esc,
              docentes: esc.docentes.map(d =>
                d.id === titularId
                  ? { ...d, suplentes: d.suplentes.filter(s => s.id !== docId) }
                  : d
              )
            };
          }
          return { ...esc, docentes: esc.docentes.filter(d => d.id !== docId) };
        })
      }));
    } catch (err) {
      console.error('Error eliminando docente:', err);
    }
  }, [token]);

  // Operaciones CRUD para alumnos
  const addAlumno = useCallback(async (escuelaId, alumForm) => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/alumnos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...alumForm, escuelaId })
      });

      if (!res.ok) throw new Error('Error agregando alumno');

      const data = await res.json();
      const newAlumno = data.data?.alumno || alumForm;

      setDb(prev => ({
        ...prev,
        escuelas: prev.escuelas.map(esc =>
          esc.id === escuelaId
            ? { ...esc, alumnos: [...(esc.alumnos || []), newAlumno] }
            : esc
        )
      }));
    } catch (err) {
      console.error('Error agregando alumno:', err);
    }
  }, [token, db]);

  const updateAlumno = useCallback(async (escuelaId, alumForm) => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/alumnos/${alumForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(alumForm)
      });

      if (!res.ok) throw new Error('Error actualizando alumno');

      const data = await res.json();
      const updatedAlumno = data.data?.alumno || alumForm;

      setDb(prev => ({
        ...prev,
        escuelas: prev.escuelas.map(esc =>
          esc.id === escuelaId
            ? {
              ...esc,
              alumnos: esc.alumnos.map(a => a.id === alumForm.id ? updatedAlumno : a)
            }
            : esc
        )
      }));
    } catch (err) {
      console.error('Error actualizando alumno:', err);
    }
  }, [token, db]);

  const deleteAlumno = useCallback(async (escuelaId, alumId) => {
    if (!token || !confirm('¿Eliminar alumno?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/alumnos/${alumId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error eliminando alumno');

      setDb(prev => ({
        ...prev,
        escuelas: prev.escuelas.map(esc =>
          esc.id === escuelaId
            ? { ...esc, alumnos: esc.alumnos.filter(a => a.id !== alumId) }
            : esc
        )
      }));
    } catch (err) {
      console.error('Error eliminando alumno:', err);
    }
  }, [token]);

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
    reload: loadAllData
  };
}
