const { ObjectId } = require('mongodb');

const DEFAULT_SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'twoFactorSecret',
  'keyValue',
  'dni',
  'cuil',
  'email',
  'telefono',
  'ip',
  'numeroAfiliado',
  'authTag',
  'iv'
]);

const isObjectId = (value) => value instanceof ObjectId;

const isPlainObject = (value) => (
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !isObjectId(value)
);

const keepEdgesMask = (value, visibleStart = 2, visibleEnd = 2) => {
  const str = String(value ?? '');
  if (!str) return '';
  if (str.length <= visibleStart + visibleEnd) return '*'.repeat(str.length);
  return `${str.slice(0, visibleStart)}${'*'.repeat(str.length - (visibleStart + visibleEnd))}${str.slice(-visibleEnd)}`;
};

const obfuscateEmail = (value) => {
  const [local = '', domain = ''] = String(value ?? '').split('@');
  if (!domain) return keepEdgesMask(local, 1, 1);
  return `${keepEdgesMask(local, 1, 1)}@${domain}`;
};

const obfuscateIp = (value) => {
  const ip = String(value ?? '');
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  }
  return keepEdgesMask(ip, 2, 0);
};

const obfuscateByKey = (key, value) => {
  if (value == null) return value;
  const normalizedKey = String(key || '').toLowerCase();
  const raw = String(value);

  if (normalizedKey.includes('email')) return obfuscateEmail(raw);
  if (normalizedKey.includes('ip')) return obfuscateIp(raw);
  if (normalizedKey.includes('telefono') || normalizedKey.includes('phone')) return keepEdgesMask(raw, 2, 2);
  if (normalizedKey.includes('dni') || normalizedKey.includes('cuil') || normalizedKey.includes('document')) return keepEdgesMask(raw, 1, 2);
  if (normalizedKey.includes('token') || normalizedKey.includes('secret') || normalizedKey.includes('password') || normalizedKey.includes('key')) return keepEdgesMask(raw, 2, 2);
  return keepEdgesMask(raw, 2, 2);
};

const obfuscateDocument = (input, options = {}, seen = new WeakSet(), parentPath = '') => {
  const sensitive = new Set([...(options.sensitiveFields || []), ...DEFAULT_SENSITIVE_FIELDS]);

  if (input == null) return input;
  if (input instanceof Date || isObjectId(input)) return input;

  if (Array.isArray(input)) {
    return input.map((item) => obfuscateDocument(item, options, seen, parentPath));
  }

  if (!isPlainObject(input)) {
    return input;
  }

  if (seen.has(input)) return input;
  seen.add(input);

  Object.keys(input).forEach((key) => {
    const value = input[key];
    if (value == null) return;

    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    const normalizedKey = key.toLowerCase();
    const normalizedPath = currentPath.toLowerCase();
    const isSensitiveField = (
      sensitive.has(key) ||
      sensitive.has(normalizedKey) ||
      sensitive.has(currentPath) ||
      sensitive.has(normalizedPath)
    );

    if (isSensitiveField && typeof value !== 'object') {
      input[key] = obfuscateByKey(key, value);
      return;
    }

    input[key] = obfuscateDocument(value, options, seen, currentPath);
  });

  return input;
};

module.exports = {
  DEFAULT_SENSITIVE_FIELDS,
  obfuscateDocument,
  obfuscateByKey,
  obfuscateEmail,
  obfuscateIp
};
