const bcrypt = require('bcryptjs');
const { BaseMongoModel, BaseMongoDocument, toObjectId } = require('./base/mongoModel');
const { buildLookupKey, normalizeRole, normalizePermission, protectAcl, revealAcl } = require('../utils/accessControlCrypto');

const parsePositiveIntEnv = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_LOGIN_ATTEMPTS = parsePositiveIntEnv(process.env.MAX_LOGIN_ATTEMPTS, 3);
const LOCK_BASE_MINUTES = parsePositiveIntEnv(process.env.LOGIN_LOCK_BASE_MINUTES, 15);
const LOCK_MAX_MINUTES = parsePositiveIntEnv(process.env.LOGIN_LOCK_MAX_MINUTES, 240);

class User extends BaseMongoModel {
  static collectionName = 'users';
  static sensitiveFields = ['passwordHash', 'email', 'refreshToken', 'twoFactorSecret', 'lastIP'];
  static references = {
    createdBy: { model: () => User, localField: 'createdBy', isArray: false },
    updatedBy: { model: () => User, localField: 'updatedBy', isArray: false }
  };

  static getRoleLookup(role) {
    return buildLookupKey('role', normalizeRole(role));
  }

  static transformOnRead(doc) {
    return revealAcl(doc, 'rol', 'permisos');
  }

  static async preUpdate(update) {
    const next = { ...(update || {}) };
    next.$set = { ...(next.$set || {}) };

    const hasRole = Object.prototype.hasOwnProperty.call(next.$set, 'rol');
    const hasPermisos = Object.prototype.hasOwnProperty.call(next.$set, 'permisos');
    if (!hasRole && !hasPermisos) return next;

    const currentRole = hasRole ? next.$set.rol : 'viewer';
    const currentPerms = hasPermisos ? next.$set.permisos : [];
    const secured = protectAcl({
      role: currentRole,
      permissions: currentPerms,
      recordedAt: new Date()
    });

    if (hasRole) {
      next.$set.rol = secured.role;
      next.$set.rolLookup = secured.roleLookup;
    }
    if (hasPermisos) {
      next.$set.permisos = secured.permissions;
      next.$set.permisosLookup = secured.permissionsLookup;
    }

    next.$set.aclSecurity = {
      ...(next.$set.aclSecurity || {}),
      scheme: 'aclv1',
      securedAt: secured.securedAt,
      recordedAt: secured.recordedAt
    };

    return next;
  }

  static async preSave(payload, instance) {
    if (payload.passwordHash) {
      const incoming = String(payload.passwordHash);
      const shouldHash = !incoming.startsWith('$2a$') && !incoming.startsWith('$2b$') && !incoming.startsWith('$2y$');
      if (shouldHash) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10);
        const salt = await bcrypt.genSalt(Number.isFinite(rounds) && rounds > 0 ? rounds : 10);
        payload.passwordHash = await bcrypt.hash(incoming, salt);
        payload.passwordChangedAt = new Date();
      }
    }

    if (payload.username) payload.username = String(payload.username).trim().toLowerCase();
    if (payload.email) payload.email = String(payload.email).trim().toLowerCase();

    const normalizedRole = normalizeRole(payload.rol || 'viewer');
    const normalizedPerms = (Array.isArray(payload.permisos) ? payload.permisos : [])
      .map((p) => normalizePermission(p))
      .filter(Boolean);
    const secured = protectAcl({
      role: normalizedRole,
      permissions: normalizedPerms,
      recordedAt: payload.createdAt || new Date()
    });

    payload.rol = secured.role;
    payload.permisos = secured.permissions;
    payload.rolLookup = secured.roleLookup;
    payload.permisosLookup = secured.permissionsLookup;
    payload.aclSecurity = {
      ...(payload.aclSecurity || {}),
      scheme: 'aclv1',
      securedAt: secured.securedAt,
      recordedAt: secured.recordedAt
    };

    if (payload.createdBy) payload.createdBy = toObjectId(payload.createdBy);
    if (payload.updatedBy) payload.updatedBy = toObjectId(payload.updatedBy);
  }
}

User.documentPrototype = Object.create(BaseMongoDocument.prototype);

User.documentPrototype.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(String(candidatePassword || ''), this.passwordHash || '');
};

User.documentPrototype.isLocked = function isLocked() {
  return !!(this.lockUntil && new Date(this.lockUntil) > new Date());
};

User.documentPrototype.getLockDurationMs = function getLockDurationMs(attempts) {
  const overflow = Math.max(0, Number(attempts || 0) - MAX_LOGIN_ATTEMPTS);
  const multiplier = Math.pow(2, overflow);
  const lockMinutes = Math.min(LOCK_MAX_MINUTES, LOCK_BASE_MINUTES * multiplier);
  return lockMinutes * 60 * 1000;
};

User.documentPrototype.incrementLoginAttempts = async function incrementLoginAttempts() {
  if (this.lockUntil && new Date(this.lockUntil) < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: '' }
    });
  }

  const nextAttempts = Number(this.loginAttempts || 0) + 1;
  const updates = { $inc: { loginAttempts: 1 } };

  if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
    updates.$set = {
      lockUntil: new Date(Date.now() + this.getLockDurationMs(nextAttempts))
    };
  }

  return this.updateOne(updates);
};

User.documentPrototype.registerFailedLoginAttempt = async function registerFailedLoginAttempt() {
  const now = new Date();

  if (this.lockUntil && new Date(this.lockUntil) < now) {
    this.loginAttempts = 0;
    this.lockUntil = null;
  }

  this.loginAttempts = Number(this.loginAttempts || 0) + 1;

  let lockUntil = null;
  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    lockUntil = new Date(now.getTime() + this.getLockDurationMs(this.loginAttempts));
    this.lockUntil = lockUntil;
  }

  await this.save();

  return {
    attempts: this.loginAttempts,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - this.loginAttempts),
    locked: !!(lockUntil && lockUntil > now),
    lockUntil
  };
};

User.documentPrototype.hasPermission = function hasPermission(permission) {
  const permisos = Array.isArray(this.permisos) ? this.permisos : [];
  const wanted = normalizePermission(permission);
  return permisos.includes('*') || permisos.includes(wanted);
};

module.exports = User;
