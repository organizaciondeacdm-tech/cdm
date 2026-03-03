/**
 * API Service para ACDM
 * Maneja todas las llamadas HTTP al backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class AcdmApiService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders()
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ==================== ESCUELAS ====================
  async getEscuelas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/escuelas${query ? '?' + query : ''}`);
  }

  async getEscuela(id) {
    return this.request(`/escuelas/${id}`);
  }

  async createEscuela(data) {
    return this.request('/escuelas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateEscuela(id, data) {
    return this.request(`/escuelas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteEscuela(id) {
    return this.request(`/escuelas/${id}`, {
      method: 'DELETE'
    });
  }

  // ==================== VISITAS ====================
  async getVisitas(escuelaId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/escuelas/${escuelaId}/visitas${query ? '?' + query : ''}`);
  }

  async createVisita(escuelaId, data) {
    return this.request(`/escuelas/${escuelaId}/visitas`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateVisita(escuelaId, visitaId, data) {
    return this.request(`/escuelas/${escuelaId}/visitas/${visitaId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteVisita(escuelaId, visitaId) {
    return this.request(`/escuelas/${escuelaId}/visitas/${visitaId}`, {
      method: 'DELETE'
    });
  }

  // ==================== PROYECTOS ====================
  async getProyectos(escuelaId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/escuelas/${escuelaId}/proyectos${query ? '?' + query : ''}`);
  }

  async createProyecto(escuelaId, data) {
    return this.request(`/escuelas/${escuelaId}/proyectos`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProyecto(escuelaId, proyectoId, data) {
    return this.request(`/escuelas/${escuelaId}/proyectos/${proyectoId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProyecto(escuelaId, proyectoId) {
    return this.request(`/escuelas/${escuelaId}/proyectos/${proyectoId}`, {
      method: 'DELETE'
    });
  }

  // ==================== INFORMES ====================
  async getInformes(escuelaId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/escuelas/${escuelaId}/informes${query ? '?' + query : ''}`);
  }

  async createInforme(escuelaId, data) {
    return this.request(`/escuelas/${escuelaId}/informes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateInforme(escuelaId, informeId, data) {
    return this.request(`/escuelas/${escuelaId}/informes/${informeId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteInforme(escuelaId, informeId) {
    return this.request(`/escuelas/${escuelaId}/informes/${informeId}`, {
      method: 'DELETE'
    });
  }

  // ==================== ESTADÍSTICAS ====================
  async getEstadisticas() {
    return this.request('/estadisticas');
  }

  async getEstadisticasPorEscuela(escuelaId) {
    return this.request(`/escuelas/${escuelaId}/estadisticas`);
  }

  // ==================== ALERTAS ====================
  async getAlertas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/alertas${query ? '?' + query : ''}`);
  }

  async acknowledgeAlerta(alertaId) {
    return this.request(`/alertas/${alertaId}/acknowledge`, {
      method: 'POST'
    });
  }

  // ==================== REPORTES ====================
  async generarReporte(tipo, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reportes/${tipo}${query ? '?' + query : ''}`);
  }

  async exportarJSON() {
    const response = await fetch(`${this.baseUrl}/export/json`, {
      headers: this.getHeaders()
    });
    return response.blob();
  }

  async exportarCSV() {
    const response = await fetch(`${this.baseUrl}/export/csv`, {
      headers: this.getHeaders()
    });
    return response.blob();
  }

  // ==================== BÚSQUEDA ====================
  async buscar(query, tipo = 'all') {
    const params = new URLSearchParams({ q: query, tipo }).toString();
    return this.request(`/buscar?${params}`);
  }

  // ==================== AUTENTICACIÓN ====================
  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.message = data.error || error.message;
        error.payload = data;
        console.error('Login error:', error.message);
        throw error;
      }

      // Guardar token si viene en la respuesta
      if (data.data?.tokens?.access) {
        this.setToken(data.data.tokens.access);
      } else if (data.accessToken) {
        this.setToken(data.accessToken);
      }

      return data;
    } catch (error) {
      // Re-throw with proper status code if it's a network error
      if (!error.status) {
        error.status = 500;
        error.message = error.message || "Error de conexión con el servidor";
      }
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }
}

export const acdmApi = new AcdmApiService();

export default acdmApi;
