const crypto = require('crypto');
const { BaseMongoModel, BaseMongoDocument, toObjectId } = require('./base/mongoModel');
const User = require('./User');

const SESSION_TOKEN_HASH_SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'session-token-hash-secret';
const hashToken = (token = '') => crypto
  .createHmac('sha256', SESSION_TOKEN_HASH_SECRET)
  .update(String(token))
  .digest('hex');
const isTokenHash = (value = '') => /^[a-f0-9]{64}$/i.test(String(value));

class Session extends BaseMongoModel {
  static collectionName = 'sessions';
  static sensitiveFields = ['accessToken', 'refreshToken', 'deviceInfo.ip'];
  static references = {
    userId: { model: () => User, localField: 'userId', isArray: false }
  };

  static async preSave(payload) {
    if (payload.userId) payload.userId = toObjectId(payload.userId);
    // Evita re-hashear tokens ya persistidos al guardar cambios de actividad.
    if (payload.accessToken && !isTokenHash(payload.accessToken)) {
      payload.accessToken = hashToken(payload.accessToken);
    }
    if (payload.refreshToken && !isTokenHash(payload.refreshToken)) {
      payload.refreshToken = hashToken(payload.refreshToken);
    }
    if (!payload.lastActivity) payload.lastActivity = new Date();
    if (payload.isActive === undefined) payload.isActive = true;
  }

  static hashToken(token) {
    return hashToken(token);
  }

  static async cleanupExpired() {
    const now = new Date();
    return this.updateMany(
      {
        $or: [
          { expiresAt: { $lt: now } },
          { refreshExpiresAt: { $lt: now } }
        ]
      },
      { $set: { isActive: false } }
    );
  }

  static getActiveSessions(userId) {
    return this.find({
      userId: toObjectId(userId),
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActivity: -1 });
  }

  static async validateAccessToken(accessToken) {
    const tokenHash = hashToken(accessToken);
    const session = await this.findOne({
      accessToken: tokenHash,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate({ path: 'userId', select: 'username email rol permisos isActive nombre apellido' });

    if (!session) return null;

    // Use updateOne to avoid triggering preSave hooks on populated entities
    await this.updateOne({ _id: session._id }, { $set: { lastActivity: new Date() } });
    session.lastActivity = new Date();

    return session;
  }

  static async validateRefreshToken(refreshToken) {
    const tokenHash = hashToken(refreshToken);
    return this.findOne({
      refreshToken: tokenHash,
      isActive: true,
      refreshExpiresAt: { $gt: new Date() }
    }).populate({ path: 'userId', select: 'username email rol permisos isActive nombre apellido' });
  }

  static revokeAllUserSessions(userId) {
    return this.updateMany({ userId: toObjectId(userId), isActive: true }, { $set: { isActive: false } });
  }

  static revokeSession(sessionId, userId = null) {
    const filter = userId
      ? { _id: toObjectId(sessionId), userId: toObjectId(userId) }
      : { _id: toObjectId(sessionId) };

    return this.updateOne(filter, { $set: { isActive: false } });
  }

  static revokeAllSessions(userId, currentSessionId = null) {
    const filter = currentSessionId
      ? { userId: toObjectId(userId), isActive: true, _id: { $ne: toObjectId(currentSessionId) } }
      : { userId: toObjectId(userId), isActive: true };

    return this.updateMany(filter, { $set: { isActive: false } });
  }
}

Session.documentPrototype = Object.create(BaseMongoDocument.prototype);
Session.documentPrototype.updateActivity = function updateActivity() {
  this.lastActivity = new Date();
  return this.save();
};
Session.documentPrototype.invalidate = function invalidate() {
  this.isActive = false;
  return this.save();
};

module.exports = Session;
