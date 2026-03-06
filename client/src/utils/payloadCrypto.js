import { getApiUrl } from './apiConfig.js';

const ENVELOPE_MARKER = 'acdm-payload-v1';
export const PAYLOAD_INTERCEPT_HEADER = 'X-Payload-Intercept';
const FIELD_ALIAS_SCHEME = 'fid1';
const FIELD_ALIAS_META_KEY = '__acdmFieldAliasV1';
const FIELD_ALIAS_DATA_KEY = '__acdmPayloadV1';
const ITERATIONS = 150000;
const KEY_LENGTH = 256;
const FALLBACK_SECRET = 'acdm-default-payload-secret-change-me';
const SECURE_ENDPOINT_REQUIRED_CODE = 'SECURE_ENDPOINT_REQUIRED';
const PUBLIC_CHANNEL_ENDPOINT = '/api/security/bootstrap';
const RUNTIME_ENV_ENDPOINT = '/api/runtime-environment';
const PUBLIC_CHANNEL_BYPASS = new Set([PUBLIC_CHANNEL_ENDPOINT, '/api/health', '/api/test']);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let publicChannelState = null;
let publicChannelQueue = Promise.resolve();

const toBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const ensureCrypto = () => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('WebCrypto no disponible para cifrar payload');
  }
};

const randomToken = (size = 8) => {
  const bytes = window.crypto.getRandomValues(new Uint8Array(size));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const obfuscateTopLevelFieldNames = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  if (payload[FIELD_ALIAS_META_KEY] || payload[FIELD_ALIAS_DATA_KEY]) {
    return payload;
  }

  const entries = Object.entries(payload);
  if (!entries.length) return payload;

  const map = {};
  const data = {};
  entries.forEach(([key, value], index) => {
    const alias = `f_${index}_${randomToken(6)}`;
    map[alias] = key;
    data[alias] = value;
  });

  return {
    [FIELD_ALIAS_META_KEY]: {
      scheme: FIELD_ALIAS_SCHEME,
      map
    },
    [FIELD_ALIAS_DATA_KEY]: data
  };
};

