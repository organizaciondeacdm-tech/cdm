const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../config/auth');
const crypto = require('crypto');
const TryCatchDecorator = require('../utils/decorators');
const { Unauthorized, InternalServerError, BadRequest } = require('../utils/httpExceptions');
const JwtKeyManager = require('../utils/jwtKeyManager');
const SessionService = require('../services/sessionService');
const AuthThrottle = require('../models/AuthThrottle');
const { isPrivilegedRole } = require('../services/privilegedRoleService');
const { normalizeRole, normalizePermission, obfuscateRoleForTransport, obfuscatePermissionForTransport } = require('../utils/accessControlCrypto');

const LOGIN_RESPONSE_DELAY_MS = parseInt(process.env.LOGIN_RESPONSE_DELAY_MS, 10) || 400;
const AUTH_FAILURE_MAX_ATTEMPTS = parseInt(process.env.AUTH_FAILURE_MAX_ATTEMPTS, 10) || 10;
const AUTH_FAILURE_WINDOW_MS = (parseInt(process.env.AUTH_FAILURE_WINDOW_MINUTES, 10) || 15) * 60 * 1000;
const AUTH_BLOCK_MINUTES = parseInt(process.env.AUTH_FAILURE_BLOCK_MINUTES, 10) || 5;
const AUTH_BLOCK_MS = AUTH_BLOCK_MINUTES * 60 * 1000;

// Umbral de intentos fallidos para IPs desconocidas antes de bloquear
const UNKNOWN_IP_MAX_ATTEMPTS = 6;
// IPs conocidas por usuario — se actualiza en cada login exitoso (persistido en User.knownIps)
const KNOWN_IP_MAX_STORED = 20;

// IPs a monitorear por usuario
const WATCHED_USERNAMES = ['andres'];
const watchedIpLog = []; // en memoria — se puede persistir si es necesario

const logWatchedAttempt = (username, ip, success) => {
  if (!WATCHED_USERNAMES.includes(username.toLowerCase())) return;
  const entry = { ts: new Date().toISOString(), username, ip, success };
  watchedIpLog.push(entry);
  if (watchedIpLog.length > 500) watchedIpLog.shift(); // cap 500 entries
  console.log(`[AUTH-WATCH] usuario=${username} ip=${ip} exito=${success} ts=${entry.ts}`);
};

const getWatchedIpLog = (req, res) => {
  const { username, limit = 100 } = req.query;
  let log = [...watchedIpLog].reverse(); // más recientes primero
  if (username) log = log.filter(e => e.username === username.toLowerCase());
  res.json({ success: true, data: log.slice(0, Number(limit)), total: log.length });
};

