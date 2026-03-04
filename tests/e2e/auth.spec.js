// ─────────────────────────────────────────────────────────────────────────────
// auth.spec.js  –  Authentication flows (UI + API)
// ─────────────────────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');
const {
  DEFAULT_API_URL,
  gotoLogin,
  loginUI,
  logoutUI,
  loginAPI,
  authRequest
} = require('./helpers/systematic');

// ── Login page rendering ──────────────────────────────────────────────────────
test.describe('Auth – Pantalla de Login', () => {
  test('muestra el título y los campos requeridos', async ({ page }) => {
    await gotoLogin(page);

    // Title
    await expect(
      page.locator('.login-title, h1').filter({ hasText: 'Sistema ACDM' }).first()
    ).toBeVisible();

    // Username field
    await expect(
      page.locator('input[name="username"], input[placeholder="admin"], input[placeholder="Usuario"]').first()
    ).toBeVisible();

    // Password field
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: /Ingresar/i })).toBeVisible();
  });

  test('muestra credenciales demo en la página', async ({ page }) => {
    await gotoLogin(page);
    // The page shows "admin / admin2025" as hint text
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/admin/i);
  });
});

// ── Invalid credentials ───────────────────────────────────────────────────────
test.describe('Auth – Credenciales inválidas', () => {
  test('rechaza usuario incorrecto con mensaje de error', async ({ page }) => {
    await gotoLogin(page);
    await page
      .locator('input[name="username"], input[placeholder="admin"], input[placeholder="Usuario"]')
      .first()
      .fill('usuario-que-no-existe');
    await page.locator('input[type="password"]').first().fill('claveIncorrecta123');
    await page.getByRole('button', { name: /Ingresar/i }).click();

    // Either an .alert/.error element or an inline error
    const errorEl = page
      .locator('.alert, .error, [class*="error"], [class*="alert"]')
      .first();
    await errorEl.waitFor({ state: 'visible', timeout: 8_000 });
    const errorText = await errorEl.textContent();
    expect(errorText).toMatch(/inválid|incorrect|credencial|contraseña|unauthorized/i);
  });

  test('rechaza contraseña incorrecta con usuario válido', async ({ page }) => {
    await gotoLogin(page);
    await page
      .locator('input[name="username"], input[placeholder="admin"], input[placeholder="Usuario"]')
      .first()
      .fill('admin');
    await page.locator('input[type="password"]').first().fill('claveIncorrecta!');
    await page.getByRole('button', { name: /Ingresar/i }).click();

    const errorEl = page
      .locator('.alert, .error, [class*="error"], [class*="alert"]')
      .first();
    await errorEl.waitFor({ state: 'visible', timeout: 8_000 });
    await expect(errorEl).toBeVisible();
  });
});

// ── Successful login / logout ─────────────────────────────────────────────────
test.describe('Auth – Login y Logout exitosos', () => {
  test('permite login con admin/admin2025 y muestra el dashboard', async ({ page }) => {
    await loginUI(page);

    // The sidebar/nav should be visible
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();

    // The header title "Sistema ACDM" should appear
    const header = page
      .locator('.header-title, header')
      .filter({ hasText: 'Sistema ACDM' })
      .first();
    await expect(header).toBeVisible();
  });

  test('permite logout y regresa a la pantalla de login', async ({ page }) => {
    await loginUI(page);
    await logoutUI(page);

    // Login screen visible again
    await expect(
      page.locator('.login-title, h1').filter({ hasText: 'Sistema ACDM' }).first()
    ).toBeVisible();

    // App shell is gone
    await expect(page.locator('.sidebar').first()).not.toBeVisible();
  });

  test('después del logout, recargar vuelve a mostrar login', async ({ page }) => {
    await loginUI(page);
    await logoutUI(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(
      page.locator('.login-title, h1').filter({ hasText: 'Sistema ACDM' }).first()
    ).toBeVisible();
  });
});

// ── API auth endpoints ────────────────────────────────────────────────────────
test.describe('Auth – API REST', () => {
  test('POST /api/auth/login con credenciales válidas devuelve 200 y tokens', async ({ request }) => {
    const res = await request.post(`${DEFAULT_API_URL}/api/auth/login`, {
      data: { username: 'admin', password: 'admin2025' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.tokens?.access).toBeTruthy();
    expect(body.data?.tokens?.refresh).toBeTruthy();
  });

  test('POST /api/auth/login con credenciales inválidas devuelve 401', async ({ request }) => {
    const res = await request.post(`${DEFAULT_API_URL}/api/auth/login`, {
      data: { username: 'admin', password: 'WRONG_PASSWORD' }
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/auth/profile sin token devuelve 401', async ({ request }) => {
    const res = await request.get(`${DEFAULT_API_URL}/api/auth/profile`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/auth/profile con token válido devuelve 200', async ({ request }) => {
    const token = await loginAPI(request);
    const res = await authRequest(request, token, 'GET', '/api/auth/profile');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data?.username).toBe('admin');
  });

  test('GET /api/auth/sessions lista sesiones activas', async ({ request }) => {
    const token = await loginAPI(request);
    const res = await authRequest(request, token, 'GET', '/api/auth/sessions');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('POST /api/auth/refresh-token renueva el access token', async ({ request }) => {
    // First login to get refresh token
    const loginRes = await request.post(`${DEFAULT_API_URL}/api/auth/login`, {
      data: { username: 'admin', password: 'admin2025' }
    });
    const loginBody = await loginRes.json();
    const refreshToken = loginBody.data?.tokens?.refresh;
    expect(refreshToken).toBeTruthy();

    const res = await request.post(`${DEFAULT_API_URL}/api/auth/refresh-token`, {
      data: { refreshToken }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data?.tokens?.access).toBeTruthy();
  });

  test('DELETE /api/auth/sessions revoca todas las sesiones', async ({ request }) => {
    const token = await loginAPI(request);
    const res = await authRequest(request, token, 'DELETE', '/api/auth/sessions');
    expect(res.status()).toBe(200);
  });
});
