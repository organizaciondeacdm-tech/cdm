const { test, expect, request } = require('@playwright/test');
const { API_URL, requestJson } = require('../../helpers/api');

const ALLOWED_STATUSES = [200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 412, 422, 423, 429];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

test.describe('API structural segment 06', () => {
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

  test('01 DELETE /api/docentes/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/docentes/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('02 GET /api/escuelas/buscar', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas/buscar';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('03 GET /api/escuelas/estadisticas', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas/estadisticas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('04 GET /api/escuelas/000000000000000000000001/estadisticas', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas/000000000000000000000001/estadisticas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('05 GET /api/escuelas', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('06 GET /api/escuelas/000000000000000000000001/visitas', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas/000000000000000000000001/visitas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('07 POST /api/escuelas/000000000000000000000001/visitas', async () => {
    const method = 'POST';
    const endpoint = '/api/escuelas/000000000000000000000001/visitas';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('08 PUT /api/escuelas/000000000000000000000001/visitas/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/escuelas/000000000000000000000001/visitas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('09 DELETE /api/escuelas/000000000000000000000001/visitas/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/escuelas/000000000000000000000001/visitas/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('10 GET /api/escuelas/000000000000000000000001/proyectos', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas/000000000000000000000001/proyectos';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('11 POST /api/escuelas/000000000000000000000001/proyectos', async () => {
    const method = 'POST';
    const endpoint = '/api/escuelas/000000000000000000000001/proyectos';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('12 PUT /api/escuelas/000000000000000000000001/proyectos/000000000000000000000001', async () => {
    const method = 'PUT';
    const endpoint = '/api/escuelas/000000000000000000000001/proyectos/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('13 DELETE /api/escuelas/000000000000000000000001/proyectos/000000000000000000000001', async () => {
    const method = 'DELETE';
    const endpoint = '/api/escuelas/000000000000000000000001/proyectos/000000000000000000000001';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

  test('14 GET /api/escuelas/000000000000000000000001/informes', async () => {
    const method = 'GET';
    const endpoint = '/api/escuelas/000000000000000000000001/informes';
    if (MUTATING.has(method)) {
      const { response } = await requestJson(api, method, endpoint, {});
      await assertStatus(response, `${method} ${endpoint}`);
      return;
    }
    const res = await api.fetch(endpoint, { method });
    await assertStatus(res, `${method} ${endpoint}`);
  });

});
