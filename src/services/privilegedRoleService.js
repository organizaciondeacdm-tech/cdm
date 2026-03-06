const EnvironmentConfig = require('../models/EnvironmentConfig');
const RolePolicy = require('../models/RolePolicy');
const User = require('../models/User');
const { normalizeRole, buildLookupKey } = require('../utils/accessControlCrypto');

const ADMIN_ROLE_CONFIG_KEY = 'ADMIN_PRIVILEGED_ROLE';
const CACHE_TTL_MS = 60 * 1000;

let cache = {
  role: null,
  expiresAt: 0
};

const hasFreshCache = () => cache.role && cache.expiresAt > Date.now();

const setCache = (role) => {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  cache = {
    role: normalized,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  return normalized;
};

const getRoleFromConfig = async () => {
  const config = await EnvironmentConfig.findOne({
    keyLookup: buildLookupKey('config', ADMIN_ROLE_CONFIG_KEY),
    enabled: true
  }).lean();
  const value = normalizeRole(config?.value || '');
  return value || null;
};

const getRoleFromWildcardUsers = async () => {
  const wildcardLookup = buildLookupKey('perm', '*');
  const user = await User.findOne({
    $or: [
      { permisosLookup: wildcardLookup },
      { permisos: '*' }
    ],
    isActive: { $ne: false }
  }).select('rol').lean();
  return normalizeRole(user?.rol || '') || null;
};

const getRoleFromPolicies = async () => {
  const policies = await RolePolicy.getAllPolicies();
  const privileged = (Array.isArray(policies) ? policies : []).find((policy) => {
    const perms = Array.isArray(policy?.defaultPermissions) ? policy.defaultPermissions : [];
    return perms.includes('*');
  });
  return normalizeRole(privileged?.role || '') || null;
};

const getPrivilegedRole = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh && hasFreshCache()) return cache.role;

  const configuredRole = await getRoleFromConfig();
  if (configuredRole) return setCache(configuredRole);

  const wildcardUserRole = await getRoleFromWildcardUsers();
  if (wildcardUserRole) {
    await EnvironmentConfig.updateOne(
      { keyLookup: buildLookupKey('config', ADMIN_ROLE_CONFIG_KEY) },
      {
        $set: {
          key: ADMIN_ROLE_CONFIG_KEY,
          value: wildcardUserRole,
          enabled: true
        }
      },
      { upsert: true }
    );
    return setCache(wildcardUserRole);
  }

  const policyRole = await getRoleFromPolicies();
  if (policyRole) {
    await EnvironmentConfig.updateOne(
      { keyLookup: buildLookupKey('config', ADMIN_ROLE_CONFIG_KEY) },
      {
        $set: {
          key: ADMIN_ROLE_CONFIG_KEY,
          value: policyRole,
          enabled: true
        }
      },
      { upsert: true }
    );
    return setCache(policyRole);
  }

  cache = { role: null, expiresAt: 0 };
  return null;
};

const isPrivilegedRole = async (role, options = {}) => {
  const privilegedRole = await getPrivilegedRole(options);
  if (!privilegedRole) return false;
  return normalizeRole(role) === privilegedRole;
};

module.exports = {
  ADMIN_ROLE_CONFIG_KEY,
  getPrivilegedRole,
  isPrivilegedRole
};
