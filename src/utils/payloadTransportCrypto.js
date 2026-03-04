const crypto = require('crypto');

const ENVELOPE_MARKER = 'acdm-payload-v1';
const ITERATIONS = 150000;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

const getSharedSecret = () => (
  process.env.VITE_AUTH_STORAGE_SECRET ||
  process.env.ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'acdm-default-payload-secret-change-me'
);

const deriveKey = (salt) => (
  crypto.pbkdf2Sync(String(getSharedSecret()), salt, ITERATIONS, KEY_LENGTH, 'sha256')
);

const fromBase64 = (value) => Buffer.from(String(value || ''), 'base64');

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
  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

  return JSON.parse(plain);
};

module.exports = {
  ENVELOPE_MARKER,
  isEncryptedEnvelope,
  decryptPayloadEnvelope
};

