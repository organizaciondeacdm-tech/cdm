const { test, expect, request } = require('@playwright/test');
const {
  API_URL,
  requestJson,
  requestRaw,
  createAuthHeaders,
  uniqueSuffix
} = require('./helpers/api');

test.describe('Forms + Admin', () => {
  let api;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_URL });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('forms public endpoints', async () => {
    const templates = await api.get('/api/forms/templates');
    const submissions = await api.get('/api/forms/submissions');
    const suggestions = await api.get('/api/forms/suggestions?q=esc&source=escuelas');

    expect(templates.status()).toBe(200);
    expect(submissions.status()).toBe(200);
    expect(suggestions.status()).toBe(200);
  });

  test('forms protected template CRUD + submissions flow', async () => {
    const { headers } = await createAuthHeaders(api);
    const suffix = uniqueSuffix();

    const templatePayload = {
      name: `Template E2E ${suffix}`,
      description: 'Template de pruebas E2E',
      entityType: 'custom',
      fields: [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'detalle', label: 'Detalle', type: 'textarea', required: false }
      ]
    };

    const { response: createTemplateRes, json: createTemplateJson } = await requestJson(api, 'POST', '/api/forms/templates', templatePayload, headers);
    expect(createTemplateRes.status()).toBe(201);

    const templateId = createTemplateJson?.data?._id;
    expect(templateId).toBeTruthy();

    const { response: updateTemplateRes } = await requestJson(api, 'PUT', `/api/forms/templates/${templateId}`, {
      name: `Template E2E actualizado ${suffix}`,
      fields: [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'detalle', label: 'Detalle', type: 'textarea', required: false },
        { name: 'fecha', label: 'Fecha', type: 'date', required: false }
      ]
    }, headers);
    expect(updateTemplateRes.status()).toBe(200);

    const { response: createSubmissionRes, json: createSubmissionJson } = await requestJson(api, 'POST', '/api/forms/submissions', {
      templateId,
      templateName: `Template E2E ${suffix}`,
      payload: {
        nombre: 'Registro E2E',
        detalle: 'Detalle de test'
      }
    });

    expect([201, 202]).toContain(createSubmissionRes.status());

    const listSubmissions = await api.get('/api/forms/submissions');
    expect(listSubmissions.status()).toBe(200);

    if (createSubmissionRes.status() === 201) {
      const submissionId = createSubmissionJson?.data?._id;
      expect(submissionId).toBeTruthy();

      const { response: updateSubmissionRes } = await requestJson(api, 'PUT', `/api/forms/submissions/${submissionId}`, {
        status: 'synced',
        payload: {
          nombre: 'Registro E2E actualizado',
          detalle: 'Actualizado'
        }
      });
      expect(updateSubmissionRes.status()).toBe(200);

      const { response: deleteSubmissionRes } = await requestJson(api, 'DELETE', `/api/forms/submissions/${submissionId}`, {});
      expect(deleteSubmissionRes.status()).toBe(200);
    }

    const { response: deleteTemplateRes } = await requestJson(api, 'DELETE', `/api/forms/templates/${templateId}`, {}, headers);
    expect(deleteTemplateRes.status()).toBe(200);
  });

  test('admin endpoints de usuarios, sesiones y seguridad', async () => {
    const { headers, session } = await createAuthHeaders(api);
    expect(String(session?.user?.username || '').toLowerCase()).toBe('papiweb');
    const suffix = uniqueSuffix();

    const checks200 = [
      '/api/admin/users',
      '/api/auth/admin/sessions',
      '/api/admin/roles',
      '/api/admin/permisos',
      '/api/admin/security/traffic/realtime',
      '/api/admin/security/traffic/history',
      '/api/admin/security/bans',
      '/api/admin/security/rules'
    ];

    for (const path of checks200) {
      const res = await api.get(path, { headers });
      expect(res.status(), `fallo en ${path}`).toBe(200);
    }

    const createUserPayload = {
      username: `e2e_user_${suffix}`,
      password: 'E2ePassword1',
      email: `e2e.${suffix}@acdm.local`,
      nombre: 'E2E',
      apellido: 'User',
      rol: 'viewer'
    };

    const { response: createUserRes, json: createUserJson } = await requestJson(api, 'POST', '/api/admin/users', createUserPayload, headers);
    expect(createUserRes.status()).toBe(201);

    const userId = createUserJson?.data?._id;
    expect(userId).toBeTruthy();

    const getUserRes = await api.get(`/api/admin/users/${userId}`, { headers });
    expect(getUserRes.status()).toBe(200);

    const { response: updateUserRes } = await requestJson(api, 'PUT', `/api/admin/users/${userId}`, {
      nombre: 'E2E Updated'
    }, headers);
    expect(updateUserRes.status()).toBe(200);

    const { response: updateRulesRes } = await requestJson(api, 'PUT', '/api/admin/security/rules', {
      bruteForceWindowMs: 60_000
    }, headers);
    expect(updateRulesRes.status()).toBe(200);

    const { response: cleanupSecRes } = await requestJson(api, 'POST', '/api/admin/security/cleanup', {
      historyRetentionDays: 30
    }, headers);
    expect(cleanupSecRes.status()).toBe(200);

    const { response: banRes } = await requestJson(api, 'POST', '/api/admin/security/bans', {
      ip: '203.0.113.9',
      minutes: 5,
      reason: 'E2E temp ban'
    }, headers);
    expect(banRes.status()).toBe(201);

    const unbanRes = await api.delete('/api/admin/security/bans/203.0.113.9', { headers });
    expect(unbanRes.status()).toBe(200);

    const { response: deleteUserRes } = await requestJson(api, 'DELETE', `/api/admin/users/${userId}`, {}, headers);
    expect(deleteUserRes.status()).toBe(200);

  });

  test('admin usuarios: roles desarrollador/supervisor + permisos cifrados/normalizados', async () => {
    const { headers } = await createAuthHeaders(api);
    const suffix = uniqueSuffix();

    const devPayload = {
      username: `dev_${suffix}`,
      password: 'E2ePassword1',
      email: `dev.${suffix}@acdm.local`,
      nombre: 'Dev',
      apellido: 'E2E',
      rol: 'desarollador'
    };

    const supPayload = {
      username: `sup_${suffix}`,
      password: 'E2ePassword1',
      email: `sup.${suffix}@acdm.local`,
      nombre: 'Sup',
      apellido: 'E2E',
      rol: 'supervisor'
    };

    const { response: createDevRes, json: createDevJson } = await requestJson(api, 'POST', '/api/admin/users', devPayload, headers);
    expect(createDevRes.status()).toBe(201);
    const devId = createDevJson?.data?._id;
    expect(devId).toBeTruthy();

    const { response: createSupRes, json: createSupJson } = await requestJson(api, 'POST', '/api/admin/users', supPayload, headers);
    expect(createSupRes.status()).toBe(201);
    const supId = createSupJson?.data?._id;
    expect(supId).toBeTruthy();

    const devGetRes = await api.get(`/api/admin/users/${devId}`, { headers });
    expect(devGetRes.status()).toBe(200);
    const devGetJson = await devGetRes.json();
    expect(devGetJson?.data?.rol).toBe('desarrollador');
    expect(Array.isArray(devGetJson?.data?.permisos)).toBeTruthy();
    expect(String(devGetJson?.data?.permisos?.[0] || '')).toContain('permv1.');
    expect(devGetJson?.data?.capabilities?.canManageUsers).toBeTruthy();

    const supGetRes = await api.get(`/api/admin/users/${supId}`, { headers });
    expect(supGetRes.status()).toBe(200);
    const supGetJson = await supGetRes.json();
    expect(supGetJson?.data?.rol).toBe('supervisor');
    expect(Array.isArray(supGetJson?.data?.permisos)).toBeTruthy();
    expect(String(supGetJson?.data?.permisos?.[0] || '')).toContain('permv1.');
    expect(supGetJson?.data?.capabilities?.canManageOperationalSections).toBeTruthy();

    const { response: bulkDeactivateRes } = await requestJson(api, 'POST', '/api/admin/users/bulk', {
      action: 'deactivate',
      userIds: [supId]
    }, headers);
    expect(bulkDeactivateRes.status()).toBe(200);

    const { response: bulkActivateRes } = await requestJson(api, 'POST', '/api/admin/users/bulk', {
      action: 'activate',
      userIds: [supId]
    }, headers);
    expect(bulkActivateRes.status()).toBe(200);

    const { response: roleBulkAddRes } = await requestJson(api, 'POST', '/api/admin/roles/bulk/permisos', {
      roles: ['supervisor'],
      permisos: ['ver_sesiones_admin'],
      operation: 'add',
      applyToUsers: false
    }, headers);
    expect(roleBulkAddRes.status()).toBe(200);

    const { response: roleBulkRemoveRes } = await requestJson(api, 'POST', '/api/admin/roles/bulk/permisos', {
      roles: ['supervisor'],
      permisos: ['ver_sesiones_admin'],
      operation: 'remove',
      applyToUsers: false
    }, headers);
    expect(roleBulkRemoveRes.status()).toBe(200);

    const { response: devLoginRes, json: devLoginJson } = await requestJson(api, 'POST', '/api/auth/login', {
      username: devPayload.username,
      password: devPayload.password
    });
    expect(devLoginRes.status()).toBe(200);
    const devAccessToken = devLoginJson?.data?.tokens?.access;
    expect(devAccessToken).toBeTruthy();

    const { response: impersonateRes, json: impersonateJson } = await requestJson(
      api,
      'POST',
      `/api/admin/users/${supId}/impersonate`,
      {},
      { Authorization: `Bearer ${devAccessToken}` }
    );
    expect(impersonateRes.status()).toBe(200);
    expect(impersonateJson?.data?.user?._id).toBe(supId);
    expect(impersonateJson?.data?.tokens?.access).toBeTruthy();
    expect(impersonateJson?.data?.tokens?.refresh).toBeTruthy();

    const { response: deleteDevRes } = await requestJson(api, 'DELETE', `/api/admin/users/${devId}`, {}, headers);
    expect(deleteDevRes.status()).toBe(200);
    const { response: deleteSupRes } = await requestJson(api, 'DELETE', `/api/admin/users/${supId}`, {}, headers);
    expect(deleteSupRes.status()).toBe(200);
  });

  test('admin escuelas CRUD en namespace /api/admin', async () => {
    const { headers } = await createAuthHeaders(api);
    const suffix = uniqueSuffix();

    const payload = {
      de: 'DE 01',
      escuela: `Escuela Admin E2E ${suffix}`,
      nivel: 'Primario',
      direccion: 'Admin E2E 123, CABA',
      email: `escuela.admin.${suffix}@acdm.local`,
      jornada: 'Simple',
      turno: 'Mañana'
    };

    const { response: createRes, json: createJson } = await requestJson(api, 'POST', '/api/admin/escuelas', payload, headers);
    expect(createRes.status()).toBe(201);

    const escuelaId = createJson?.data?._id;
    expect(escuelaId).toBeTruthy();

    const listRes = await api.get('/api/admin/escuelas', { headers });
    expect(listRes.status()).toBe(200);

    const getOneRes = await api.get(`/api/admin/escuelas/${escuelaId}`, { headers });
    expect(getOneRes.status()).toBe(200);

    const { response: updateRes } = await requestJson(api, 'PUT', `/api/admin/escuelas/${escuelaId}`, {
      direccion: 'Admin E2E 999, CABA'
    }, headers);
    expect(updateRes.status()).toBe(200);

    const { response: deleteRes } = await requestJson(api, 'DELETE', `/api/admin/escuelas/${escuelaId}`, {}, headers);
    expect(deleteRes.status()).toBe(200);
  });
});
