const Session = require('../models/Session');

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
        refreshExpiresAt
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
      return result;
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
      return result;
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
    return Session.find({})
      .populate('userId', 'username email')
      .sort({ isActive: -1, lastActivity: -1, createdAt: -1 });
  }

  /**
   * Limpiar sesiones expiradas
   */
  static async cleanupExpiredSessions() {
    return Session.cleanupExpired();
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
