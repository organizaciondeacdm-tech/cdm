// ============================================================
// API SERVICE - Capa de comunicación con el backend
// ============================================================

// Determinar la URL base del API
let API_URL;
if (typeof window !== 'undefined') {
  // En navegador
  const envUrl = typeof process !== 'undefined' && process.env?.REACT_APP_API_URL;
  const urlFromWindow = window.REACT_APP_API_URL;
  
  if (envUrl) {
    API_URL = envUrl;
  } else if (urlFromWindow) {
    API_URL = urlFromWindow;
  } else {
    // Por defecto: usar la misma origen que el frontend
    API_URL = '/api';
  }
} else {
  // En Node.js (no debería pasar, pero por seguridad)
  API_URL = 'http://localhost:5000/api';
}

class ACDMApiService {
  constructor() {
    this.token = localStorage.getItem('acdm_token');
    this.baseURL = API_URL;
    this.offline = false;
    this.defaultRetry = {
      maxRetries: 0,
      baseDelayMs: 300,
      maxDelayMs: 5000,
      retryOnStatuses: [429, 500, 502, 503, 504]
    };
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('acdm_token', token);
    } else {
      localStorage.removeItem('acdm_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRetryDelayMs(attempt, baseDelayMs, maxDelayMs) {
    const expoDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
    const jitter = Math.floor(Math.random() * 200);
    return expoDelay + jitter;
  }

  async request(endpoint, options = {}, retryOptions = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const retry = {
      ...this.defaultRetry,
      ...retryOptions
    };
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    let lastError;
    for (let attempt = 0; attempt <= retry.maxRetries; attempt += 1) {
      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const backendMessage = errorBody.error || errorBody.message;
          const error = new Error(backendMessage || `Error ${response.status}`);
          error.status = response.status;
          error.payload = errorBody;
          error.retryAfter = response.headers.get('Retry-After');

          const hasAuthHeader = !!this.token || !!config.headers?.Authorization;
          const isLoginEndpoint = endpoint.startsWith('/auth/login');
          if (response.status === 401 && hasAuthHeader && !isLoginEndpoint) {
            this.setToken(null);
            throw new Error('Token expirado. Por favor, vuelve a iniciar sesión.');
          }

          const shouldRetry = attempt < retry.maxRetries && retry.retryOnStatuses.includes(response.status);
          if (shouldRetry) {
            const retryAfterSeconds = parseInt(error.retryAfter, 10);
            const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
              ? retryAfterSeconds * 1000
              : this.getRetryDelayMs(attempt + 1, retry.baseDelayMs, retry.maxDelayMs);
            await this.sleep(delayMs);
            continue;
          }

          throw error;
        }

        return await response.json();
      } catch (error) {
        const isNetworkError = error?.status === undefined;
        const shouldRetry = isNetworkError && attempt < retry.maxRetries;
        lastError = error;

        if (!shouldRetry) {
          console.error('API Error:', error);
          throw error;
        }

        const delayMs = this.getRetryDelayMs(attempt + 1, retry.baseDelayMs, retry.maxDelayMs);
        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  // ============================================================
  // AUTH ENDPOINTS
  // ============================================================

  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, {
      maxRetries: 4,
      baseDelayMs: 300,
      maxDelayMs: 8000,
      retryOnStatuses: [429, 500, 502, 503, 504]
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async changePassword(oldPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  // ============================================================
  // ESCUELAS ENDPOINTS
  // ============================================================

  async getEscuelas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/escuelas${query ? '?' + query : ''}`);
  }

  async getEscuelaById(id) {
    return this.request(`/escuelas/${id}`);
  }

  async createEscuela(data) {
    return this.request('/escuelas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEscuela(id, data) {
    return this.request(`/escuelas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEscuela(id) {
    return this.request(`/escuelas/${id}`, { method: 'DELETE' });
  }

  async searchEscuelas(query) {
    return this.request(`/escuelas/buscar?q=${encodeURIComponent(query)}`);
  }

  async getEstadisticas() {
    return this.request('/escuelas/estadisticas');
  }

  // ============================================================
  // DOCENTES ENDPOINTS
  // ============================================================

  async getDocentes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/docentes${query ? '?' + query : ''}`);
  }

  async getDocenteById(id) {
    return this.request(`/docentes/${id}`);
  }

  async createDocente(data) {
    return this.request('/docentes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocente(id, data) {
    return this.request(`/docentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocente(id) {
    return this.request(`/docentes/${id}`, { method: 'DELETE' });
  }

  // ============================================================
  // ALUMNOS ENDPOINTS
  // ============================================================

  async getAlumnos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/alumnos${query ? '?' + query : ''}`);
  }

  async getAlumnoById(id) {
    return this.request(`/alumnos/${id}`);
  }

  async createAlumno(data) {
    return this.request('/alumnos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAlumno(id, data) {
    return this.request(`/alumnos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAlumno(id) {
    return this.request(`/alumnos/${id}`, { method: 'DELETE' });
  }

  // ============================================================
  // REPORTES ENDPOINTS
  // ============================================================

  async getReportes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reportes${query ? '?' + query : ''}`);
  }

  async generateReporte(data) {
    return this.request('/reportes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async exportReporte(id, format = 'pdf') {
    return this.request(`/reportes/${id}/export?format=${format}`);
  }
}

// Exportar instancia única (compatible con ES6 y CommonJS)
const apiService = new ACDMApiService();

// Soporte para ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiService;
  module.exports.default = apiService;
}

// Soporte para ES6 import
export default apiService;
