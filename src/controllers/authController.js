const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../config/auth');
const crypto = require('crypto');
const TryCatchDecorator = require('../utils/decorators');
const { Unauthorized, InternalServerError, BadRequest } = require('../utils/httpExceptions');
const JwtKeyManager = require('../utils/jwtKeyManager');
const SessionService = require('../services/sessionService');
const AuthThrottle = require('../models/AuthThrottle');

const LOGIN_RESPONSE_DELAY_MS = parseInt(process.env.LOGIN_RESPONSE_DELAY_MS, 10) || 400;
const AUTH_FAILURE_MAX_ATTEMPTS = parseInt(process.env.AUTH_FAILURE_MAX_ATTEMPTS, 10) || 3;
const AUTH_FAILURE_WINDOW_MS = (parseInt(process.env.AUTH_FAILURE_WINDOW_MINUTES, 10) || 30) * 60 * 1000;
const AUTH_BLOCK_MINUTES = parseInt(process.env.AUTH_FAILURE_BLOCK_MINUTES, 10) || 15;
const AUTH_BLOCK_MS = AUTH_BLOCK_MINUTES * 60 * 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getClientIp = (req) => String(
  req.headers['x-forwarded-for']?.split(',')[0] ||
  req.headers['x-real-ip'] ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress ||
  req.ip ||
  'unknown'
).trim();

const cleanupFailureBucket = async (key) => {
  const now = Date.now();
  const bucket = await AuthThrottle.findOne({ key });
  if (!bucket) return null;

  if (bucket.blockedUntil && new Date(bucket.blockedUntil).getTime() > now) {
    return bucket;
  }

  const attempts = (bucket.attempts || [])
    .map((ts) => new Date(ts).getTime())
    .filter((ts) => now - ts <= AUTH_FAILURE_WINDOW_MS)
    .map((ts) => new Date(ts));

  if (bucket.blockedUntil && new Date(bucket.blockedUntil).getTime() <= now) {
    bucket.blockedUntil = null;
  }

  if (!attempts.length && !bucket.blockedUntil) {
    await AuthThrottle.deleteOne({ _id: bucket._id });
    return null;
  }

  bucket.attempts = attempts;
  await bucket.save();
  return bucket;
};

const isFailureBucketBlocked = async (key) => {
  const bucket = await cleanupFailureBucket(key);
  if (!bucket?.blockedUntil) return null;
  const blockedUntil = new Date(bucket.blockedUntil).getTime();
  if (blockedUntil <= Date.now()) return null;
  return blockedUntil;
};

const registerFailure = async (key) => {
  const now = Date.now();
  const bucket = (await cleanupFailureBucket(key)) || (await AuthThrottle.getOrCreate(key));
  const attempts = (bucket.attempts || [])
    .map((ts) => new Date(ts).getTime())
    .filter((ts) => now - ts <= AUTH_FAILURE_WINDOW_MS);

  attempts.push(now);
  bucket.attempts = attempts.map((ts) => new Date(ts));

  if (attempts.length >= AUTH_FAILURE_MAX_ATTEMPTS) {
    bucket.blockedUntil = new Date(now + AUTH_BLOCK_MS);
  }

  await bucket.save();
  return {
    attempts: attempts.length,
    remainingAttempts: Math.max(0, AUTH_FAILURE_MAX_ATTEMPTS - attempts.length),
    blockedUntil: bucket.blockedUntil ? new Date(bucket.blockedUntil).getTime() : null
  };
};

const clearFailures = async (key) => {
  await AuthThrottle.deleteOne({ key });
};

const serializeSession = (sessionDoc) => {
  const session = sessionDoc?.toObject ? sessionDoc.toObject() : sessionDoc;
  if (!session) return null;

  return {
    _id: session._id,
    userId: session.userId,
    username: session.username,
    deviceInfo: session.deviceInfo,
    isActive: session.isActive,
    expiresAt: session.expiresAt,
    refreshExpiresAt: session.refreshExpiresAt,
    lastActivity: session.lastActivity,
    createdAt: session.createdAt
  };
};