const fromBase64 = (value) => {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

let sharedSecretPromise = null;
let sharedSecretResolved = null;

const normalizePublicChannel = (value) => {
  if (!value || typeof value !== 'object') return null;
  const channelId = String(value.channelId || '').trim();
  const serverNonce = String(value.serverNonce || '').trim();
  const clientToken = String(value.clientToken || '').trim();
  if (!channelId || !serverNonce || !clientToken) return null;
  return {
    version: String(value.version || 'pubchan1'),
    channelId,
    serverNonce,
    clientToken,
    issuedAt: value.issuedAt || new Date().toISOString(),
    expiresAt: value.expiresAt || null,
    seq: Number(value.seq || 0) || 0
  };
};

const setPublicChannel = (value) => {
  const normalized = normalizePublicChannel(value);
  if (!normalized) return null;
  publicChannelState = normalized;
  return publicChannelState;
};

const sha256Hex = async (value = '') => {
  const input = encoder.encode(String(value || ''));
  const digest = await window.crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const parsePathFromUrl = (url = '') => {
  try {
    if (typeof window !== 'undefined') {
      return new URL(String(url || ''), window.location.origin).pathname;
    }
    return new URL(String(url || ''), getApiUrl()).pathname;
  } catch {
    return String(url || '').split('?')[0];
  }
};

const isChannelValid = () =>
  publicChannelState
  && publicChannelState.expiresAt
  && new Date(publicChannelState.expiresAt).getTime() > Date.now();

// Obtiene o refresca el canal SIN encolar (para usar dentro de la queue)
const ensurePublicChannelInner = async () => {
  if (isChannelValid()) return publicChannelState;
  const response = await fetch(`${getApiUrl()}${PUBLIC_CHANNEL_ENDPOINT}`);
  const payload = await response.json().catch(() => ({}));
  const channel = payload?.data?.publicChannel || payload?.publicChannel;
  return setPublicChannel(channel);
};

const ensurePublicChannel = async () => {
  if (isChannelValid()) return publicChannelState;

  return (publicChannelQueue = publicChannelQueue.then(async () => {
    return ensurePublicChannelInner();
  }).catch(() => publicChannelState));
};

const reservePublicEndpointHeaders = async ({ url, method = 'GET', body }) => {
  ensureCrypto();
  const path = parsePathFromUrl(url);
  if (PUBLIC_CHANNEL_BYPASS.has(path)) return {};

  return (publicChannelQueue = publicChannelQueue.then(async () => {
    // Llamar a la versión interna (sin re-encolar) para evitar deadlock
    const channel = await ensurePublicChannelInner();
    if (!channel) return {};

    const nextSeq = Number(channel.seq || 0) + 1;
    const ts = Date.now();
    const nonce = randomToken(16);
    const bodyHash = await sha256Hex(typeof body === 'string' ? body : JSON.stringify(body ?? ''));
    const key = await sha256Hex(`${channel.channelId}|${channel.serverNonce}|${channel.clientToken}`);
    const methodUpper = String(method || 'GET').toUpperCase();
    const aliasHash = await sha256Hex(`${key}|alias|${methodUpper}|${path}|${nextSeq}|${nonce}|${ts}`);
    const signatureHash = await sha256Hex(`${key}|sig|${methodUpper}|${path}|${nextSeq}|${nonce}|${ts}|${bodyHash}`);

    publicChannelState = { ...channel, seq: nextSeq };

    return {
      'X-Endpoint-Channel': channel.channelId,
      'X-Endpoint-Alias': `epa1.${aliasHash.slice(0, 48)}`,
      'X-Endpoint-Signature': `eps1.${signatureHash.slice(0, 64)}`,
      'X-Endpoint-Seq': String(nextSeq),
      'X-Endpoint-Nonce': nonce,
      'X-Endpoint-Ts': String(ts)
    };
  }).catch(() => ({})));
};

export async function securePublicFetch(url, options = {}) {
  const method = String(options?.method || 'GET').toUpperCase();
  const headers = { ...(options?.headers || {}) };
  const secureHeaders = await reservePublicEndpointHeaders({
    url,
    method,
    body: options?.body
  });
  Object.assign(headers, secureHeaders);

  let response = await fetch(url, {
    ...options,
    method,
    headers
  });

  if (response.status === 428) {
    const payload = await readJsonPayload(response.clone(), {});
    if (String(payload?.code || '').toUpperCase() === SECURE_ENDPOINT_REQUIRED_CODE) {
      const nextChannel = payload?.publicChannel || payload?.data?.publicChannel;
      if (setPublicChannel(nextChannel)) {
        const retryHeaders = {
          ...(options?.headers || {}),
          ...(await reservePublicEndpointHeaders({ url, method, body: options?.body }))
        };
        response = await fetch(url, {
          ...options,
          method,
          headers: retryHeaders
        });
      }
    }
  }

  return response;
}

const getSharedSecret = async () => {
  // Si ya tenemos un secreto real (no fallback), usarlo directamente
  if (sharedSecretResolved && sharedSecretResolved !== FALLBACK_SECRET) {
    return sharedSecretResolved;
  }
  if (!sharedSecretPromise) {
    sharedSecretPromise = (async () => {
      try {
        const response = await securePublicFetch(`${getApiUrl()}${RUNTIME_ENV_ENDPOINT}`);
        if (!response.ok) return null;
        const payload = await readJsonPayload(response, {});
        return payload?.data?.VITE_AUTH_STORAGE_SECRET || null;
      } catch {
        return null;
      }
    })()
      .then((value) => {
        sharedSecretResolved = value || FALLBACK_SECRET;
        if (!value) sharedSecretPromise = null;
        return sharedSecretResolved;
      });
  }
  return sharedSecretPromise;
};

const deriveKey = async (salt) => {
  const shared = await getSharedSecret();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(String(shared || FALLBACK_SECRET)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
};

const isProbablyJsonContent = (headers = {}) => {
  const key = Object.keys(headers).find((k) => String(k).toLowerCase() === 'content-type');
  const value = key ? String(headers[key] || '').toLowerCase() : '';
  return value.includes('application/json');
};

export async function encryptPayloadObject(payload) {
  ensureCrypto();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(salt);
  const plainBytes = encoder.encode(JSON.stringify(payload ?? {}));
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes);
  return {
    __enc: ENVELOPE_MARKER,
    iv: toBase64(iv),
    salt: toBase64(salt),
    data: toBase64(new Uint8Array(encrypted))
  };
}

export const isEncryptedPayloadEnvelope = (value) => (
  !!value &&
  typeof value === 'object' &&
  value.__enc === ENVELOPE_MARKER &&
  typeof value.iv === 'string' &&
  typeof value.salt === 'string' &&
  typeof value.data === 'string'
);

export async function decryptPayloadObject(envelope) {
  ensureCrypto();
  if (!isEncryptedPayloadEnvelope(envelope)) {
    throw new Error('Envelope de payload invalido');
  }

  const iv = fromBase64(envelope.iv);
  const salt = fromBase64(envelope.salt);
  const combined = fromBase64(envelope.data);
  if (combined.length <= 16) {
    throw new Error('Payload cifrado invalido');
  }

  const key = await deriveKey(salt);
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128
    },
    key,
    combined
  );

  return JSON.parse(decoder.decode(decrypted));
}

export function withPayloadIntercept(headers = {}) {
  return {
    ...headers,
    [PAYLOAD_INTERCEPT_HEADER]: '1'
  };
}

export async function readJsonPayload(response, fallback = {}) {
  const parsed = await response.json().catch(() => fallback);
  if (!isEncryptedPayloadEnvelope(parsed)) {
    return parsed;
  }

  try {
    return await decryptPayloadObject(parsed);
  } catch {
    return fallback;
  }
}

export async function encryptJsonBodyIfNeeded(body, headers = {}) {
  if (body == null) return body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (isFormData) return body;
  if (!isProbablyJsonContent(headers)) return body;

  let payload;
  if (typeof body === 'string') {
    try {
      payload = JSON.parse(body);
    } catch {
      return body;
    }
  } else if (typeof body === 'object') {
    payload = body;
  } else {
    return body;
  }

  const aliasedPayload = obfuscateTopLevelFieldNames(payload);
  const encrypted = await encryptPayloadObject(aliasedPayload);
  return JSON.stringify(encrypted);
}

// Pre-cargar el secreto compartido al inicio del módulo para que esté
// disponible cuando llegue el primer login, sin competir con otras requests.
if (typeof window !== 'undefined' && window.crypto?.subtle) {
  getSharedSecret().catch(() => {});
}
