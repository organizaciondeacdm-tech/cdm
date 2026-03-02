import { useState, useEffect, useCallback } from 'react';

// Crypto utils para localStorage
const SECRET_KEY = "PAPIWEB_ACDM_2025_KEY";

function xorEncrypt(text, key) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(encoded, key) {
  try {
    const text = atob(encoded);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch { return null; }
}

function saveDB(data) {
  const json = JSON.stringify(data);
  localStorage.setItem("acdm_db", xorEncrypt(json, SECRET_KEY));
}

function loadDB() {
  const enc = localStorage.getItem("acdm_db");
  if (!enc) return null;
  const dec = xorDecrypt(enc, SECRET_KEY);
  if (!dec) return null;
  try { return JSON.parse(dec); } catch { return null; }
}

export const useAcdmData = (initialData) => {
  const [data, setData] = useState(initialData);

  // Cargar datos del localStorage al montar
  useEffect(() => {
    const saved = loadDB();
    if (saved) {
      setData(saved);
    } else {
      saveDB(initialData);
    }
  }, []);

  // Guardar en localStorage cada vez que cambien los datos
  useEffect(() => {
    saveDB(data);
  }, [data]);

  // CRUD para escuelas
  const addEscuela = useCallback((escuela) => {
    setData(prev => ({
      ...prev,
      escuelas: [...prev.escuelas, {
        ...escuela,
        id: `e${Date.now()}`,
        alumnos: escuela.alumnos || [],
        docentes: escuela.docentes || [],
        visitas: escuela.visitas || [],
        proyectos: escuela.proyectos || [],
        informes: escuela.informes || []
      }]
    }));
  }, []);

  const updateEscuela = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  }, []);

  const deleteEscuela = useCallback((id) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.filter(e => e.id !== id)
    }));
  }, []);

  // CRUD para visitas
  const addVisita = useCallback((escuelaId, visita) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, visitas: [...(e.visitas || []), { ...visita, id: `v${Date.now()}` }] }
          : e
      )
    }));
  }, []);

  const updateVisita = useCallback((escuelaId, visitaId, updates) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, visitas: e.visitas.map(v => v.id === visitaId ? { ...v, ...updates } : v) }
          : e
      )
    }));
  }, []);

  const deleteVisita = useCallback((escuelaId, visitaId) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, visitas: e.visitas.filter(v => v.id !== visitaId) }
          : e
      )
    }));
  }, []);

  // CRUD para proyectos
  const addProyecto = useCallback((escuelaId, proyecto) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, proyectos: [...(e.proyectos || []), { ...proyecto, id: `p${Date.now()}` }] }
          : e
      )
    }));
  }, []);

  const updateProyecto = useCallback((escuelaId, proyectoId, updates) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, proyectos: e.proyectos.map(p => p.id === proyectoId ? { ...p, ...updates } : p) }
          : e
      )
    }));
  }, []);

  const deleteProyecto = useCallback((escuelaId, proyectoId) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, proyectos: e.proyectos.filter(p => p.id !== proyectoId) }
          : e
      )
    }));
  }, []);

  // CRUD para informes
  const addInforme = useCallback((escuelaId, informe) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, informes: [...(e.informes || []), { ...informe, id: `i${Date.now()}` }] }
          : e
      )
    }));
  }, []);

  const updateInforme = useCallback((escuelaId, informeId, updates) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, informes: e.informes.map(i => i.id === informeId ? { ...i, ...updates } : i) }
          : e
      )
    }));
  }, []);

  const deleteInforme = useCallback((escuelaId, informeId) => {
    setData(prev => ({
      ...prev,
      escuelas: prev.escuelas.map(e => 
        e.id === escuelaId 
          ? { ...e, informes: e.informes.filter(i => i.id !== informeId) }
          : e
      )
    }));
  }, []);

  return {
    data,
    // Escuelas
    addEscuela,
    updateEscuela,
    deleteEscuela,
    // Visitas
    addVisita,
    updateVisita,
    deleteVisita,
    // Proyectos
    addProyecto,
    updateProyecto,
    deleteProyecto,
    // Informes
    addInforme,
    updateInforme,
    deleteInforme,
  };
};
