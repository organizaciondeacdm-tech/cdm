const { test, expect, request } = require('@playwright/test');
const { API_URL, requestJson } = require('./helpers/api');

test.describe('Unauthorized protection', () => {
  let api;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_URL });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('endpoints protegidos devuelven 401 sin token', async () => {
    const checks = [
      ['/api/escuelas', 'GET'],
      ['/api/docentes', 'GET'],
      ['/api/alumnos', 'GET'],
      ['/api/alertas', 'GET'],
      ['/api/estadisticas', 'GET'],
      ['/api/calendario', 'GET'],
      ['/api/export/json', 'GET'],
      ['/api/export/csv', 'GET'],
      ['/api/admin/users', 'GET'],
      ['/api/reportes/dashboard', 'GET'],
      ['/api/reportes/escuelas', 'GET'],
      ['/api/informes', 'GET'],
      ['/api/auth/profile', 'GET'],
      ['/api/auth/sessions', 'GET'],
      ['/api/auth/admin/sessions', 'GET'],
      ['/api/send-alert-email', 'POST'],
      ['/api/alertas/000000000000000000000001/acknowledge', 'POST'],
      ['/api/auth/logout', 'POST'],
      ['/api/auth/sessions', 'DELETE']
    ];

    for (const [path, method] of checks) {
      const res = await api.fetch(path, {
        method,
        headers: { 'content-type': 'application/json' },
        data: method === 'POST' ? {} : undefined
      });
      const status = res.status();
      expect([401, 429], `fallo en ${method} ${path}. status=${status}`).toContain(status);
    }
  });

  test('refresh-token inválido devuelve 401', async () => {
    const { response, json } = await requestJson(api, 'POST', '/api/auth/refresh-token', {
      refreshToken: 'invalid-refresh-token'
    });

    expect(response.status()).toBe(401);
    expect(json?.success).toBeFalsy();
  });
});
