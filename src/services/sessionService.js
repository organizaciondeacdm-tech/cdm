const Session = require('../models/Session');
const crypto = require('crypto');

const SECURE_CHANNEL_TTL_MINUTES = Math.max(5, Number.parseInt(process.env.SECURE_CHANNEL_TTL_MINUTES || '120', 10) || 120);
const SECURE_CHANNEL_VERSION = 'secchan1';

const sha256Hex = (value = '') => crypto.createHash('sha256').update(String(value)).digest('hex');
const toBase64Url = (buf) => Buffer.from(buf).toString('base64url');

const buildSecureChannelState = (deviceInfo = {}, previous = null) => {
  const now = Date.now();
  const expiresAt = new Date(now + (SECURE_CHANNEL_TTL_MINUTES * 60 * 1000));
  const recentNonces = Array.isArray(previous?.recentNonces) ? previous.recentNonces.slice(0, 64) : [];

  return {
    version: SECURE_CHANNEL_VERSION,
    serverNonce: toBase64Url(crypto.randomBytes(24)),
    clientToken: toBase64Url(crypto.randomBytes(24)),
    issuedAt: new Date(now),
    expiresAt,
    seq: 0,
    recentNonces,
    uaHash: sha256Hex(deviceInfo?.userAgent || ''),
    ipHash: sha256Hex(deviceInfo?.ip || '')
  };
};

const toPublicSecureChannel = (session = {}) => {
  const secure = session?.secureChannel || {};
  return {
    version: secure.version || SECURE_CHANNEL_VERSION,
    sessionId: String(session?._id || ''),
    serverNonce: String(secure.serverNonce || ''),
    clientToken: String(secure.clientToken || ''),
    issuedAt: secure.issuedAt || new Date(),
    expiresAt: secure.expiresAt || new Date(Date.now() + (SECURE_CHANNEL_TTL_MINUTES * 60 * 1000)),
    seq: Number(secure.seq || 0) || 0
  };
};

class SessionService {
  /**
   * Crear una nueva sesión
   */
  static async createSession(user, accessToken, refreshToken, deviceInfo = {}) {
    try {
      // Calcular fechas de expiración
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (parseInt(process.env.JWT_EXPIRE_MINUTES || 1440) * 60 * 1000)); // 24 horas por defecto
      const refreshExpiresAt = new Date(now.getTime() + (parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS || 7) * 24 * 60 * 60 * 1000)); // 7 días por defecto

      const session = new Session({
        userId: user._id,
        username: user.username,
        accessToken,
        refreshToken,
        deviceInfo: {
          userAgent: deviceInfo.userAgent || 'Unknown',
          ip: deviceInfo.ip || 'Unknown',
          platform: deviceInfo.platform || 'Unknown',
          browser: deviceInfo.browser || 'Unknown',
          os: deviceInfo.os || 'Unknown'
        },
        expiresAt,
        refreshExpiresAt,
        secureChannel: buildSecureChannelState(deviceInfo)
      });

      await session.save();
      console.log(`Sesión creada para usuario: ${user.username}`);
      return session;
    } catch (error) {
      console.error('Error creando sesión:', error);
      throw error;
    }
  }

  /**
   * Validar token de acceso y obtener sesión
   */
  static async validateAccessToken(accessToken) {
    return Session.validateAccessToken(accessToken);
  }

  /**
   * Validar token de refresh
   */
  static async validateRefreshToken(refreshToken) {
    return Session.validateRefreshToken(refreshToken);
  }

  /**
   * Invalidar sesión específica
   */
  static async invalidateSession(sessionId) {
    try {
      const result = await Session.revokeSession(sessionId);
      console.log(`Sesión ${sessionId} invalidada`);
      return Number(result?.matchedCount || 0) > 0;
    } catch (error) {
      console.error('Error invalidando sesión:', error);
      throw error;
    }
  }

  /**
   * Invalidar todas las sesiones de un usuario
   */
  static async invalidateAllUserSessions(userId) {
    try {
      const result = await Session.revokeAllUserSessions(userId);
      console.log(`Todas las sesiones del usuario ${userId} han sido invalidadas`);
      return result;
    } catch (error) {
      console.error('Error invalidando sesiones del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener sesiones activas de un usuario
   */
  static async getActiveSessions(userId) {
    return Session.getActiveSessions(userId);
  }

  /**
   * Revocar una sesión específica (con verificación de usuario)
   */
  static async revokeSession(sessionId, userId = null) {
    try {
      const result = await Session.revokeSession(sessionId, userId);
      console.log(`Sesión ${sessionId} revocada${userId ? ` por usuario ${userId}` : ''}`);
      return Number(result?.matchedCount || 0) > 0;
    } catch (error) {
      console.error('Error revocando sesión:', error);
      throw error;
    }
  }

  /**
   * Revocar todas las sesiones de un usuario (excepto la actual)
   */
  static async revokeAllSessions(userId, currentSessionId = null) {
    try {
      const result = await Session.revokeAllSessions(userId, currentSessionId);
      console.log(`Todas las sesiones del usuario ${userId} revocadas${currentSessionId ? ` excepto ${currentSessionId}` : ''}`);
      return result;
    } catch (error) {
      console.error('Error revocando todas las sesiones:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las sesiones persistidas (para admin)
   */
  static async getAllActiveSessions() {
    return Session.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
      .populate('userId', 'username email')
      .sort({ lastActivity: -1, createdAt: -1 });
  }

  /**
   * Limpiar sesiones expiradas
   */
  static async cleanupExpiredSessions() {
    return Session.cleanupExpired();
  }

  static getPublicSecureChannel(session) {
    return toPublicSecureChannel(session);
  }

  static async rotateSecureChannel(sessionId, deviceInfo = {}) {
    const session = await Session.findById(sessionId);
    if (!session) return null;

    const nextState = buildSecureChannelState(deviceInfo, session?.secureChannel);
    await Session.updateOne(
      { _id: session._id },
      { $set: { secureChannel: nextState } }
    );

    const updated = await Session.findById(session._id);
    return updated ? toPublicSecureChannel(updated) : null;
  }

  /**
   * Parsear información del dispositivo desde user-agent
   */
  static parseDeviceInfo(req) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               'Unknown';

    // Parseo básico del user-agent
    let browser = 'Unknown';
    let os = 'Unknown';
    let platform = 'Unknown';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    }

    if (userAgent.includes('Windows')) {
      os = 'Windows';
      platform = 'Desktop';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
      platform = 'Desktop';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
      platform = 'Desktop';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      platform = 'Mobile';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
      platform = 'Mobile';
    }

    return {
      userAgent,
      ip,
      platform,
      browser,
      os
    };
  }
}

module.exports = SessionService;
