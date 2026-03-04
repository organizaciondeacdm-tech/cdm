const { expect } = require('@playwright/test');

const API_URL = process.env.E2E_API_URL || 'http://localhost:5000';
const AUTH_USER = process.env.E2E_USERNAME || process.env.E2E_USER || 'admin';
const passwordCandidates = [
  process.env.E2E_PASSWORD,
  process.env.E2E_PASS,
  'admin2025',
  'Admin2025!',
  'admin',
  'admin2025!'
].filter(Boolean);
let resolvedPassword = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function requestJson(context, method, path, body, headers = {}) {
  const response = await context.fetch(path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    data: body
  });
  const json = await parseJsonSafe(response);
  return { response, json };
}

async function requestRaw(context, method, path, headers = {}) {
  const response = await context.fetch(path, {
    method,
    headers
  });
  const text = await response.text();
  return { response, text };
}

async function login(context) {
  let lastStatus = null;
  let lastError = null;

  const candidates = resolvedPassword ? [resolvedPassword] : passwordCandidates;
  for (const password of candidates) {
    let attempts = 0;
    while (attempts < 3) {
      attempts += 1;
      const { response, json } = await requestJson(context, 'POST', '/api/auth/login', {
        username: AUTH_USER,
        password
      });

      lastStatus = response.status();
      lastError = json?.error;

      if (response.status() === 200 && json?.data?.tokens?.access) {
        resolvedPassword = password;
        return {
          user: json.data.user,
          accessToken: json.data.tokens.access,
          refreshToken: json.data.tokens.refresh
        };
      }

      if (response.status() === 429) {
        const retryAfter = Number(response.headers()['retry-after']) || 2;
        await sleep(Math.min(10000, retryAfter * 1000));
        continue;
      }

      break;
    }
  }

  throw new Error(`No se pudo autenticar en E2E. Usuario: ${AUTH_USER}. status=${lastStatus} error=${lastError || 'sin detalle'}`);
}

async function createAuthHeaders(context) {
  const session = await login(context);
  return {
    session,
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    }
  };
}

async function getFirstEscuelaId(context, headers) {
  const { response, text } = await requestRaw(context, 'GET', '/api/escuelas?limit=1', headers);
  expect(response.status()).toBe(200);

  const parsed = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();

  const escuelaId = parsed?.data?.escuelas?.[0]?._id;
  expect(escuelaId).toBeTruthy();
  return escuelaId;
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

module.exports = {
  API_URL,
  requestJson,
  requestRaw,
  parseJsonSafe,
  login,
  createAuthHeaders,
  getFirstEscuelaId,
  uniqueSuffix
};
