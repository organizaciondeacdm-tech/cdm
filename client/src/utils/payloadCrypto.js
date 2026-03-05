import { getRuntimeEnvironmentValue } from './runtimeEnv.js';

const ENVELOPE_MARKER = 'acdm-payload-v1';
const ITERATIONS = 150000;
const KEY_LENGTH = 256;
const FALLBACK_SECRET = 'acdm-default-payload-secret-change-me';
const encoder = new TextEncoder();

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

let sharedSecretPromise = null;
const getSharedSecret = async () => {
  if (!sharedSecretPromise) {
    sharedSecretPromise = getRuntimeEnvironmentValue('VITE_AUTH_STORAGE_SECRET', FALLBACK_SECRET);
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
    ['encrypt']
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

  const encrypted = await encryptPayloadObject(payload);
  return JSON.stringify(encrypted);
}

