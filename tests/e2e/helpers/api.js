const { expect } = require('@playwright/test');
const crypto = require('crypto');
require('dotenv').config();

const API_URL = process.env.E2E_API_URL || 'http://localhost:5000';
const AUTH_USER = process.env.E2E_USERNAME || process.env.E2E_USER || 'papiweb';
const AUTH_USER_FALLBACKS = Array.from(new Set([AUTH_USER, 'papiweb', 'admin'].filter(Boolean)));
const passwordCandidates = [
  process.env.E2E_PASSWORD,
  process.env.E2E_PASS,
  "4501{GC3{j4Quq15K$at{}uFEK8}v-+mA9B,$EC77at4Cu)iw}'}",
  '4501{GC3{j4Quq15K$at{}uFEK8}v-+mA9B,$EC77at4Cu)iw}',
  'admin2025',
  'Admin2025!',
  'admin',
  'admin2025!'
].filter(Boolean);
let resolvedCredentials = null;
const PAYLOAD_ITERATIONS = 150000;
const PAYLOAD_KEY_LENGTH = 32;
const PAYLOAD_AUTH_TAG_LEN = 16;
const PAYLOAD_ENVELOPE = 'acdm-payload-v1';
const SESSION_TTL_SKEW_SECONDS = 30;
const sessionCacheByContext = new WeakMap();
const payloadSecretByContext = new WeakMap();
const transportStateByContext = new WeakMap();

const sha256Hex = (value = '') => crypto.createHash('sha256').update(String(value)).digest('hex');
const normalizePath = (value = '') => String(value || '').split('?')[0];

const payloadDigest = (payload) => {
  if (payload === undefined) return sha256Hex('');
  try {
    return sha256Hex(JSON.stringify(payload));
  } catch {
    return sha256Hex('');
  }
};

const getTransportState = (context) => {
  const current = transportStateByContext.get(context);
  if (current) return current;
  const initial = {
    publicChannel: null,
    secureByToken: new Map()
  };
  transportStateByContext.set(context, initial);
  return initial;
};

const parseBearerToken = (headers = {}) => {
  const raw = String(headers?.Authorization || headers?.authorization || '').trim();
  if (!raw.toLowerCase().startsWith('bearer ')) return '';
  return raw.slice(7).trim();
};

const makeNonce = () => crypto.randomBytes(16).toString('base64url');

const buildPublicEndpointHeaders = ({ channel, method, path, body }) => {
  const ts = Date.now();
  const seq = Number(channel?.seq || 0) + 1;
  const nonce = makeNonce();
  const key = sha256Hex(`${String(channel?.channelId || '')}|${String(channel?.serverNonce || '')}|${String(channel?.clientToken || '')}`);
  const bodyHash = payloadDigest(body);
  const normalizedPath = normalizePath(path);
  const alias = `epa1.${sha256Hex(`${key}|alias|${method}|${normalizedPath}|${seq}|${nonce}|${ts}`).slice(0, 48)}`;
  const signature = `eps1.${sha256Hex(`${key}|sig|${method}|${normalizedPath}|${seq}|${nonce}|${ts}|${bodyHash}`).slice(0, 64)}`;
  channel.seq = seq;
  return {
    'x-endpoint-channel': String(channel?.channelId || ''),
    'x-endpoint-nonce': nonce,
    'x-endpoint-ts': String(ts),
    'x-endpoint-seq': String(seq),
    'x-endpoint-alias': alias,
    'x-endpoint-signature': signature
  };
};

const buildSecureEndpointHeaders = ({ channel, token, method, path, body }) => {
  const ts = Date.now();
  const seq = Number(channel?.seq || 0) + 1;
  const nonce = makeNonce();
  const key = sha256Hex(`${String(token || '')}|${String(channel?.serverNonce || '')}|${String(channel?.sessionId || '')}|${String(channel?.clientToken || '')}`);
  const bodyHash = payloadDigest(body);
  const normalizedPath = normalizePath(path);
  const alias = `epa1.${sha256Hex(`${key}|alias|${method}|${normalizedPath}|${seq}|${nonce}|${ts}`).slice(0, 48)}`;
  const signature = `eps1.${sha256Hex(`${key}|sig|${method}|${normalizedPath}|${seq}|${nonce}|${ts}|${bodyHash}`).slice(0, 64)}`;
  channel.seq = seq;
  return {
    'x-endpoint-nonce': nonce,
    'x-endpoint-ts': String(ts),
    'x-endpoint-seq': String(seq),
    'x-endpoint-alias': alias,
    'x-endpoint-signature': signature
  };
};

const setPublicChannel = (context, channel) => {
  if (!channel || !channel.channelId) return;
  const state = getTransportState(context);
  state.publicChannel = {
    ...channel,
    seq: Number(channel.seq || 0) || 0
  };
};

const setSecureChannel = (context, token, channel) => {
  if (!token || !channel || !channel.serverNonce || !channel.clientToken) return;
  const state = getTransportState(context);
  state.secureByToken.set(token, {
    ...channel,
    seq: Number(channel.seq || 0) || 0
  });
};

