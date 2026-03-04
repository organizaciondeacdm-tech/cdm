/**
 * API Service para ACDM
 * Maneja todas las llamadas HTTP al backend
 */
import { clearAuthSession, getAuthSession, setAuthSession } from '../../utils/authSession.js';
import { getApiUrl } from '../../utils/apiConfig.js';
import { encryptJsonBodyIfNeeded } from '../../utils/payloadCrypto.js';

const API_BASE_URL = `${getApiUrl()}/api`;

class AcdmApiService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async getHeaders() {
    if (!this.token) {
      const session = await getAuthSession();
      this.token = session?.tokens?.access || null;
    }

    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();
    const maybeEncryptedBody = await encryptJsonBodyIfNeeded(options.body, headers);
    const config = {
      ...options,
      headers,
      body: maybeEncryptedBody
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
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
      headers: await this.getHeaders()
    });
    return response.blob();
  }

  async exportarCSV() {
    const response = await fetch(`${this.baseUrl}/export/csv`, {
      headers: await this.getHeaders()
    });
    return response.blob();
  }

  // ==================== SESIONES ====================
  async getMySessions() {
    return this.request('/auth/sessions');
  }

  async revokeMySession(sessionId) {
    return this.request(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async revokeMyOtherSessions() {
    return this.request('/auth/sessions', { method: 'DELETE' });
  }

  async getAdminSessions() {
    return this.request('/auth/admin/sessions');
  }

  async revokeSessionAsAdmin(sessionId) {
    return this.request(`/auth/admin/sessions/${sessionId}`, { method: 'DELETE' });
  }

  // Vista unificada "Sesiones Activas" con fallback.
  async getActiveSessionsView({ preferAdmin = true } = {}) {
    if (preferAdmin) {
      try {
        return await this.request('/admin/sessions');
      } catch (_e1) {
        try {
          return await this.request('/auth/admin/sessions');
        } catch (_e2) {
          return this.request('/auth/sessions');
        }
      }
    }
    return this.request('/auth/sessions');
  }

  async revokeSessionFromActiveView(sessionId, { asAdmin = true } = {}) {
    if (asAdmin) {
      try {
        return await this.request(`/admin/sessions/${sessionId}`, { method: 'DELETE' });
      } catch (_e1) {
        try {
          return await this.request(`/auth/admin/sessions/${sessionId}`, { method: 'DELETE' });
        } catch (_e2) {
          return this.request(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
        }
      }
    }
    return this.request(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
  }

  // ==================== USUARIOS (ADMIN) ====================
  async getAdminUsers() {
    return this.request('/admin/users');
  }

  async createAdminUser(payload) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateAdminUser(id, payload) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteAdminUser(id) {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  async bulkAdminUsers(action, userIds = []) {
    return this.request('/admin/users/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, userIds })
    });
  }

  async impersonateAdminUser(id) {
    return this.request(`/admin/users/${id}/impersonate`, { method: 'POST' });
  }

  async getRoles() {
    return this.request('/admin/roles');
  }

  async updateRolePermissions(role, permisos, applyToUsers = false) {
    return this.request(`/admin/roles/${role}/permisos`, {
      method: 'PUT',
      body: JSON.stringify({ permisos, applyToUsers })
    });
  }

  async bulkUpdateRolePermissions({ roles = [], permisos = [], operation = 'add', applyToUsers = false } = {}) {
    return this.request('/admin/roles/bulk/permisos', {
      method: 'POST',
      body: JSON.stringify({ roles, permisos, operation, applyToUsers })
    });
  }

  async getPermisos() {
    return this.request('/admin/permisos');
  }

  // ==================== SEGURIDAD / TRÁFICO ====================
  async getSecurityTrafficRealtime() {
    return this.request('/admin/security/traffic/realtime');
  }

  async getSecurityTrafficHistory(limit = 300) {
    return this.request(`/admin/security/traffic/history?limit=${encodeURIComponent(limit)}`);
  }

  async getBannedIps() {
    return this.request('/admin/security/bans');
  }

  async banIp(payload) {
    return this.request('/admin/security/bans', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async unbanIp(ip) {
    return this.request(`/admin/security/bans/${encodeURIComponent(ip)}`, { method: 'DELETE' });
  }

  async getSecurityRules() {
    return this.request('/admin/security/rules');
  }

  async updateSecurityRules(payload) {
    return this.request('/admin/security/rules', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async cleanupSecurity(payload = {}) {
    return this.request('/admin/security/cleanup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ==================== BÚSQUEDA ====================
  async buscar(query, tipo = 'all') {
    const params = new URLSearchParams({ q: query, tipo }).toString();
    return this.request(`/buscar?${params}`);
  }

  // ==================== AUTENTICACIÓN ====================
  async login(username, password) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers,
        body: await encryptJsonBodyIfNeeded(JSON.stringify({ username, password }), headers)
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
        if (data.data?.tokens?.refresh && data.data?.user) {
          await setAuthSession({
            user: data.data.user,
            tokens: {
              access: data.data.tokens.access,
              refresh: data.data.tokens.refresh
            },
            updatedAt: Date.now()
          });
        }
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

  // ==================== FORM ENGINE ====================
  async getFormTemplates(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    return this.request(`/form-engine/templates${query.toString() ? '?' + query.toString() : ''}`);
  }

  async createFormTemplate(data) {
    return this.request('/form-engine/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateFormTemplate(id, data) {
    return this.request(`/form-engine/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteFormTemplate(id) {
    return this.request(`/form-engine/templates/${id}`, { method: 'DELETE' });
  }

  async getFormSubmissions(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    return this.request(`/form-engine/submissions${query.toString() ? '?' + query.toString() : ''}`);
  }

  async createFormSubmission(data) {
    return this.request('/form-engine/submissions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateFormSubmission(id, data) {
    return this.request(`/form-engine/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteFormSubmission(id) {
    return this.request(`/form-engine/submissions/${id}`, { method: 'DELETE' });
  }

  async bulkCreateFormSubmissions(data) {
    return this.request('/form-engine/submissions/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getFormSuggestions(source, query, limit = 8) {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return this.request(`/form-engine/suggestions/${source}?${params}`);
  }

  async logout() {
    this.token = null;
    await clearAuthSession();
  }
}

export const acdmApi = new AcdmApiService();

export default acdmApi;
