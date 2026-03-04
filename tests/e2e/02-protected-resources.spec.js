const { test, expect, request } = require('@playwright/test');
const {
  API_URL,
  requestJson,
  requestRaw,
  createAuthHeaders,
  getFirstEscuelaId,
  uniqueSuffix
} = require('./helpers/api');

test.describe('Protected resources', () => {
  let api;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_URL });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('dashboard, estadisticas, reportes, calendario y exportaciones', async () => {
    const { headers } = await createAuthHeaders(api);

    const checks = [
      ['/api/reportes/dashboard', 200],
      ['/api/estadisticas', 200],
      ['/api/reportes/escuelas', 200],
      ['/api/reportes/licencias', 200],
      ['/api/reportes/alumnos', 200],
      ['/api/calendario?year=2026&month=3', 200],
      ['/api/calendario?year=2026', 200],
      ['/api/export/json', 200],
      ['/api/export/csv', 200],
      ['/api/reportes/escuelas?formato=csv', 200],
      ['/api/export/pdf', 200],
      ['/api/buscar?q=escuela', 200],
      ['/api/alertas', 200],
      ['/api/schemas', 200]
    ];

    for (const [path, expected] of checks) {
      const res = await api.get(path, { headers });
      expect(res.status(), `fallo en ${path}`).toBe(expected);
    }
  });

  test('escuelas CRUD + buscar + estadisticas', async () => {
    const { headers } = await createAuthHeaders(api);
    const suffix = uniqueSuffix();

    const payload = {
      de: 'DE 01',
      escuela: `Escuela E2E ${suffix}`,
      nivel: 'Primario',
      direccion: 'Calle E2E 123, CABA',
      email: `escuela.${suffix}@acdm.local`,
      jornada: 'Simple',
      turno: 'Mañana'
    };

    const { response: createRes, json: createJson } = await requestJson(api, 'POST', '/api/escuelas', payload, headers);
    expect(createRes.status()).toBe(201);
    expect(createJson?.success).toBeTruthy();

    const escuelaId = createJson?.data?._id;
    expect(escuelaId).toBeTruthy();

    const listRes = await api.get('/api/escuelas?page=1&limit=5', { headers });
    expect(listRes.status()).toBe(200);

    const searchRes = await api.get('/api/escuelas/buscar?q=E2E', { headers });
    expect(searchRes.status()).toBe(200);

    const statsRes = await api.get('/api/escuelas/estadisticas', { headers });
    expect(statsRes.status()).toBe(200);

    const { response: updateRes } = await requestJson(api, 'PUT', `/api/escuelas/${escuelaId}`, {
      direccion: 'Calle E2E 999, CABA'
    }, headers);
    expect(updateRes.status()).toBe(200);

    const { response: deleteRes, json: deleteJson } = await requestJson(api, 'DELETE', `/api/escuelas/${escuelaId}`, {}, headers);
    expect(deleteRes.status()).toBe(200);
    expect(deleteJson?.success).toBeTruthy();
  });

  test('docentes CRUD + endpoints de estadisticas/licencias', async () => {
    const { headers } = await createAuthHeaders(api);
    const escuelaId = await getFirstEscuelaId(api, headers);
    const suffix = uniqueSuffix();

    const docentePayload = {
      escuela: escuelaId,
      nombre: 'Docente',
      apellido: `E2E-${suffix}`,
      dni: String(Date.now()).slice(-8),
      email: `docente.${suffix}@acdm.local`,
      fechaNacimiento: '1990-01-01',
      cargo: 'Titular'
    };

    const { response: createRes, json: createJson } = await requestJson(api, 'POST', '/api/docentes', docentePayload, headers);
    expect(createRes.status()).toBe(201);
    const docenteId = createJson?.data?._id;
    expect(docenteId).toBeTruthy();

    expect((await api.get('/api/docentes', { headers })).status()).toBe(200);
    expect((await api.get('/api/docentes/licencias-proximas', { headers })).status()).toBe(200);
    expect((await api.get('/api/docentes/estadisticas', { headers })).status()).toBe(200);

    const { response: updateRes } = await requestJson(api, 'PUT', `/api/docentes/${docenteId}`, {
      estado: 'Licencia',
      motivo: 'E2E licencia',
      fechaInicioLicencia: '2026-03-01',
      fechaFinLicencia: '2026-03-31'
    }, headers);
    expect(updateRes.status()).toBe(200);

    const { response: deleteRes } = await requestJson(api, 'DELETE', `/api/docentes/${docenteId}`, {}, headers);
    expect(deleteRes.status()).toBe(200);
  });

  test('alumnos CRUD + estadisticas', async () => {
    const { headers } = await createAuthHeaders(api);
    const escuelaId = await getFirstEscuelaId(api, headers);
    const suffix = uniqueSuffix();

    const alumnoPayload = {
      escuela: escuelaId,
      nombre: 'Alumno',
      apellido: `E2E-${suffix}`,
      dni: String(Date.now()).slice(-8),
      fechaNacimiento: '2015-01-01',
      gradoSalaAnio: '3° Grado',
      diagnostico: 'Sin especificar'
    };

    const { response: createRes, json: createJson } = await requestJson(api, 'POST', '/api/alumnos', alumnoPayload, headers);
    expect(createRes.status()).toBe(201);

    const alumnoId = createJson?.data?._id;
    expect(alumnoId).toBeTruthy();

    expect((await api.get('/api/alumnos', { headers })).status()).toBe(200);
    expect((await api.get('/api/alumnos/estadisticas', { headers })).status()).toBe(200);

    const { response: updateRes } = await requestJson(api, 'PUT', `/api/alumnos/${alumnoId}`, {
      diagnostico: 'TEA'
    }, headers);
    expect(updateRes.status()).toBe(200);

    const { response: deleteRes } = await requestJson(api, 'DELETE', `/api/alumnos/${alumnoId}`, {}, headers);
    expect(deleteRes.status()).toBe(200);
  });

  test('informes globales CRUD', async () => {
    const { headers } = await createAuthHeaders(api);

    const { response: createRes, json: createJson } = await requestJson(api, 'POST', '/api/informes', {
      titulo: 'Informe E2E',
      estado: 'Pendiente',
      observaciones: 'Creado por test'
    }, headers);

    expect(createRes.status()).toBe(201);
    const informeId = createJson?.data?._id;
    expect(informeId).toBeTruthy();

    const list = await api.get('/api/informes', { headers });
    expect(list.status()).toBe(200);

    const getOne = await api.get(`/api/informes/${informeId}`, { headers });
    expect(getOne.status()).toBe(200);

    const { response: updateRes } = await requestJson(api, 'PUT', `/api/informes/${informeId}`, {
      estado: 'Completado'
    }, headers);
    expect(updateRes.status()).toBe(200);

    const { response: deleteRes } = await requestJson(api, 'DELETE', `/api/informes/${informeId}`, {}, headers);
    expect(deleteRes.status()).toBe(200);
  });

  test('alertas y email de alerta', async () => {
    const { headers } = await createAuthHeaders(api);

    const alertsRes = await api.get('/api/alertas', { headers });
    expect(alertsRes.status()).toBe(200);

    const { response: ackRes } = await requestJson(api, 'POST', '/api/alertas/000000000000000000000001/acknowledge', {}, headers);
    expect(ackRes.status()).toBe(200);

    const { response: emailRes } = await requestJson(api, 'POST', '/api/send-alert-email', {
      to: 'qa@acdm.local',
      subject: 'E2E Alertas',
      alerts: [{ id: '1', tipo: 'test' }],
      message: 'Mensaje E2E'
    }, headers);

    expect(emailRes.status()).toBe(200);
  });
});
