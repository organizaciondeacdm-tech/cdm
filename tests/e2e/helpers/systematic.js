// ─────────────────────────────────────────────────────────────────────────────
// helpers/systematic.js  –  Shared utilities for all Playwright E2E tests
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FRONTEND_URL = process.env.E2E_APP_URL  || 'http://localhost:3000';
const DEFAULT_API_URL       = process.env.E2E_API_URL  || 'http://localhost:5000';

const TEST_USER = {
  username: process.env.E2E_USERNAME           ||
            process.env.API_TEST_USERNAME       ||
            'admin',
  password: process.env.E2E_PASSWORD           ||
            process.env.API_TEST_PASSWORD       ||
            'admin2025'
};

// ── Misc ─────────────────────────────────────────────────────────────────────

/** Returns a short unique suffix safe to embed in names / emails */
function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

/**
 * Navigate to the app root and wait for the login screen to appear.
 */
async function gotoLogin(page) {
  await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  // Either the AppWithAuth login-title or the ACDMSystemMongo h1 login title
  await page
    .locator('.login-title, h1')
    .filter({ hasText: 'Sistema ACDM' })
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}

/**
 * Fill the login form and wait until the main app shell is visible.
 */
async function loginUI(
  page,
  username = TEST_USER.username,
  password  = TEST_USER.password
) {
  await gotoLogin(page);

  // Username field – accept both name="username" and placeholder="admin"
  const usernameInput = page.locator(
    'input[name="username"], input[placeholder="admin"], input[placeholder="Usuario"]'
  ).first();
  await usernameInput.fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /Ingresar/i }).click();

  // Wait for the header / sidebar that confirms the user is inside the app
  await page
    .locator('.header-title, .sidebar, nav.sidebar')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}

/**
 * Click the Salir / logout button and confirm the login screen reappears.
 */
async function logoutUI(page) {
  // Button might say "Salir" or have a logout icon
  const btn = page.locator('button').filter({ hasText: /Salir|Logout|Cerrar/i }).first();
  await btn.waitFor({ state: 'visible', timeout: 8_000 });
  await btn.click();
  await page
    .locator('.login-title, h1')
    .filter({ hasText: 'Sistema ACDM' })
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
}

/**
 * Click a nav-item by its visible text label.
 */
async function gotoSection(page, sectionLabel) {
  await page
    .locator('.nav-item')
    .filter({ hasText: sectionLabel })
    .first()
    .click();
  // Small settle time so the section mounts
  await page.waitForTimeout(400);
}

/**
 * Wait for a section heading to become visible.
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} headingText
 */
async function waitForHeading(page, headingText) {
  await page
    .getByRole('heading', { name: headingText })
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
}

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * Login via the REST API and return the access token.
 */
async function loginAPI(
  request,
  username = TEST_USER.username,
  password  = TEST_USER.password
) {
  const res = await request.post(`${DEFAULT_API_URL}/api/auth/login`, {
    data: { username, password }
  });

  if (!res.ok()) {
    throw new Error(`loginAPI: HTTP ${res.status()} – ${await res.text()}`);
  }

  const body = await res.json();
  const token =
    body?.data?.tokens?.access  ||
    body?.accessToken            ||
    null;

  if (!token) {
    throw new Error(`loginAPI: no access token in response – ${JSON.stringify(body)}`);
  }
  return token;
}

/**
 * Authenticated fetch wrapper.
 */
async function authRequest(request, token, method, path, data) {
  return request.fetch(`${DEFAULT_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    ...(data !== undefined ? { data } : {})
  });
}

/**
 * Returns the parsed JSON body of an auth request, asserting the status code.
 */
async function authJson(request, token, method, path, data, expectedStatus = 200) {
  const res = await authRequest(request, token, method, path, data);
  if (res.status() !== expectedStatus) {
    const txt = await res.text();
    throw new Error(
      `authJson: ${method} ${path} → expected ${expectedStatus} got ${res.status()}\n${txt}`
    );
  }
  return res.json();
}

// ── Escuela helpers ───────────────────────────────────────────────────────────

async function findEscuelaByName(request, token, escuelaName) {
  const res = await authRequest(request, token, 'GET', '/api/escuelas?limit=200');
  if (!res.ok()) return null;
  const body = await res.json();
  const list = body?.data?.escuelas || [];
  return list.find((e) => e.escuela === escuelaName) ?? null;
}

async function safeDeleteEscuelaByName(request, token, escuelaName) {
  const esc = await findEscuelaByName(request, token, escuelaName);
  if (esc?._id) {
    await authRequest(request, token, 'DELETE', `/api/escuelas/${esc._id}`);
  }
}

module.exports = {
  DEFAULT_FRONTEND_URL,
  DEFAULT_API_URL,
  TEST_USER,
  uniqueSuffix,
  // UI
  gotoLogin,
  loginUI,
  logoutUI,
  gotoSection,
  waitForHeading,
  // API
  loginAPI,
  authRequest,
  authJson,
  // Escuelas
  findEscuelaByName,
  safeDeleteEscuelaByName
};
