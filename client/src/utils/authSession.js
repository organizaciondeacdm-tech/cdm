import { getApiUrl } from './apiConfig.js';
import { getSecureItem, removeSecureItem, setSecureItem } from './secureStorage.js';

const AUTH_SESSION_KEY = 'acdm_auth_session';

let authCache = null;
let refreshPromise = null;

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
  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
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
      body: JSON.stringify({ refreshToken })
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

    return fetch(url, {
      ...options,
      headers
    });
  };

  let response = await doRequest(accessToken);

  if (response.status !== 401) {
    return response;
  }

  try {
    const refreshedSession = await refreshAuthSession();
    response = await doRequest(refreshedSession.tokens.access);
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
        body: JSON.stringify({ allDevices })
      });
    }
  } finally {
    await clearAuthSession();
  }
}
