import { getApiUrl } from './apiConfig.js';
import { getSecureItem, removeSecureItem, setSecureItem } from './secureStorage.js';
import { encryptJsonBodyIfNeeded, readJsonPayload, securePublicFetch, withPayloadIntercept } from './payloadCrypto.js';

const AUTH_SESSION_KEY = 'acdm_auth_session';
const TRAFFIC_LOCK_CODE = 'TRAFFIC_LOCK_REQUIRED';
const ACCESS_TOKEN_REQUIRED_CODE = 'ACCESS_TOKEN_REQUIRED';
const SECURE_ENDPOINT_REQUIRED_CODE = 'SECURE_ENDPOINT_REQUIRED';
const LOGIN_LOG_PREFIX = '[ACDM][LOGIN][SESSION]';

let authCache = null;
let refreshPromise = null;
let secureMetaQueue = Promise.resolve();

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

const randomBase64Url = (size = 18) => {
  const bytes = window.crypto.getRandomValues(new Uint8Array(size));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const normalizeSecureChannel = (value) => {
  if (!value || typeof value !== 'object') return null;
  const sessionId = String(value.sessionId || '').trim();
  const serverNonce = String(value.serverNonce || '').trim();
  const clientToken = String(value.clientToken || '').trim();
  if (!sessionId || !serverNonce || !clientToken) return null;
  return {
    version: String(value.version || 'secchan1'),
    sessionId,
    serverNonce,
    clientToken,
    issuedAt: value.issuedAt || new Date().toISOString(),
    expiresAt: value.expiresAt || null,
    seq: Number(value.seq || 0) || 0
  };
};

const withSecureChannel = async (session, secureChannel) => {
  const normalized = normalizeSecureChannel(secureChannel);
  if (!session || !normalized) return session;
  const next = {
    ...session,
    secureChannel: {
      ...(session.secureChannel || {}),
      ...normalized
    },
    updatedAt: Date.now()
  };
  await setAuthSession(next);
  return next;
};

const digestRequestBody = async (body) => {
  if (body == null) return sha256Hex('');
  if (typeof body === 'string') return sha256Hex(body);
  if (typeof body === 'object') {
    try {
      return sha256Hex(JSON.stringify(body));
    } catch {
      return sha256Hex('');
    }
  }
  return sha256Hex(String(body));
};

const reserveSecureRequestHeaders = async ({ session, path, method, body }) => {
  if (!session?.tokens?.access || !session?.secureChannel?.sessionId || !session?.secureChannel?.serverNonce) {
    return { headers: {}, session };
  }

  return (secureMetaQueue = secureMetaQueue.then(async () => {
    const liveSession = await getAuthSession() || session;
    const secureChannel = normalizeSecureChannel(liveSession?.secureChannel);
    if (!secureChannel || !liveSession?.tokens?.access) {
      return { headers: {}, session: liveSession || session };
    }

    const nextSeq = Number(secureChannel.seq || 0) + 1;
    const ts = Date.now();
    const nonce = randomBase64Url(16);
    const bodyHash = await digestRequestBody(body);
    const channelKey = await sha256Hex(
      `${liveSession.tokens.access}|${secureChannel.serverNonce}|${secureChannel.sessionId}|${secureChannel.clientToken}`
    );
    const upperMethod = String(method || 'GET').toUpperCase();
    const aliasHash = await sha256Hex(
      `${channelKey}|alias|${upperMethod}|${path}|${nextSeq}|${nonce}|${ts}`
    );
    const signatureHash = await sha256Hex(
      `${channelKey}|sig|${upperMethod}|${path}|${nextSeq}|${nonce}|${ts}|${bodyHash}`
    );

    const nextSession = {
      ...liveSession,
      secureChannel: {
        ...secureChannel,
        seq: nextSeq
      },
      updatedAt: Date.now()
    };
    await setAuthSession(nextSession);

    return {
      session: nextSession,
      headers: {
        'X-Endpoint-Alias': `epa1.${aliasHash.slice(0, 48)}`,
        'X-Endpoint-Signature': `eps1.${signatureHash.slice(0, 64)}`,
        'X-Endpoint-Seq': String(nextSeq),
        'X-Endpoint-Nonce': nonce,
        'X-Endpoint-Ts': String(ts)
      }
    };
  }).catch(() => ({ headers: {}, session })));
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
  return withPayloadIntercept(finalHeaders);
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
  const loginUrl = `${getApiUrl()}/api/auth/login`;
  const loginHeaders = withPayloadIntercept({ 'Content-Type': 'application/json' });

  try {
    console.log(`${LOGIN_LOG_PREFIX} preparing login request`, {
      url: loginUrl,
      username: String(username || '').trim(),
      hasPassword: Boolean(password)
    });

    const loginBody = await encryptJsonBodyIfNeeded(JSON.stringify({ username, password }), loginHeaders);
    const response = await securePublicFetch(loginUrl, {
      method: 'POST',
      headers: loginHeaders,
      body: loginBody
    });

    console.log(`${LOGIN_LOG_PREFIX} response received`, {
      status: response.status,
      ok: response.ok
    });

    const payload = await readJsonPayload(response, {});
    if (!response.ok) {
      const error = new Error(payload.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      console.error(`${LOGIN_LOG_PREFIX} non-ok response`, {
        status: error.status,
        message: error.message,
        payload
      });
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
      secureChannel: normalizeSecureChannel(payload?.data?.secureChannel),
      updatedAt: Date.now()
    };

    await setAuthSession(session);
    console.log(`${LOGIN_LOG_PREFIX} session established`, {
      username: session?.user?.username || String(username || '').trim(),
      hasSecureChannel: Boolean(session?.secureChannel?.sessionId)
    });
    return session;
  } catch (error) {
    const message = String(error?.message || '');
    const isCryptoUnavailable = /WebCrypto no disponible/i.test(message);
    if (isCryptoUnavailable) {
      error.message = 'No se pudo iniciar sesión porque WebCrypto no está disponible. Abrí la app en HTTPS o en http://localhost.';
    }
    console.error(`${LOGIN_LOG_PREFIX} login request failed`, {
      status: error?.status,
      message: error?.message || 'error desconocido',
      payload: error?.payload || null
    });
    throw error;
  }
}

async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = await getAuthSession();
    const refreshToken = session?.tokens?.refresh;

    if (!refreshToken) {
      throw new Error('No hay refresh token para renovar sesión');
    }

    const response = await securePublicFetch(`${getApiUrl()}/api/auth/refresh-token`, {
      method: 'POST',
      headers: withPayloadIntercept({ 'Content-Type': 'application/json' }),
      body: await encryptJsonBodyIfNeeded(
        JSON.stringify({ refreshToken }),
        withPayloadIntercept({ 'Content-Type': 'application/json' })
      )
    });

    const payload = await readJsonPayload(response, {});

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
      secureChannel: normalizeSecureChannel(payload?.data?.secureChannel) || session?.secureChannel || null,
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
    const secure = await reserveSecureRequestHeaders({
      session: await getAuthSession(),
      path,
      method: options.method || 'GET',
      body: options.body
    });
    Object.assign(headers, secure.headers || {});
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

  if (response.status === 428) {
    const payload = await readJsonPayload(response.clone(), {});
    if (String(payload?.code || '').toUpperCase() === SECURE_ENDPOINT_REQUIRED_CODE) {
      const secureChannel = payload?.secureChannel;
      const sessionForUpdate = await getAuthSession();
      if (sessionForUpdate && secureChannel) {
        await withSecureChannel(sessionForUpdate, secureChannel);
        response = await doRequest(sessionForUpdate?.tokens?.access || accessToken);
      }
    }
  }

  if (response.status === 423 || response.status === 401) {
    const payload = await readJsonPayload(response.clone(), {});
    if (payload?.code === TRAFFIC_LOCK_CODE || isAccessTokenRequiredPayload(payload)) {
      emitTrafficLockEvent(payload);
    }
  }

  if (response.status === 423) {
    return response;
  }

  if (response.status === 401) {
    const payload = await readJsonPayload(response.clone(), {});
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
      const payload = await readJsonPayload(response.clone(), {});
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

  const payload = await readJsonPayload(response, {});
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
        headers: withPayloadIntercept({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }),
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
  const payload = await readJsonPayload(response, {});
  if (!response.ok) {
    const err = new Error(payload?.error || 'Handshake inválido');
    err.status = response.status;
    err.payload = payload;
    throw err;
  }
  if (payload?.data?.secureChannel) {
    const sessionNow = await getAuthSession();
    if (sessionNow) {
      await withSecureChannel(sessionNow, payload.data.secureChannel);
    }
  }
  return payload;
}
