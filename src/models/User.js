const bcrypt = require('bcryptjs');
const { BaseMongoModel, BaseMongoDocument, toObjectId } = require('./base/mongoModel');

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

  static async preSave(payload, instance) {
    if (!payload.passwordHash) return;
    const incoming = String(payload.passwordHash);

    const shouldHash = !incoming.startsWith('$2a$') && !incoming.startsWith('$2b$') && !incoming.startsWith('$2y$');
    if (shouldHash) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10);
      const salt = await bcrypt.genSalt(Number.isFinite(rounds) && rounds > 0 ? rounds : 10);
      payload.passwordHash = await bcrypt.hash(incoming, salt);
      payload.passwordChangedAt = new Date();
    }

    if (payload.username) payload.username = String(payload.username).trim().toLowerCase();
    if (payload.email) payload.email = String(payload.email).trim().toLowerCase();

    if (!payload.permisos) payload.permisos = [];
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
  return this.rol === 'admin' || (this.permisos || []).includes(permission);
};

module.exports = User;
