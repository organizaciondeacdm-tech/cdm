const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const PREFIX = 'aclv1';

const strictEnv = !['development', 'test'].includes(String(process.env.NODE_ENV || '').toLowerCase());
const rawSecret = process.env.ACL_CRYPTO_SECRET || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
if (!rawSecret && strictEnv) {
  throw new Error('ACL_CRYPTO_SECRET o ENCRYPTION_KEY/JWT_SECRET es requerido en entorno estricto');
}
const resolvedSecret = rawSecret || 'dev-only-acl-secret';
const encKey = crypto.createHash('sha256').update(`enc:${resolvedSecret}`).digest();
const hmacKey = crypto.createHash('sha256').update(`hmac:${resolvedSecret}`).digest();
const PUBLIC_PERM_PREFIX = 'permv1';
const PUBLIC_ROLE_PREFIX = 'rolev1';
const PERM_ROTATION_MINUTES = Math.max(1, Number.parseInt(process.env.PERM_OBFUSCATION_ROTATION_MINUTES || '60', 10) || 60);

const isEncryptedAclValue = (value) => {
  return typeof value === 'string' && value.startsWith(`${PREFIX}.`);
};

const normalizeRole = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'desarollador') return 'desarrollador';
  return normalized;
};
const normalizePermission = (value) => String(value || '').trim();
const getRotationBucket = (date = new Date()) => {
  const at = date instanceof Date ? date : new Date(date);
  const windowMs = PERM_ROTATION_MINUTES * 60 * 1000;
  return Math.floor(at.getTime() / windowMs);
};

const buildLookupKey = (kind, normalizedValue) => {
  return crypto
    .createHmac('sha256', hmacKey)
    .update(`${kind}:${String(normalizedValue || '')}`)
    .digest('hex');
};

const buildPublicPermissionToken = (permission, bucket = getRotationBucket()) => {
  const normalized = normalizePermission(permission);
  if (!normalized) return '';
  const digest = crypto
    .createHmac('sha256', hmacKey)
    .update(`perm-public:${bucket}:${normalized}`)
    .digest('hex')
    .slice(0, 32);
  return `${PUBLIC_PERM_PREFIX}.${bucket}.${digest}`;
};

const buildPublicRoleToken = (role, bucket = getRotationBucket()) => {
  const normalized = normalizeRole(role);
  if (!normalized) return '';
  const digest = crypto
    .createHmac('sha256', hmacKey)
    .update(`role-public:${bucket}:${normalized}`)
    .digest('hex')
    .slice(0, 32);
  return `${PUBLIC_ROLE_PREFIX}.${bucket}.${digest}`;
};

const isPublicPermissionToken = (value) => (
  typeof value === 'string' &&
  value.startsWith(`${PUBLIC_PERM_PREFIX}.`) &&
  value.split('.').length === 3
);

const isPublicRoleToken = (value) => (
  typeof value === 'string' &&
  value.startsWith(`${PUBLIC_ROLE_PREFIX}.`) &&
  value.split('.').length === 3
);

const obfuscatePermissionForTransport = (permission, at = new Date()) => {
  return buildPublicPermissionToken(permission, getRotationBucket(at));
};

const obfuscateRoleForTransport = (role, at = new Date()) => {
  return buildPublicRoleToken(role, getRotationBucket(at));
};

const resolvePermissionFromTransport = (incomingValue, catalog = [], at = new Date()) => {
  const value = String(incomingValue || '').trim();
  if (!value) return null;

  const catalogList = Array.isArray(catalog)
    ? catalog.map((perm) => normalizePermission(perm)).filter(Boolean)
    : [];
  const catalogSet = new Set(catalogList);

  if (catalogSet.has(value)) {
    return value;
  }

  if (!isPublicPermissionToken(value)) {
    return null;
  }

  const parsedBucket = Number.parseInt(value.split('.')[1], 10);
  const currentBucket = getRotationBucket(at);
  const candidateBuckets = [parsedBucket, currentBucket, currentBucket - 1, currentBucket + 1]
    .filter((bucket, idx, arr) => Number.isFinite(bucket) && arr.indexOf(bucket) === idx);

  for (const perm of catalogList) {
    for (const bucket of candidateBuckets) {
      if (buildPublicPermissionToken(perm, bucket) === value) {
        return perm;
      }
    }
  }

  return null;
};

const resolveRoleFromTransport = (incomingValue, catalog = [], at = new Date()) => {
  const value = String(incomingValue || '').trim();
  if (!value) return null;

  const catalogList = Array.isArray(catalog)
    ? catalog.map((role) => normalizeRole(role)).filter(Boolean)
    : [];
  const catalogSet = new Set(catalogList);

  if (catalogSet.has(normalizeRole(value))) {
    return normalizeRole(value);
  }

  if (!isPublicRoleToken(value)) {
    return null;
  }

  const parsedBucket = Number.parseInt(value.split('.')[1], 10);
  const currentBucket = getRotationBucket(at);
  const candidateBuckets = [parsedBucket, currentBucket, currentBucket - 1, currentBucket + 1]
    .filter((bucket, idx, arr) => Number.isFinite(bucket) && arr.indexOf(bucket) === idx);

  for (const role of catalogList) {
    for (const bucket of candidateBuckets) {
      if (buildPublicRoleToken(role, bucket) === value) {
        return role;
      }
    }
  }

  return null;
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
  PUBLIC_PERM_PREFIX,
  PUBLIC_ROLE_PREFIX,
  isEncryptedAclValue,
  normalizeRole,
  normalizePermission,
  getRotationBucket,
  buildLookupKey,
  isPublicPermissionToken,
  isPublicRoleToken,
  obfuscateRoleForTransport,
  obfuscatePermissionForTransport,
  resolveRoleFromTransport,
  resolvePermissionFromTransport,
  encryptAclValue,
  decryptAclValue,
  protectAcl,
  revealAcl
};