const getKnownIps = async (req, res) => {
  try {
    if (!canManageSessions(req.user)) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }
    const { userId } = req.params;
    const user = await User.findById(userId).select('username knownIps');
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: { username: user.username, knownIps: user.knownIps || [] } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener IPs conocidas' });
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retorna el delay extra a aplicar según nro de intento (solo para IPs desconocidas)
// intento 4 → 5s, intento 5 → 7s, intento 6+ → 10s
const getUnknownIpDelay = (attemptCount) => {
  if (attemptCount >= 6) return 10000;
  if (attemptCount >= 5) return 7000;
  if (attemptCount >= 4) return 5000;
  return 0;
};

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

// -------------------------------------------------------
// IPs conocidas por usuario
// -------------------------------------------------------

/**
 * Verifica si una IP ya está en la lista de IPs conocidas del usuario.
 * Un usuario "conoce" una IP si alguna vez hizo login exitoso desde ella.
 */
const isKnownIp = (user, ip) => {
  const known = Array.isArray(user?.knownIps) ? user.knownIps : [];
  return known.some((entry) => String(entry?.ip || entry) === String(ip));
};

/**
 * Agrega una IP a la lista de IPs conocidas del usuario (max KNOWN_IP_MAX_STORED).
 * Se llama en cada login exitoso.
 */
const registerKnownIp = async (user, ip) => {
  try {
    const known = Array.isArray(user.knownIps) ? [...user.knownIps] : [];
    const alreadyKnown = known.some((entry) => String(entry?.ip || entry) === String(ip));
    if (alreadyKnown) {
      // Solo actualizar timestamp de último uso
      await user.updateOne({
        $set: { 'knownIps.$[elem].lastSeen': new Date() }
      }, {
        arrayFilters: [{ 'elem.ip': String(ip) }]
      });
      return;
    }
    const newEntry = { ip: String(ip), firstSeen: new Date(), lastSeen: new Date() };
    if (known.length >= KNOWN_IP_MAX_STORED) {
      // Sacar la más antigua (primer elemento)
      await user.updateOne({
        $pop: { knownIps: -1 },
      });
    }
    await user.updateOne({ $push: { knownIps: newEntry } });
  } catch (err) {
    console.error('[AUTH] Error registrando IP conocida:', err.message);
  }
};

// -------------------------------------------------------
// Throttle específico para IPs desconocidas
// -------------------------------------------------------

const UNKNOWN_IP_BUCKET_PREFIX = 'unknownip:';

const getUnknownIpAttempts = async (userId, ip) => {
  const key = `${UNKNOWN_IP_BUCKET_PREFIX}${userId}:${ip}`;
  const bucket = await cleanupFailureBucket(key);
  return { key, attempts: bucket?.attempts?.length || 0, blockedUntil: bucket?.blockedUntil || null };
};

const registerUnknownIpFailure = async (userId, ip) => {
  const key = `${UNKNOWN_IP_BUCKET_PREFIX}${userId}:${ip}`;
  const now = Date.now();
  const bucket = (await cleanupFailureBucket(key)) || (await AuthThrottle.getOrCreate(key));
  const attempts = (bucket.attempts || [])
    .map((ts) => new Date(ts).getTime())
    .filter((ts) => now - ts <= AUTH_FAILURE_WINDOW_MS);

  attempts.push(now);
  bucket.attempts = attempts.map((ts) => new Date(ts));

  if (attempts.length >= UNKNOWN_IP_MAX_ATTEMPTS) {
    bucket.blockedUntil = new Date(now + AUTH_BLOCK_MS);
  }

  await bucket.save();
  return { key, attempts: attempts.length, blockedUntil: bucket.blockedUntil ? new Date(bucket.blockedUntil).getTime() : null };
};

const clearUnknownIpFailures = async (userId, ip) => {
  const key = `${UNKNOWN_IP_BUCKET_PREFIX}${userId}:${ip}`;
  await AuthThrottle.deleteOne({ key });
};

const hasAdminAclPermissions = (perms = []) => {
  const set = new Set((Array.isArray(perms) ? perms : []).map((perm) => normalizePermission(perm)));
  return (
    set.has('*') ||
    set.has('gestionar_usuarios') ||
    set.has('gestionar_roles_permisos') ||
    set.has('gestionar_seguridad') ||
    set.has('ver_sesiones_admin')
  );
};

const buildCapabilityFlags = (perms = [], role = '') => {
  const set = new Set((Array.isArray(perms) ? perms : []).map((perm) => normalizePermission(perm)));
  const normalizedRole = normalizeRole(role || '');
  const isDeveloper = normalizedRole === 'desarrollador';
  const isSupervisor = normalizedRole === 'supervisor';
  const adminLevel = hasAdminAclPermissions(perms);
  const canManageOperationalSections = adminLevel
    || isSupervisor
    || set.has('crear_escuela')
    || set.has('editar_escuela')
    || set.has('eliminar_escuela')
    || set.has('crear_docente')
    || set.has('editar_docente')
    || set.has('eliminar_docente')
    || set.has('crear_alumno')
    || set.has('editar_alumno')
    || set.has('eliminar_alumno');
  const canExportData = adminLevel || isSupervisor || set.has('exportar_datos');
  return {
    canManageOperationalSections,
    canExportData,
    isDeveloper,
    canManageUsers: adminLevel,
    canManageRolesPermissions: adminLevel,
    canManageSecurity: adminLevel,
    canViewAdminSessions: adminLevel
  };
};

const canManageSessions = async (user) => {
  const role = normalizeRole(user?.rol || '');
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  return (await isPrivilegedRole(role)) || hasAdminAclPermissions(permisos);
};

const serializeAuthUser = async (user) => {
  if (!user) return null;
  const role = normalizeRole(user?.rol || '');
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  const hasPrivilegedRole = await isPrivilegedRole(role);
  const hasAdminPermissions = hasAdminAclPermissions(permisos);
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    rol: obfuscateRoleForTransport(role),
    permisos: Array.from(new Set(permisos.map((perm) => obfuscatePermissionForTransport(perm)))),
    capabilities: buildCapabilityFlags(permisos, role),
    isPrivilegedRole: hasPrivilegedRole || hasAdminPermissions
  };
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
    const clientIp = getClientIp(req);
    const loginGuardKey = `login:${clientIp}:${username || 'unknown'}`;

    console.log('Parsed credentials:', { username, passwordLength: password.length });

    // Validar entrada
    if (!username || !password) {
      console.log('Validation failed: missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    // Chequeo global de bloqueo (aplica a cualquier IP si hay exceso de intentos)
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
      });
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
      logWatchedAttempt(username, clientIp, false);
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

    // Determinar si la IP es conocida para este usuario (login exitoso previo)
    const ipIsKnown = isKnownIp(user, clientIp);

    // Para IPs desconocidas: verificar si ya está bloqueada por exceso de intentos fallidos
    if (!ipIsKnown) {
      const unknownIpState = await getUnknownIpAttempts(user._id, clientIp);
      if (unknownIpState.blockedUntil && new Date(unknownIpState.blockedUntil).getTime() > Date.now()) {
        const retryAfterSeconds = Math.max(1, Math.ceil((new Date(unknownIpState.blockedUntil).getTime() - Date.now()) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        await wait(LOGIN_RESPONSE_DELAY_MS);
        return res.status(429).json({
          success: false,
          error: `Demasiados intentos fallidos desde esta dirección. Reintente en ${retryAfterSeconds}s`,
          retryAfterSeconds,
          unknownIp: true
        });
      }
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
      logWatchedAttempt(username, clientIp, false);
      const guardFailure = await registerFailure(loginGuardKey);
      const attemptResult = await user.registerFailedLoginAttempt();

      // Para IPs desconocidas: registrar fallo y aplicar delay progresivo
      let unknownIpAttempts = 0;
      if (!ipIsKnown) {
        const unknownResult = await registerUnknownIpFailure(user._id, clientIp);
        unknownIpAttempts = unknownResult.attempts;
        console.log(`[AUTH] IP desconocida ${clientIp} para usuario ${username}: intento ${unknownIpAttempts}/${UNKNOWN_IP_MAX_ATTEMPTS}`);

        const extraDelay = getUnknownIpDelay(unknownIpAttempts);
        if (extraDelay > 0) {
          console.log(`[AUTH] Aplicando delay de ${extraDelay}ms por IP desconocida (intento ${unknownIpAttempts})`);
          await wait(extraDelay);
        } else {
          await wait(LOGIN_RESPONSE_DELAY_MS);
        }

        // Bloqueo específico por IP desconocida al llegar a UNKNOWN_IP_MAX_ATTEMPTS
        if (unknownResult.blockedUntil) {
          const retryAfterSeconds = Math.max(1, Math.ceil((unknownResult.blockedUntil - Date.now()) / 1000));
          res.set('Retry-After', String(retryAfterSeconds));
          return res.status(429).json({
            success: false,
            error: `Demasiados intentos fallidos desde esta dirección. Reintente en ${retryAfterSeconds}s`,
            retryAfterSeconds,
            unknownIp: true
          });
        }
      } else {
        await wait(LOGIN_RESPONSE_DELAY_MS);
      }

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
        ),
        ...((!ipIsKnown && unknownIpAttempts > 0) && {
          unknownIpWarning: `IP no reconocida. Intento ${unknownIpAttempts}/${UNKNOWN_IP_MAX_ATTEMPTS}`
        })
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
    // Rotación activa: reescribe ACL cifrada en cada login exitoso.
    await user.updateOne({
      $set: {
        rol: user.rol,
        permisos: Array.isArray(user.permisos) ? user.permisos : []
      }
    });
    await clearFailures(loginGuardKey);

    // Registrar la IP como conocida (login exitoso) y limpiar throttle de IP desconocida
    await registerKnownIp(user, clientIp);
    if (!ipIsKnown) {
      await clearUnknownIpFailures(user._id, clientIp);
    }

    // Loguear login exitoso de usuarios monitoreados
    logWatchedAttempt(username, clientIp, true);

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
    const authUser = await serializeAuthUser(user);
    res.json({
      success: true,
      data: {
        user: authUser,
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
    const authUser = await serializeAuthUser(user);

    res.json({
      success: true,
      data: authUser
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
    // Solo rol privilegiado configurado en DB.
    if (!await canManageSessions(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere rol privilegiado'
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
      error: 'Error al obtener todas las sesiones'
    });
  }
};

const revokeSessionByAdmin = async (req, res) => {
  try {
    // Solo rol privilegiado configurado en DB.
    if (!await canManageSessions(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere rol privilegiado'
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
  revokeSessionByAdmin,
  getWatchedIpLog,
  getKnownIps
};
