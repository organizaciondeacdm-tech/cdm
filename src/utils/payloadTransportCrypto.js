const crypto = require('crypto');

const ENVELOPE_MARKER = 'acdm-payload-v1';
const ITERATIONS = 150000;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;
const strictEnv = !['development', 'test'].includes(String(process.env.NODE_ENV || '').toLowerCase());
const FALLBACK_SECRET = 'acdm-default-payload-secret-change-me';

const getPrimaryTransportSecret = () => (
  process.env.VITE_AUTH_STORAGE_SECRET ||
  (strictEnv ? '' : FALLBACK_SECRET)
);

const getDecryptCandidateSecrets = () => (
  [
    process.env.VITE_AUTH_STORAGE_SECRET,
    process.env.ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    strictEnv ? '' : FALLBACK_SECRET
  ].map((value) => String(value || '').trim()).filter(Boolean)
);

const deriveKeyWithSecret = (salt, secret) => (
  crypto.pbkdf2Sync(String(secret), salt, ITERATIONS, KEY_LENGTH, 'sha256')
);

const fromBase64 = (value) => Buffer.from(String(value || ''), 'base64');
const toBase64 = (value) => Buffer.from(value).toString('base64');

const isEncryptedEnvelope = (value) => (
  !!value &&
  typeof value === 'object' &&
  value.__enc === ENVELOPE_MARKER &&
  typeof value.iv === 'string' &&
  typeof value.salt === 'string' &&
  typeof value.data === 'string'
);

const decryptPayloadEnvelope = (envelope) => {
  if (!isEncryptedEnvelope(envelope)) {
    throw new Error('Envelope inválido');
  }

  const iv = fromBase64(envelope.iv);
  const salt = fromBase64(envelope.salt);
  const combined = fromBase64(envelope.data);
  if (combined.length <= AUTH_TAG_LENGTH) {
    throw new Error('Payload cifrado inválido');
  }

  const ciphertext = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const secrets = getDecryptCandidateSecrets();
  if (!secrets.length) {
    throw new Error('No hay secretos de transporte configurados para descifrar payload');
  }

  let lastError = null;
  for (const secret of secrets) {
    try {
      const key = deriveKeyWithSecret(salt, secret);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
      return JSON.parse(plain);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No se pudo descifrar payload con los secretos configurados');
};

const encryptPayloadEnvelope = (payload) => {
  const secret = getPrimaryTransportSecret();
  if (!secret && strictEnv) {
    throw new Error('VITE_AUTH_STORAGE_SECRET es requerido para cifrar payload en entorno estricto');
  }
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = deriveKeyWithSecret(salt, secret || FALLBACK_SECRET);

  const serialized = JSON.stringify(payload ?? {});
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    __enc: ENVELOPE_MARKER,
    iv: toBase64(iv),
    salt: toBase64(salt),
    data: toBase64(combined)
  };
};

module.exports = {
  ENVELOPE_MARKER,
  isEncryptedEnvelope,
  decryptPayloadEnvelope,
  encryptPayloadEnvelope
};