const readSecureHint = async (response) => {
  if (response.status() !== 428) return null;
  const payload = await parseJsonSafe(response);
  if (!payload || payload.code !== 'SECURE_ENDPOINT_REQUIRED') return null;
  return payload;
};

const performSecureFetch = async (context, path, options = {}) => {
  const rawFetch = context.__rawFetch || context.fetch.bind(context);
  const requestPath = String(path || '');
  const method = String(options.method || 'GET').toUpperCase();
  const isApiRoute = requestPath.startsWith('/api/');
  if (!isApiRoute) {
    return rawFetch(path, { ...options, method });
  }

  const baseHeaders = {
    ...(options.headers || {})
  };
  const alreadySigned = !!String(baseHeaders['x-endpoint-signature'] || baseHeaders['X-Endpoint-Signature'] || '').trim();
  if (alreadySigned) {
    return rawFetch(path, { ...options, method, headers: baseHeaders });
  }

  const token = parseBearerToken(baseHeaders);
  const payloadBody = options.data;
  const state = getTransportState(context);

  const signHeaders = () => {
    if (token) {
      const secureChannel = state.secureByToken.get(token);
      return secureChannel
        ? buildSecureEndpointHeaders({ channel: secureChannel, token, method, path: requestPath, body: payloadBody })
        : {};
    }
    return state.publicChannel
      ? buildPublicEndpointHeaders({ channel: state.publicChannel, method, path: requestPath, body: payloadBody })
      : {};
  };

  let response = await rawFetch(path, {
    ...options,
    method,
    headers: {
      ...baseHeaders,
      ...signHeaders()
    }
  });

  const secureHint = await readSecureHint(response);
  if (!secureHint) return response;

  if (token) {
    setSecureChannel(context, token, secureHint.secureChannel);
  } else {
    setPublicChannel(context, secureHint.publicChannel);
  }

  return rawFetch(path, {
    ...options,
    method,
    headers: {
      ...baseHeaders,
      ...signHeaders()
    }
  });
};

const installSecureTransport = (context) => {
  if (!context || context.__secureTransportInstalled) return context;

  const rawFetch = context.fetch.bind(context);
  Object.defineProperty(context, '__rawFetch', {
    value: rawFetch,
    writable: false,
    enumerable: false,
    configurable: false
  });
  Object.defineProperty(context, '__secureTransportInstalled', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  context.fetch = (path, options = {}) => performSecureFetch(context, path, options);
  context.get = (path, options = {}) => context.fetch(path, { ...options, method: 'GET' });
  context.head = (path, options = {}) => context.fetch(path, { ...options, method: 'HEAD' });
  context.delete = (path, options = {}) => context.fetch(path, { ...options, method: 'DELETE' });
  context.post = (path, options = {}) => context.fetch(path, { ...options, method: 'POST' });
  context.put = (path, options = {}) => context.fetch(path, { ...options, method: 'PUT' });
  context.patch = (path, options = {}) => context.fetch(path, { ...options, method: 'PATCH' });

  return context;
};

async function createApiContext(request) {
  const context = await request.newContext({ baseURL: API_URL });
  return installSecureTransport(context);
}

const getPayloadSecretFallback = () => (
  process.env.VITE_AUTH_STORAGE_SECRET ||
  process.env.ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'acdm-default-payload-secret-change-me'
);

async function resolvePayloadSecret(context) {
  const cached = payloadSecretByContext.get(context);
  if (cached) return cached;

  let resolved = getPayloadSecretFallback();
  try {
    const response = await performSecureFetch(context, '/api/runtime-environment', { method: 'GET' });
    const payload = await parseJsonSafe(response);
    const runtimeSecret = payload?.data?.VITE_AUTH_STORAGE_SECRET;
    if (response.status() === 200 && runtimeSecret) {
      resolved = String(runtimeSecret);
    }
  } catch {
    // fallback silencioso al secreto local
  }

  payloadSecretByContext.set(context, resolved);
  return resolved;
}

const encryptPayloadForApi = (payload, secret) => {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(String(secret), salt, PAYLOAD_ITERATIONS, PAYLOAD_KEY_LENGTH, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(payload || {}), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, tag.subarray(0, PAYLOAD_AUTH_TAG_LEN)]);
  return {
    __enc: PAYLOAD_ENVELOPE,
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    data: combined.toString('base64')
  };
};

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
  installSecureTransport(context);
  const doRequest = async (secret) => {
    const encryptedBody = body === undefined ? undefined : encryptPayloadForApi(body, secret);
    const response = await performSecureFetch(context, path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers
      },
      data: encryptedBody
    });
    const json = await parseJsonSafe(response);
    return { response, json };
  };

  const secret = await resolvePayloadSecret(context);
  let result = await doRequest(secret);

  const decryptError = String(result?.json?.error || '').toLowerCase().includes('no se pudo descifrar el payload');
  if (result.response.status() === 400 && decryptError) {
    payloadSecretByContext.delete(context);
    const fallbackSecret = getPayloadSecretFallback();
    if (String(fallbackSecret) !== String(secret)) {
      result = await doRequest(fallbackSecret);
    }
  }

  return result;
}

