import { useState, useEffect, useCallback } from 'react';
import { authFetch, getAuthSession, loginWithSession, logoutSession } from '../utils/authSession.js';

/**
 * Hook personalizado para manejar datos de MongoDB a través del API.
 * Usa sesión encriptada y refresh automático.
 */
export function useMongoData() {
  const [escuelas, setEscuelas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const session = await getAuthSession();
      if (!mounted) return;
      setToken(session?.tokens?.access || null);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const request = useCallback(async (path, options = {}) => {
    const response = await authFetch(path, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload.error || (payload.errors && payload.errors.length > 0
        ? payload.errors.map((e) => e.msg || e.message).join(', ')
        : `Error HTTP ${response.status}`);
      throw new Error(message);
    }

    const session = await getAuthSession();
    setToken(session?.tokens?.access || null);

    return payload;
  }, []);

  const loadEscuelas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request('/api/escuelas');
      setEscuelas(data.data?.escuelas || []);
    } catch (err) {
      setError(err.message);
      console.error('Error cargando escuelas:', err);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const saveEscuela = useCallback(async (escuela) => {
    try {
      const method = escuela._id ? 'PUT' : 'POST';
      const url = escuela._id ? `/api/escuelas/${escuela._id}` : '/api/escuelas';
      const data = await request(url, {
        method,
        body: JSON.stringify(escuela)
      });

      if (method === 'POST') {
        setEscuelas((prev) => [...prev, data.data]);
      } else {
        setEscuelas((prev) => prev.map((e) => (e._id === data.data._id ? data.data : e)));
      }

      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [request]);

  const deleteEscuela = useCallback(async (id) => {
    try {
      await request(`/api/escuelas/${id}`, { method: 'DELETE' });
      setEscuelas((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [request]);

  const loadAlumnos = useCallback(async (escuelaId) => {
    try {
      const data = await request(`/api/alumnos?escuela=${escuelaId}`);
      return data.data?.alumnos || [];
    } catch (err) {
      console.error('Error cargando alumnos:', err);
      return [];
    }
  }, [request]);

  const saveAlumno = useCallback(async (alumno) => {
    try {
      const method = alumno._id ? 'PUT' : 'POST';
      const url = alumno._id ? `/api/alumnos/${alumno._id}` : '/api/alumnos';
      const data = await request(url, {
        method,
        body: JSON.stringify(alumno)
      });
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [request]);

  const deleteAlumno = useCallback(async (id) => {
    try {
      await request(`/api/alumnos/${id}`, { method: 'DELETE' });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [request]);

  const loadDocentes = useCallback(async (escuelaId) => {
    try {
      const data = await request(`/api/docentes?escuela=${escuelaId}`);
      return data.data?.docentes || [];
    } catch (err) {
      console.error('Error cargando docentes:', err);
      return [];
    }
  }, [request]);

  const saveDocente = useCallback(async (docente) => {
    try {
      const method = docente._id ? 'PUT' : 'POST';
      const url = docente._id ? `/api/docentes/${docente._id}` : '/api/docentes';
      const data = await request(url, {
        method,
        body: JSON.stringify(docente)
      });
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [request]);

  const deleteDocente = useCallback(async (id) => {
    try {
      await request(`/api/docentes/${id}`, { method: 'DELETE' });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [request]);

  const login = useCallback(async (username, password) => {
    try {
      const session = await loginWithSession(username, password);
      setToken(session.tokens.access);
      return session.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setToken(null);
    setEscuelas([]);
  }, []);

  useEffect(() => {
    if (token) {
      loadEscuelas();
    } else {
      setLoading(false);
    }
  }, [token, loadEscuelas]);

  return {
    escuelas,
    usuarios,
    loading,
    error,
    token,
    loadEscuelas,
    saveEscuela,
    deleteEscuela,
    loadAlumnos,
    saveAlumno,
    deleteAlumno,
    loadDocentes,
    saveDocente,
    deleteDocente,
    login,
    logout
  };
}
