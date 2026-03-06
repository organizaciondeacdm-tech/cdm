const { test, expect, request } = require('@playwright/test');
const { API_URL, requestJson } = require('../../helpers/api');

const ALLOWED_STATUSES = [200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 412, 422, 423, 429];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

test.describe('API structural segment 03', () => {
  let api;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_URL });
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

  test('01 DELETE /api/admin/sessions/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/admin/sessions/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('02 GET /api/admin/escuelas', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/escuelas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('03 POST /api/admin/escuelas', async () => {
    const method = 'POST';
    const endpoint = '/api/admin/escuelas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('04 GET /api/admin/escuelas/000000000000000000000001', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/escuelas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('05 PUT /api/admin/escuelas/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/admin/escuelas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('06 DELETE /api/admin/escuelas/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/admin/escuelas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('07 GET /api/estadisticas', async () => {
    const method = 'GET';
    const endpoint = '/api/estadisticas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('08 GET /api/buscar', async () => {
    const method = 'GET';
    const endpoint = '/api/buscar';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('09 GET /api/alertas', async () => {
    const method = 'GET';
    const endpoint = '/api/alertas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('10 POST /api/alertas/000000000000000000000001/acknowledge', async () => {
    const method = 'POST';
    const endpoint = '/api/alertas/000000000000000000000001/acknowledge';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('11 GET /api/export/json', async () => {
    const method = 'GET';
    const endpoint = '/api/export/json';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('12 GET /api/export/csv', async () => {
    const method = 'GET';
    const endpoint = '/api/export/csv';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('13 GET /api/export/html', async () => {
    const method = 'GET';
    const endpoint = '/api/export/html';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('14 GET /api/test', async () => {
    const method = 'GET';
    const endpoint = '/api/test';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

});