async function requestRaw(context, method, path, headers = {}) {
  installSecureTransport(context);
  const response = await performSecureFetch(context, path, {
    method,
    headers
  });
  const text = await response.text();
  return { response, text };
}

async function login(context) {
  let lastStatus = null;
  let lastError = null;

  if (resolvedCredentials) {
    const { response, json } = await requestJson(context, 'POST', '/api/auth/login', resolvedCredentials);
    if (response.status() === 200 && json?.data?.tokens?.access) {
      return {
        user: json.data.user,
        accessToken: json.data.tokens.access,
        refreshToken: json.data.tokens.refresh,
        username: resolvedCredentials.username,
        password: resolvedCredentials.password
      };
    }
  }

  const perUserCandidates = (username) => {
    if (String(username).toLowerCase() === 'admin') {
      return Array.from(new Set([
        process.env.E2E_PASSWORD,
        process.env.E2E_PASS,
        'Admin2025!',
        'admin2025',
        'admin2025!',
        'admin'
      ].filter(Boolean)));
    }

    return Array.from(new Set([
      process.env.E2E_PASSWORD,
      process.env.E2E_PASS,
      "4501{GC3{j4Quq15K$at{}uFEK8}v-+mA9B,$EC77at4Cu)iw}'}",
      '4501{GC3{j4Quq15K$at{}uFEK8}v-+mA9B,$EC77at4Cu)iw}',
      'admin2025',
      'Admin2025!',
      ...passwordCandidates
    ].filter(Boolean)));
  };

  for (const username of AUTH_USER_FALLBACKS) {
    for (const password of perUserCandidates(username)) {
      let attempts = 0;
      while (attempts < 2) {
        attempts += 1;
        const { response, json } = await requestJson(context, 'POST', '/api/auth/login', {
          username,
          password
        });

        lastStatus = response.status();
        lastError = json?.error;

        if (response.status() === 200 && json?.data?.tokens?.access) {
          setSecureChannel(context, json.data.tokens.access, json?.data?.secureChannel);
          resolvedCredentials = { username, password };
          return {
            user: json.data.user,
            accessToken: json.data.tokens.access,
            refreshToken: json.data.tokens.refresh,
            username,
            password
          };
        }

        if (response.status() === 429) {
          const retryAfter = Number(response.headers()['retry-after']) || Number(json?.retryAfterSeconds) || 2;
          await sleep(Math.min(10000, Math.max(1, retryAfter) * 1000));
          continue;
        }

        break;
      }
    }
  }

  throw new Error(`No se pudo autenticar en E2E. Usuarios probados: ${AUTH_USER_FALLBACKS.join(', ')}. status=${lastStatus} error=${lastError || 'sin detalle'}`);
}

const parseJwtExp = (token) => {
  try {
    const [, payload] = String(token || '').split('.');
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return Number(json?.exp || 0) || null;
  } catch {
    return null;
  }
};

const isSessionExpired = (session) => {
  const exp = parseJwtExp(session?.accessToken);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp <= (now + SESSION_TTL_SKEW_SECONDS);
};

async function verifySession(context, session) {
  if (!session?.accessToken) return false;
  if (isSessionExpired(session)) return false;
  const { response } = await requestRaw(context, 'GET', '/api/auth/profile', {
    Authorization: `Bearer ${session.accessToken}`
  });
  return response.status() === 200;
}

async function getSession(context, options = {}) {
  const { force = false } = options;
  const cached = sessionCacheByContext.get(context);

  if (!force && cached) {
    const valid = await verifySession(context, cached);
    if (valid) return cached;
  }

  const fresh = await login(context);
  sessionCacheByContext.set(context, fresh);
  return fresh;
}

async function getResolvedCredentials(context) {
  const session = await getSession(context);
  return {
    username: session?.username || resolvedCredentials?.username || AUTH_USER,
    password: session?.password || resolvedCredentials?.password || process.env.E2E_PASSWORD || process.env.E2E_PASS || 'admin2025'
  };
}

async function createAuthHeaders(context) {
  const session = await getSession(context);
  return {
    session,
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    }
  };
}

async function createSessionKit(context) {
  const { session, headers } = await createAuthHeaders(context);

  const authJson = async (method, path, body, extraHeaders = {}) => (
    requestJson(context, method, path, body, { ...headers, ...extraHeaders })
  );

  const authRaw = async (method, path, extraHeaders = {}) => (
    requestRaw(context, method, path, { ...headers, ...extraHeaders })
  );

  return {
    session,
    headers,
    authJson,
    authRaw
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
  createApiContext,
  requestJson,
  requestRaw,
  parseJsonSafe,
  login,
  getSession,
  getResolvedCredentials,
  createAuthHeaders,
  createSessionKit,
  getFirstEscuelaId,
  uniqueSuffix
};
