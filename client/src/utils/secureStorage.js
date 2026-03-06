import { getRuntimeEnvironmentValue } from './runtimeEnv.js';

const STORAGE_NAMESPACE = 'acdm.secure.v1';
const ITERATIONS = 150000;
const FALLBACK_PASSPHRASE = 'acdm-default-storage-secret-change-me';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const fromBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const ensureCrypto = () => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto no está disponible para almacenamiento seguro');
  }
};

let runtimePassphrasePromise = null;
let runtimePassphraseResolved = null;
const getPassphrase = async () => {
  if (runtimePassphraseResolved && runtimePassphraseResolved !== FALLBACK_PASSPHRASE) {
    return runtimePassphraseResolved;
  }
  if (!runtimePassphrasePromise) {
    runtimePassphrasePromise = getRuntimeEnvironmentValue('VITE_AUTH_STORAGE_SECRET', null)
      .then((value) => {
        runtimePassphraseResolved = value || FALLBACK_PASSPHRASE;
        if (!value) runtimePassphrasePromise = null;
        return runtimePassphraseResolved;
      });
  }
  return runtimePassphrasePromise;
};

const deriveKey = async (salt) => {
  const secret = await getPassphrase();
  const passphrase = `${secret}|${window.location.origin}|${navigator.userAgent}`;
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
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
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
};

export async function setSecureItem(key, value) {
  ensureCrypto();

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKey(salt);
  const payload = encoder.encode(JSON.stringify(value));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    payload
  );

  const envelope = {
    v: 1,
    namespace: STORAGE_NAMESPACE,
    iv: toBase64(iv),
    salt: toBase64(salt),
    data: toBase64(new Uint8Array(encrypted))
  };

  localStorage.setItem(key, JSON.stringify(envelope));
}

export async function getSecureItem(key) {
  ensureCrypto();

  const raw = localStorage.getItem(key);
  if (!raw) return null;

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return null;
  }

  if (!envelope?.iv || !envelope?.salt || !envelope?.data) {
    localStorage.removeItem(key);
    return null;
  }

  try {
    const iv = fromBase64(envelope.iv);
    const salt = fromBase64(envelope.salt);
    const cipherBytes = fromBase64(envelope.data);
    const derivedKey = await deriveKey(salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      cipherBytes
    );

    return JSON.parse(decoder.decode(decrypted));
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function removeSecureItem(key) {
  localStorage.removeItem(key);
}
