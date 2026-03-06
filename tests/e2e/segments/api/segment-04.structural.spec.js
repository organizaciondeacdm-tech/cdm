const { test, expect, request } = require('@playwright/test');
const { API_URL, createApiContext, requestJson } = require('../../helpers/api');

const ALLOWED_STATUSES = [200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 412, 422, 423, 429];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

test.describe('API structural segment 04', () => {
  let api;

  test.beforeAll(async () => {
    api = await createApiContext(request);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  const assertStatus = async (res, label) => {
    const status = res.status();
    if (!ALLOWED_STATUSES.includes(status)) {
      const body = await res.text();
      throw new Error(`${label} -> status=${status} body=${body}`);
    }
    expect(ALLOWED_STATUSES).toContain(status);
  };

  test('01 POST /api/send-alert-email', async () => {
    const method = 'POST';
    const endpoint = '/api/send-alert-email';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('02 GET /health', async () => {
    const method = 'GET';
    const endpoint = '/health';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('03 GET /', async () => {
    const method = 'GET';
    const endpoint = '/';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('04 GET /api/alumnos/estadisticas', async () => {
    const method = 'GET';
    const endpoint = '/api/alumnos/estadisticas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('05 GET /api/alumnos', async () => {
    const method = 'GET';
    const endpoint = '/api/alumnos';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('06 GET /api/alumnos/000000000000000000000001', async () => {
    const method = 'GET';
    const endpoint = '/api/alumnos/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('07 POST /api/alumnos', async () => {
    const method = 'POST';
    const endpoint = '/api/alumnos';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('08 PUT /api/alumnos/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/alumnos/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('09 DELETE /api/alumnos/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/alumnos/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('10 POST /api/auth/login', async () => {
    const method = 'POST';
    const endpoint = '/api/auth/login';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('11 POST /api/auth/refresh-token', async () => {
    const method = 'POST';
    const endpoint = '/api/auth/refresh-token';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('12 POST /api/auth/logout', async () => {
    const method = 'POST';
    const endpoint = '/api/auth/logout';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('13 POST /api/auth/traffic-handshake', async () => {
    const method = 'POST';
    const endpoint = '/api/auth/traffic-handshake';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('14 POST /api/auth/change-password', async () => {
    const method = 'POST';
    const endpoint = '/api/auth/change-password';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

});
