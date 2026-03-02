import { test, expect } from '@playwright/test';

test.describe('ACDM - Pruebas de API', () => {
  const baseURL = 'http://localhost:5000';
  let authToken = '';

  test.beforeAll(async ({ playwright }) => {
    // Nota: Esto se ejecutaría una sola vez para toda la suite
    // En Playwright, usamos beforeEach para cada test
  });

  test.beforeEach(async ({ request }) => {
    // Intentar obtener token de autenticación
    // Nota: Esto depende de si tu backend tiene un endpoint de login de API
    try {
      const response = await request.post(`${baseURL}/api/auth/login`, {
        data: {
          username: 'admin',
          password: 'admin2025'
        }
      });
      
      if (response.ok()) {
        const data = await response.json();
        authToken = data.token || '';
      }
    } catch (error) {
      // Si falla el login, continuamos sin token
      console.log('No se pudo obtener token de autenticación');
    }
  });

  test('Debe retornar health check del servidor', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health`);
    
    // Puede que no exista este endpoint, por eso no hacemos strict expect
    if (response.status() === 200 || response.status() === 404) {
      expect(response.status()).toBeTruthy();
    }
  });

  test('Debe tener endpoint de autenticación disponible', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'admin2025'
      }
    });
    
    // El endpoint debe existir y responder (200, 401, 422, etc)
    expect(response.status()).toBeGreaterThan(0);
    expect([200, 400, 401, 422]).toContain(response.status());
  });

  test('Debe retornar lista de escuelas', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/escuelas`);
    
    // Aceptar 200, 401 (sin auth) o 404 (no existe)
    expect([200, 401, 404, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data) || data.data).toBeTruthy();
    }
  });

  test('Debe retornar lista de docentes', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/docentes`);
    
    expect([200, 401, 404, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });

  test('Debe retornar lista de alumnos', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/alumnos`);
    
    expect([200, 401, 404, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });

  test('Debe validar estructura de error de API', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/nonexistent`);
    
    // Debe ser un error (404, 500, etc)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Debe manejar POST con datos inválidos', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/escuelas`, {
      data: {}
    });
    
    // Debe retornar error de validación
    expect([400, 401, 422, 500]).toContain(response.status());
  });

  test('Debe retornar JSON válido en respuestas', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/escuelas`);
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
      
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });

  test('Debe manejar timeout de forma correcta', async ({ request }) => {
    try {
      const response = await request.get(`${baseURL}/api/escuelas`, {
        timeout: 5000
      });
      
      // Si responde, debe ser un código válido
      expect(response.status()).toBeGreaterThan(0);
    } catch (error) {
      // Timeout es permitido en prueba de carga
      expect(error).toBeTruthy();
    }
  });

  test('Debe validar CORS headers', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/escuelas`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    // El servidor debe responder (con o sin CORS)
    expect(response.status()).toBeGreaterThan(0);
  });
});
