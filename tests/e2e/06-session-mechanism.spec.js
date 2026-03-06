const { test, expect } = require('./helpers/fixtures');

test.describe('Session mechanism', () => {
  test('obtiene sesion, headers y cliente autenticado reutilizable', async ({ session, authHeaders, sessionKit }) => {
    expect(session?.accessToken).toBeTruthy();
    expect(session?.refreshToken).toBeTruthy();
    expect(String(authHeaders?.Authorization || '')).toContain('Bearer ');

    const { response, json } = await sessionKit.authJson('GET', '/api/auth/profile');
    expect(response.status()).toBe(200);
    expect(json?.success).toBeTruthy();
    expect(json?.data?._id).toBeTruthy();
  });
});

