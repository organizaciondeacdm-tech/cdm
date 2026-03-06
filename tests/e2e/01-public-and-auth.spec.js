const { test, expect, request } = require('@playwright/test');
const {
  API_URL,
  createApiContext,
  requestJson,
  requestRaw,
  parseJsonSafe,
  login,
  createAuthHeaders
} = require('./helpers/api');

test.describe('Public + Auth', () => {
  let api;

  test.beforeAll(async () => {
    api = await createApiContext(request);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('health/test/root endpoints', async () => {
    const health = await api.get('/health');
    const testRes = await api.get('/api/test');
    const root = await api.get('/');

    expect(health.status()).toBe(200);
    expect(testRes.status()).toBe(200);
    expect(root.status()).toBe(200);

    const healthJson = await parseJsonSafe(health);
    const testJson = await parseJsonSafe(testRes);
    const rootJson = await parseJsonSafe(root);

    expect(healthJson?.status).toBe('OK');
    expect(testJson?.success).toBeTruthy();
    expect(rootJson?.success).toBeTruthy();
  });

  test('login + profile + sessions + refresh token flow', async () => {
    const session = await login(api);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const { response: profileRes, text: profileBody } = await requestRaw(api, 'GET', '/api/auth/profile', auth);
    expect(profileRes.status()).toBe(200);

    const parsedProfile = JSON.parse(profileBody);
    expect(parsedProfile?.success).toBeTruthy();

    const { response: sessionsRes, text: sessionsBody } = await requestRaw(api, 'GET', '/api/auth/sessions', auth);
    expect(sessionsRes.status()).toBe(200);

    const parsedSessions = JSON.parse(sessionsBody);
    expect(parsedSessions?.success).toBeTruthy();
    expect(Array.isArray(parsedSessions?.data)).toBeTruthy();

    const { response: refreshRes, json: refreshJson } = await requestJson(api, 'POST', '/api/auth/refresh-token', {
      refreshToken: session.refreshToken
    });
    expect(refreshRes.status()).toBe(200);
    expect(refreshJson?.success).toBeTruthy();
    expect(refreshJson?.data?.tokens?.access).toBeTruthy();
    expect(refreshJson?.data?.tokens?.refresh).toBeTruthy();
  });

  test('admin sessions endpoint returns 200 for admin', async () => {
    const { headers } = await createAuthHeaders(api);
    const { response, text } = await requestRaw(api, 'GET', '/api/auth/admin/sessions', headers);

    expect(response.status()).toBe(200);
    const body = JSON.parse(text);
    expect(body?.success).toBeTruthy();
  });

  test('logout revokes current token', async () => {
    const session = await login(api);
    const headers = { Authorization: `Bearer ${session.accessToken}` };

    const { response: logoutRes, json: logoutJson } = await requestJson(api, 'POST', '/api/auth/logout', {} , headers);
    expect(logoutRes.status()).toBe(200);
    expect(logoutJson?.success).toBeTruthy();

    const profileAfter = await api.get('/api/auth/profile', { headers });
    expect(profileAfter.status()).toBe(401);
  });
});
