import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Hook personalizado para manejar datos de MongoDB a través del API
 * Reemplaza la lógica de localStorage con llamadas al backend
 */
export function useMongoData() {
  const [escuelas, setEscuelas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  // Headers para autenticación
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }), [token]);

  // Cargar escuelas
  const loadEscuelas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/escuelas`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar escuelas');
      const data = await response.json();
      // El endpoint retorna data.escuelas dentro de data
      setEscuelas(data.data?.escuelas || []);
    } catch (err) {
      setError(err.message);
      console.error('Error cargando escuelas:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Crear/Actualizar escuela
  const saveEscuela = useCallback(async (escuela) => {
    try {
      const method = escuela._id ? 'PUT' : 'POST';
      const url = escuela._id 
        ? `${API_URL}/api/escuelas/${escuela._id}`
        : `${API_URL}/api/escuelas`;

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(escuela)
      });

      if (!response.ok) throw new Error('Error al guardar escuela');
      const data = await response.json();
      
      // Actualizar estado local
      if (method === 'POST') {
        setEscuelas([...escuelas, data.data]);
      } else {
        setEscuelas(escuelas.map(e => e._id === data.data._id ? data.data : e));
      }
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [escuelas, getHeaders]);

  // Eliminar escuela
  const deleteEscuela = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/escuelas/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) throw new Error('Error al eliminar escuela');
      setEscuelas(escuelas.filter(e => e._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [escuelas, getHeaders]);

  // Cargar alumnos de una escuela
  const loadAlumnos = useCallback(async (escuelaId) => {
    try {
      const response = await fetch(`${API_URL}/api/alumnos?escuela=${escuelaId}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar alumnos');
      const data = await response.json();
      return data.data?.alumnos || [];
    } catch (err) {
      console.error('Error cargando alumnos:', err);
      return [];
    }
  }, [getHeaders]);

  // Crear/Actualizar alumno
  const saveAlumno = useCallback(async (alumno) => {
    try {
      const method = alumno._id ? 'PUT' : 'POST';
      const url = alumno._id 
        ? `${API_URL}/api/alumnos/${alumno._id}`
        : `${API_URL}/api/alumnos`;

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(alumno)
      });

      if (!response.ok) throw new Error('Error al guardar alumno');
      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getHeaders]);

  // Eliminar alumno
  const deleteAlumno = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/alumnos/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) throw new Error('Error al eliminar alumno');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getHeaders]);

  // Cargar docentes de una escuela
  const loadDocentes = useCallback(async (escuelaId) => {
    try {
      const response = await fetch(`${API_URL}/api/docentes?escuela=${escuelaId}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar docentes');
      const data = await response.json();
      return data.data?.docentes || [];
    } catch (err) {
      console.error('Error cargando docentes:', err);
      return [];
    }
  }, [getHeaders]);

  // Crear/Actualizar docente
  const saveDocente = useCallback(async (docente) => {
    try {
      const method = docente._id ? 'PUT' : 'POST';
      const url = docente._id 
        ? `${API_URL}/api/docentes/${docente._id}`
        : `${API_URL}/api/docentes`;

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(docente)
      });

      if (!response.ok) throw new Error('Error al guardar docente');
      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getHeaders]);

  // Eliminar docente
  const deleteDocente = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/docentes/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) throw new Error('Error al eliminar docente');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getHeaders]);

  // Login
  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Credenciales inválidas');
      }
      const data = await response.json();
      
      // Guardar token (backend retorna en data.tokens.access)
      const token = data.data?.tokens?.access;
      if (!token) throw new Error('No se recibió token');
      
      localStorage.setItem('authToken', token);
      setToken(token);
      
      return data.data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    setEscuelas([]);
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (token) {
      loadEscuelas();
    }
  }, [token, loadEscuelas]);

  return {
    escuelas,
    usuarios,
    loading,
    error,
    token,
    // Escuelas
    loadEscuelas,
    saveEscuela,
    deleteEscuela,
    // Alumnos
    loadAlumnos,
    saveAlumno,
    deleteAlumno,
    // Docentes
    loadDocentes,
    saveDocente,
    deleteDocente,
    // Auth
    login,
    logout
  };
}
