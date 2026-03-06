import { getApiUrl } from './apiConfig.js';
import { getSecureItem, removeSecureItem, setSecureItem } from './secureStorage.js';
import { encryptJsonBodyIfNeeded } from './payloadCrypto.js';

const AUTH_SESSION_KEY = 'acdm_auth_session';
const TRAFFIC_LOCK_CODE = 'TRAFFIC_LOCK_REQUIRED';
const ACCESS_TOKEN_REQUIRED_CODE = 'ACCESS_TOKEN_REQUIRED';

let authCache = null;
let refreshPromise = null;

const emitTrafficLockEvent = (payload = {}) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('acdm:traffic-lock', { detail: payload }));
};

const isAccessTokenRequiredPayload = (payload = {}) => {
  const code = String(payload?.code || '').trim().toUpperCase();
  if (code === ACCESS_TOKEN_REQUIRED_CODE) return true;
  const message = String(payload?.error || payload?.message || '').trim().toLowerCase();
  return message.includes('token de acceso requerido');
};

const toBase64Url = (value = '') => (
  btoa(String(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
);

const sha256Hex = async (input) => {
  const source = new TextEncoder().encode(String(input || ''));
  const digest = await window.crypto.subtle.digest('SHA-256', source);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const cleanupLegacyAuthStorage = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('auth_token');
};

const withJsonHeaders = (headers = {}, body) => {
  const finalHeaders = { ...headers };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  return finalHeaders;
};

export async function getAuthSession() {
  if (authCache) return authCache;

  cleanupLegacyAuthStorage();
  authCache = await getSecureItem(AUTH_SESSION_KEY);
  return authCache;
}

export async function setAuthSession(session) {
  authCache = session;
  await setSecureItem(AUTH_SESSION_KEY, session);
}

export async function clearAuthSession() {
  authCache = null;
  removeSecureItem(AUTH_SESSION_KEY);
  cleanupLegacyAuthStorage();
}

export async function loginWithSession(username, password) {
  const loginHeaders = { 'Content-Type': 'application/json' };
  const loginBody = await encryptJsonBodyIfNeeded(JSON.stringify({ username, password }), loginHeaders);
  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: loginHeaders,
    body: loginBody
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const user = payload?.data?.user;
  const access = payload?.data?.tokens?.access;
  const refresh = payload?.data?.tokens?.refresh;

  if (!user || !access || !refresh) {
    throw new Error('Respuesta inválida del servidor de autenticación');
  }

  const session = {
    user,
    tokens: { access, refresh },
    updatedAt: Date.now()
  };

  await setAuthSession(session);
  return session;
}

async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = await getAuthSession();
    const refreshToken = session?.tokens?.refresh;

    if (!refreshToken) {
      throw new Error('No hay refresh token para renovar sesión');
    }

    const response = await fetch(`${getApiUrl()}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await encryptJsonBodyIfNeeded(JSON.stringify({ refreshToken }), { 'Content-Type': 'application/json' })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      await clearAuthSession();
      const error = new Error(payload.error || 'No se pudo renovar la sesión');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const access = payload?.data?.tokens?.access;
    const refresh = payload?.data?.tokens?.refresh;

    if (!access || !refresh) {
      await clearAuthSession();
      throw new Error('Respuesta inválida al renovar sesión');
    }

    const nextSession = {
      ...session,
      tokens: { access, refresh },
      updatedAt: Date.now()
    };

    await setAuthSession(nextSession);
    return nextSession;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function authFetch(path, options = {}) {
  const url = `${getApiUrl()}${path}`;
  const session = await getAuthSession();
  const accessToken = session?.tokens?.access;

  const doRequest = async (token) => {
    const headers = withJsonHeaders(options.headers, options.body);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const encryptedBody = await encryptJsonBodyIfNeeded(options.body, headers);

    return fetch(url, {
      ...options,
      headers,
      body: encryptedBody
    });
  };

  let response = await doRequest(accessToken);

  if (response.status === 423 || response.status === 401) {
    const payload = await response.clone().json().catch(() => ({}));
    if (payload?.code === TRAFFIC_LOCK_CODE || isAccessTokenRequiredPayload(payload)) {
      emitTrafficLockEvent(payload);
    }
  }

  if (response.status === 423) {
    return response;
  }

  if (response.status === 401) {
    const payload = await response.clone().json().catch(() => ({}));
    if (isAccessTokenRequiredPayload(payload)) {
      return response;
    }
  }

  if (response.status !== 401) {
    return response;
  }

  try {
    const refreshedSession = await refreshAuthSession();
    response = await doRequest(refreshedSession.tokens.access);
    if (response.status === 401) {
      const payload = await response.clone().json().catch(() => ({}));
      if (isAccessTokenRequiredPayload(payload)) {
        emitTrafficLockEvent(payload);
      }
    }
  } catch {
    await clearAuthSession();
  }

  return response;
}

export async function restoreUserFromSession() {
  const session = await getAuthSession();
  if (!session?.user || !session?.tokens?.refresh) {
    return null;
  }

  const response = await authFetch('/api/auth/profile', { method: 'GET' });
  if (response.status === 423) {
    return session.user;
  }
  if (!response.ok) {
    await clearAuthSession();
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  const user = payload?.data || session.user;
  const nextSession = {
    ...session,
    user,
    updatedAt: Date.now()
  };

  await setAuthSession(nextSession);
  return user;
}

export async function logoutSession({ allDevices = false } = {}) {
  const session = await getAuthSession();
  const token = session?.tokens?.access;

  try {
    if (token) {
      await fetch(`${getApiUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: await encryptJsonBodyIfNeeded(JSON.stringify({ allDevices }), {
          'Content-Type': 'application/json'
        })
      });
    }
  } finally {
    await clearAuthSession();
  }
}

export async function performTrafficHandshake(lockPayload = null) {
  const session = await getAuthSession();
  const token = session?.tokens?.access;
  if (!token) throw new Error('Sesión inválida para handshake');

  const challenge = String(
    lockPayload?.lock?.challenge
    || lockPayload?.challenge
    || ''
  ).trim();

  if (!challenge) throw new Error('Challenge inválido');

  const proofHex = await sha256Hex(
    `${challenge}|${token}|${navigator.userAgent}|${session?.user?._id || ''}`
  );
  const proof = `hsv1.${toBase64Url(proofHex)}`;

  const response = await authFetch('/api/auth/traffic-handshake', {
    method: 'POST',
    body: JSON.stringify({ challenge, proof })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.error || 'Handshake inválido');
    err.status = response.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}
