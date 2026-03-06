const { test, expect, request } = require('@playwright/test');
const { API_URL, createApiContext, requestJson } = require('../../helpers/api');

const ALLOWED_STATUSES = [200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 412, 422, 423, 429];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

test.describe('API structural segment 02', () => {
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

  test('01 POST /api/admin/roles/bulk/permisos', async () => {
    const method = 'POST';
    const endpoint = '/api/admin/roles/bulk/permisos';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('02 GET /api/admin/permisos', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/permisos';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('03 GET /api/admin/security/traffic/realtime', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/security/traffic/realtime';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('04 GET /api/admin/security/traffic/history', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/security/traffic/history';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('05 POST /api/admin/security/traffic/realtime/clear', async () => {
    const method = 'POST';
    const endpoint = '/api/admin/security/traffic/realtime/clear';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('06 POST /api/admin/security/traffic/history/clear', async () => {
    const method = 'POST';
    const endpoint = '/api/admin/security/traffic/history/clear';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('07 GET /api/admin/security/bans', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/security/bans';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('08 POST /api/admin/security/bans', async () => {
    const method = 'POST';
    const endpoint = '/api/admin/security/bans';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('09 DELETE /api/admin/security/bans/203.0.113.10', async () => {
    const method = 'DELETE';
    const endpoint = '/api/admin/security/bans/203.0.113.10';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('10 GET /api/admin/security/rules', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/security/rules';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('11 PUT /api/admin/security/rules', async () => {
    const method = 'PUT';
    const endpoint = '/api/admin/security/rules';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('12 POST /api/admin/security/cleanup', async () => {
    const method = 'POST';
    const endpoint = '/api/admin/security/cleanup';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('13 GET /api/admin/auditoria', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/auditoria';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('14 GET /api/admin/sessions', async () => {
    const method = 'GET';
    const endpoint = '/api/admin/sessions';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

});
