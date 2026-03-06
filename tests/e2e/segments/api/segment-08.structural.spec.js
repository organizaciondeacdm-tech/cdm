const { test, expect, request } = require('@playwright/test');
const { API_URL, requestJson } = require('../../helpers/api');

const ALLOWED_STATUSES = [200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 412, 422, 423, 429];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

test.describe('API structural segment 08', () => {
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

  test('01 PUT /api/form-engine/submissions/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/form-engine/submissions/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('02 DELETE /api/form-engine/submissions/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/form-engine/submissions/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('03 GET /api/form-engine/suggestions', async () => {
    const method = 'GET';
    const endpoint = '/api/form-engine/suggestions';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('04 POST /api/informes', async () => {
    const method = 'POST';
    const endpoint = '/api/informes';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('05 GET /api/informes', async () => {
    const method = 'GET';
    const endpoint = '/api/informes';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('06 GET /api/informes/000000000000000000000001', async () => {
    const method = 'GET';
    const endpoint = '/api/informes/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('07 PUT /api/informes/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/informes/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('08 DELETE /api/informes/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/informes/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('09 GET /api/reportes/dashboard', async () => {
    const method = 'GET';
    const endpoint = '/api/reportes/dashboard';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('10 GET /api/reportes/escuelas', async () => {
    const method = 'GET';
    const endpoint = '/api/reportes/escuelas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('11 GET /api/reportes/licencias', async () => {
    const method = 'GET';
    const endpoint = '/api/reportes/licencias';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('12 GET /api/reportes/alumnos', async () => {
    const method = 'GET';
    const endpoint = '/api/reportes/alumnos';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

});
