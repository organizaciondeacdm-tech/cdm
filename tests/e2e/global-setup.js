const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const appUrl = process.env.E2E_APP_URL || 'http://localhost:3000';
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:5000';
  const username = process.env.E2E_USERNAME || process.env.API_TEST_USERNAME || 'admin';
  const password = process.env.E2E_PASSWORD || process.env.API_TEST_PASSWORD || 'admin2025';

  const authPath = path.resolve(__dirname, '.auth', 'admin.json');

  const waitUntil = Date.now() + 120000;
  let healthy = false;
  while (Date.now() < waitUntil) {
    try {
      const health = await fetch(`${apiUrl}/health`);
      if (health.ok) {
        healthy = true;
        break;
      }
    } catch (e) {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!healthy) {
    throw new Error(`global-setup: backend no disponible en ${apiUrl}`);
  }

  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`global-setup login failed (${res.status}): ${txt}`);
  }

  const body = await res.json();
  const token = body?.data?.tokens?.access || body?.accessToken;
  if (!token) {
    throw new Error('global-setup: access token missing in login response');
  }

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: appUrl,
        localStorage: [
          { name: 'auth_token', value: token }
        ]
      }
    ]
  };

  fs.mkdirSync(path.dirname(authPath), { recursive: true });
  fs.writeFileSync(authPath, JSON.stringify(storageState, null, 2), 'utf8');
};