const generateTokens = (userId, rol) => {
  console.log('generateTokens called with:', { userId: userId.toString(), rol });

  try {
    const accessJti = crypto.randomBytes(16).toString('hex');
    const refreshJti = crypto.randomBytes(16).toString('hex');

    const jwtExpire = process.env.JWT_EXPIRE || '15m';
    const jwtRefreshExpire = process.env.JWT_REFRESH_EXPIRE || '7d';

    console.log('Generating access token...');
    const accessToken = jwt.sign(
      { userId, rol, jti: accessJti },
      JwtKeyManager.getJwtSecret(),
      { expiresIn: jwtExpire }
    );
    console.log('Access token generated successfully');

    let refreshToken = null;
    try {
      console.log('Generating refresh token...');
      refreshToken = jwt.sign(
        { userId, type: 'refresh', jti: refreshJti },
        JwtKeyManager.getJwtRefreshSecret(),
        { expiresIn: jwtRefreshExpire }
      );
      console.log('Refresh token generated successfully');
    } catch (refreshError) {
      console.error('Error generating refresh token:', refreshError);
      // Si falla el refresh token, usar la misma clave que el access token
      refreshToken = jwt.sign(
        { userId, type: 'refresh', jti: refreshJti },
        JwtKeyManager.getJwtSecret(),
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error in generateTokens:', error);
    throw error;
  }
};

const login = async (req, res) => {
  try {
    console.log('Login attempt started');
    const rawUsername = req.body?.username ?? req.body?.email ?? '';
    const username = String(rawUsername).trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const loginGuardKey = `login:${getClientIp(req)}:${username || 'unknown'}`;

    console.log('Parsed credentials:', { username, passwordLength: password.length });

    // Validar entrada
    if (!username || !password) {
      console.log('Validation failed: missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    const blockedUntil = await isFailureBucketBlocked(loginGuardKey);
    if (blockedUntil) {
      const retryAfterSeconds = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(429).json({
        success: false,
        error: `Acceso bloqueado temporalmente por seguridad. Reintente en ${retryAfterSeconds}s`,
        retryAfterSeconds
      });
    }

    console.log('Looking up user...');
    // Buscar usuario
    let user;
    try {
      user = await User.findOne({ 
        $or: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      });  // Mongoose maneja timeouts automáticamente
    } catch (dbError) {
      console.error('Database error during login:', dbError.message);
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(503).json({
        success: false,
        error: 'Base de datos no disponible. Intente más tarde.',
        retryAfter: 5
      });
    }

    console.log('User lookup result:', user ? 'found' : 'not found');
    if (!user) {
      const failure = await registerFailure(loginGuardKey);
      await wait(LOGIN_RESPONSE_DELAY_MS);
      if (failure.blockedUntil) {
        const retryAfterSeconds = Math.max(1, Math.ceil((failure.blockedUntil - Date.now()) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          success: false,
          error: `Acceso bloqueado temporalmente por seguridad. Reintente en ${retryAfterSeconds}s`,
          retryAfterSeconds
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        remainingAttempts: failure.remainingAttempts
      });
    }

    if (!user.isActive) {
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(403).json({
        success: false,
        error: 'Usuario inactivo'
      });
    }

    console.log('Checking if user is locked...');
    // Verificar si la cuenta está bloqueada
    if (user.isLocked()) {
      const lockMs = Math.max(0, user.lockUntil - new Date());
      const lockTime = Math.ceil(lockMs / 60000);
      const retryAfterSeconds = Math.max(1, Math.ceil(lockMs / 1000));

      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(423).json({
        success: false,
        error: `Cuenta bloqueada temporalmente. Intente nuevamente en ${lockTime} minutos`,
        retryAfterSeconds
      });
    }

    console.log('Comparing password...');
    // Verificar contraseña
    let isMatch;
    try {
      isMatch = await comparePassword(password, user.passwordHash);
    } catch (cryptoError) {
      console.error('Password comparison error:', cryptoError.message);
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(500).json({
        success: false,
        error: 'Error al verificar credenciales'
      });
    }
    
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      const guardFailure = await registerFailure(loginGuardKey);
      const attemptResult = await user.registerFailedLoginAttempt();
      await wait(LOGIN_RESPONSE_DELAY_MS);

      if (guardFailure.blockedUntil) {
        const retryAfterSeconds = Math.max(1, Math.ceil((guardFailure.blockedUntil - Date.now()) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          success: false,
          error: `Acceso bloqueado temporalmente por seguridad. Reintente en ${retryAfterSeconds}s`,
          retryAfterSeconds
        });
      }

      if (attemptResult.locked && attemptResult.lockUntil) {
        const lockMs = Math.max(0, attemptResult.lockUntil - new Date());
        const lockTime = Math.ceil(lockMs / 60000);
        const retryAfterSeconds = Math.max(1, Math.ceil(lockMs / 1000));

        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(423).json({
          success: false,
          error: `Cuenta bloqueada temporalmente. Intente nuevamente en ${lockTime} minutos`,
          retryAfterSeconds
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        remainingAttempts: Math.min(
          attemptResult.remainingAttempts,
          guardFailure.remainingAttempts
        )
      });
    }

    console.log('Resetting login attempts...');
    // Resetear intentos fallidos
    const updateData = {
      loginAttempts: 0,
      lastLogin: new Date()
    };
    
    if (req.ip) {
      updateData.lastIP = req.ip;
    }
    
    await user.updateOne({
      $set: updateData,
      $unset: { lockUntil: 1 }
    });
    await clearFailures(loginGuardKey);

    console.log('Generating tokens...');
    // Generar tokens
    try {
      var { accessToken, refreshToken } = generateTokens(user._id, user.rol);
      console.log('Tokens generated successfully, accessToken length:', accessToken ? accessToken.length : 'null');
    } catch (tokenError) {
      console.error('Error generating tokens:', tokenError);
      throw tokenError; // Re-throw to be caught by outer catch
    }

    // Crear sesión
    try {
      const deviceInfo = SessionService.parseDeviceInfo(req);
      await SessionService.createSession(user, accessToken, refreshToken, deviceInfo);
      console.log('Sesión creada exitosamente');
    } catch (sessionError) {
      console.error('Error creando sesión:', sessionError);
      // No fallar el login por esto, pero loguear el error
    }

    console.log('Login successful, sending response');
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.rol,
          permisos: user.permisos
        },
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      timestamp: new Date().toISOString()
    });

    // Proporcionar información de debug avanzada
    const debugInfo = {
      message: error.message,
      name: error.name,
      code: error.code,
      timestamp: new Date().toISOString(),
      // Incluir stack trace siempre para debugging
      stack: error.stack,
      // Información adicional del error
      details: {
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        // Agregar información del entorno
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'unknown',
        // Verificar si las variables de entorno críticas están definidas
        jwtSecretDefined: !!process.env.JWT_SECRET,
        jwtRefreshSecretDefined: !!process.env.JWT_REFRESH_SECRET,
        mongoUriDefined: !!process.env.MONGODB_URI
      }
    };

    const internalError = new InternalServerError(
      'Error en el servidor',
      debugInfo
    );

    res.status(internalError.statusCode).json(internalError.toJSON());
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const tokenFingerprint = token ? crypto.createHash('sha256').update(String(token)).digest('hex').slice(0, 16) : 'missing';
    const refreshGuardKey = `refresh:${getClientIp(req)}:${tokenFingerprint}`;

    const blockedUntil = await isFailureBucketBlocked(refreshGuardKey);
    if (blockedUntil) {
      const retryAfterSeconds = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: `Renovación de token bloqueada temporalmente. Reintente en ${retryAfterSeconds}s`,
        retryAfterSeconds
      });
    }

    if (!token) {
      const failure = await registerFailure(refreshGuardKey);
      return res.status(401).json({
        success: false,
        error: 'Refresh token requerido',
        remainingAttempts: failure.remainingAttempts
      });
    }

    // Validar refresh token usando SessionService
    const session = await SessionService.validateRefreshToken(token);

    if (!session || !session.userId) {
      const failure = await registerFailure(refreshGuardKey);
      if (failure.blockedUntil) {
        const retryAfterSeconds = Math.max(1, Math.ceil((failure.blockedUntil - Date.now()) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          success: false,
          error: `Renovación de token bloqueada temporalmente. Reintente en ${retryAfterSeconds}s`,
          retryAfterSeconds
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Refresh token inválido o expirado',
        remainingAttempts: failure.remainingAttempts
      });
    }

    // Generar nuevos tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(session.userId._id, session.userId.rol);

    // Crear nueva sesión
    const deviceInfo = SessionService.parseDeviceInfo(req);
    await SessionService.createSession(session.userId, accessToken, newRefreshToken, deviceInfo);
    
    // Invalidar la sesión anterior después de asegurar la nueva
    await SessionService.invalidateSession(session._id);
    await clearFailures(refreshGuardKey);

    res.json({
      success: true,
      data: {
        tokens: {
          access: accessToken,
          refresh: newRefreshToken
        }
      }
    });

  } catch (error) {
    const token = req.body?.refreshToken;
    const tokenFingerprint = token ? crypto.createHash('sha256').update(String(token)).digest('hex').slice(0, 16) : 'missing';
    const refreshGuardKey = `refresh:${getClientIp(req)}:${tokenFingerprint}`;
    const failure = await registerFailure(refreshGuardKey);
    if (failure.blockedUntil) {
      const retryAfterSeconds = Math.max(1, Math.ceil((failure.blockedUntil - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: `Renovación de token bloqueada temporalmente. Reintente en ${retryAfterSeconds}s`,
        retryAfterSeconds
      });
    }
    res.status(401).json({
      success: false,
      error: 'Refresh token inválido',
      remainingAttempts: failure.remainingAttempts
    });
  }
};

const logout = async (req, res) => {
  try {
    const { allDevices = false } = req.body; // Parámetro opcional para cerrar todas las sesiones

    if (allDevices) {
      // Invalidar todas las sesiones del usuario
      await SessionService.invalidateAllUserSessions(req.user._id);
      console.log(`Todas las sesiones del usuario ${req.user.username} han sido invalidadas`);
    } else {
      // Invalidar solo la sesión actual
      if (req.session) {
        await SessionService.invalidateSession(req.session._id);
        console.log(`Sesión ${req.session._id} invalidada para usuario ${req.user.username}`);
      }
    }

    res.json({
      success: true,
      message: allDevices ? 'Todas las sesiones cerradas exitosamente' : 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesión'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verificar contraseña actual
    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Actualizar contraseña
    user.passwordHash = newPassword;
    await user.save();

    // Invalidar refresh tokens
    user.refreshToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al cambiar contraseña'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -refreshToken')
      .populate('createdBy', 'username email');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil'
    });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const sessions = await SessionService.getActiveSessions(req.user._id);
    
    res.json({
      success: true,
      data: sessions.map(serializeSession).filter(Boolean)
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sesiones activas'
    });
  }
};

const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'ID de sesión requerido'
      });
    }

    const result = await SessionService.revokeSession(sessionId, req.user._id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada o no autorizada'
      });
    }

    res.json({
      success: true,
      message: 'Sesión revocada exitosamente'
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({
      success: false,
      error: 'Error al revocar sesión'
    });
  }
};

const revokeAllSessions = async (req, res) => {
  try {
    const currentSessionId = req.sessionId; // Asumiendo que viene del middleware
    
    await SessionService.revokeAllSessions(req.user._id, currentSessionId);
    
    res.json({
      success: true,
      message: 'Todas las sesiones revocadas exitosamente (excepto la actual)'
    });
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Error al revocar todas las sesiones'
    });
  }
};

const getAllActiveSessions = async (req, res) => {
  try {
    // Solo para administradores
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere rol de administrador'
      });
    }

    const sessions = await SessionService.getAllActiveSessions();
    
    res.json({
      success: true,
      data: sessions.map(serializeSession).filter(Boolean)
    });
  } catch (error) {
    console.error('Error getting all active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener todas las sesiones activas'
    });
  }
};

const revokeSessionByAdmin = async (req, res) => {
  try {
    // Solo para administradores
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere rol de administrador'
      });
    }

    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'ID de sesión requerido'
      });
    }

    const result = await SessionService.revokeSession(sessionId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sesión revocada exitosamente por administrador'
    });
  } catch (error) {
    console.error('Error revoking session by admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error al revocar sesión'
    });
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  changePassword,
  getProfile,
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  getAllActiveSessions,
  revokeSessionByAdmin
};
