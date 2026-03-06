const { test, expect, request } = require('@playwright/test');
const { API_URL, createApiContext, requestJson } = require('../../helpers/api');

const ALLOWED_STATUSES = [200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 412, 422, 423, 429];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

test.describe('API structural segment 07', () => {
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

  test('01 POST /api/escuelas/000000000000000000000001/informes', async () => {
    const method = 'POST';
    const endpoint = '/api/escuelas/000000000000000000000001/informes';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('02 PUT /api/escuelas/000000000000000000000001/informes/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/escuelas/000000000000000000000001/informes/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('03 DELETE /api/escuelas/000000000000000000000001/informes/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/escuelas/000000000000000000000001/informes/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('04 GET /api/escuelas/000000000000000000000001', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('05 POST /api/escuelas', async () => {
    const method = 'POST';
    const endpoint = '/api/escuelas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('06 PUT /api/escuelas/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/escuelas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('07 DELETE /api/escuelas/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/escuelas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('08 GET /api/form-engine/templates', async () => {
    const method = 'GET';
    const endpoint = '/api/form-engine/templates';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('09 POST /api/form-engine/templates', async () => {
    const method = 'POST';
    const endpoint = '/api/form-engine/templates';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('10 PUT /api/form-engine/templates/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/form-engine/templates/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('11 DELETE /api/form-engine/templates/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/form-engine/templates/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('12 GET /api/form-engine/submissions', async () => {
    const method = 'GET';
    const endpoint = '/api/form-engine/submissions';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('13 POST /api/form-engine/submissions', async () => {
    const method = 'POST';
    const endpoint = '/api/form-engine/submissions';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('14 POST /api/form-engine/submissions/bulk', async () => {
    const method = 'POST';
    const endpoint = '/api/form-engine/submissions/bulk';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

});
