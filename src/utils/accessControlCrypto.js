const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const PREFIX = 'aclv1';

const rawSecret = process.env.ACL_CRYPTO_SECRET || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-change-this-key';
const encKey = crypto.createHash('sha256').update(`enc:${rawSecret}`).digest();
const hmacKey = crypto.createHash('sha256').update(`hmac:${rawSecret}`).digest();

const isEncryptedAclValue = (value) => {
  return typeof value === 'string' && value.startsWith(`${PREFIX}.`);
};

const normalizeRole = (value) => String(value || '').trim().toLowerCase();
const normalizePermission = (value) => String(value || '').trim();

const buildLookupKey = (kind, normalizedValue) => {
  return crypto
    .createHmac('sha256', hmacKey)
    .update(`${kind}:${String(normalizedValue || '')}`)
    .digest('hex');
};

const encryptAclValue = (plainValue, recordedAt = new Date()) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encKey, iv);
  const payload = JSON.stringify({
    value: String(plainValue || ''),
    recordedAt: new Date(recordedAt).toISOString()
  });

  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}.${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

const decryptAclValue = (value) => {
  if (!isEncryptedAclValue(value)) {
    return { value: String(value || ''), recordedAt: null, encrypted: false };
  }

  const [, ivB64, tagB64, payloadB64] = String(value).split('.');
  const decipher = crypto.createDecipheriv(ALGO, encKey, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  const out = Buffer.concat([
    decipher.update(Buffer.from(payloadB64, 'base64')),
    decipher.final()
  ]).toString('utf8');

  const parsed = JSON.parse(out);
  return {
    value: String(parsed?.value || ''),
    recordedAt: parsed?.recordedAt ? new Date(parsed.recordedAt) : null,
    encrypted: true
  };
};

const protectAcl = ({ role, permissions, recordedAt = new Date() }) => {
  const rolePlain = normalizeRole(decryptAclValue(role).value || role);
  const permsRaw = Array.isArray(permissions) ? permissions : [];
  const permsPlain = permsRaw
    .map((p) => normalizePermission(decryptAclValue(p).value || p))
    .filter(Boolean);

  return {
    role: encryptAclValue(rolePlain, recordedAt),
    roleLookup: buildLookupKey('role', rolePlain),
    permissions: permsPlain.map((p) => encryptAclValue(p, recordedAt)),
    permissionsLookup: permsPlain.map((p) => buildLookupKey('perm', p)),
    securedAt: new Date(),
    recordedAt: new Date(recordedAt)
  };
};

const revealAcl = (doc, roleField = 'rol', permissionsField = 'permisos') => {
  if (!doc || typeof doc !== 'object') return doc;

  const roleDecoded = decryptAclValue(doc[roleField]);
  const rawPerms = Array.isArray(doc[permissionsField]) ? doc[permissionsField] : [];
  const decodedPerms = rawPerms.map((p) => decryptAclValue(p).value).filter(Boolean);

  doc[roleField] = normalizeRole(roleDecoded.value);
  doc[permissionsField] = decodedPerms;
  doc.aclSecurity = {
    ...(doc.aclSecurity || {}),
    scheme: PREFIX,
    roleRecordedAt: roleDecoded.recordedAt || doc?.aclSecurity?.roleRecordedAt || null,
    readAt: new Date()
  };

  return doc;
};

module.exports = {
  PREFIX,
  isEncryptedAclValue,
  normalizeRole,
  normalizePermission,
  buildLookupKey,
  encryptAclValue,
  decryptAclValue,
  protectAcl,
  revealAcl
};
