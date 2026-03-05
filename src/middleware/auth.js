const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const SessionService = require('../services/sessionService');
const JwtKeyManager = require('../utils/jwtKeyManager');
const { normalizeRole, normalizePermission } = require('../utils/accessControlCrypto');
const { isPrivilegedRole } = require('../services/privilegedRoleService');

const SUPERVISOR_ALLOWED_PERMISSIONS = new Set([
  'crear_escuela',
  'editar_escuela',
  'eliminar_escuela',
  'crear_docente',
  'editar_docente',
  'eliminar_docente',
  'crear_alumno',
  'editar_alumno',
  'eliminar_alumno',
  'exportar_datos',
  'ver_reportes'
].map((permission) => normalizePermission(permission)));

const TRAFFIC_LOCK_CODE = 'TRAFFIC_LOCK_REQUIRED';
const LOCK_ALLOWED_PATHS = new Set([
  '/api/auth/traffic-handshake',
  '/api/auth/logout'
]);
const UNKNOWN_IP_LOCK_TTL_MS = (parseInt(process.env.UNKNOWN_IP_LOCK_TTL_MINUTES, 10) || 30) * 60 * 1000;

const normalizeIp = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw;
};

const getClientIp = (req) => normalizeIp(
  req.headers['x-forwarded-for']?.split(',')[0]
  || req.headers['x-real-ip']
  || req.connection?.remoteAddress
  || req.socket?.remoteAddress
  || req.ip
  || 'unknown'
);

const isKnownIp = (user, ip) => {
  const expected = normalizeIp(ip);
  if (!expected) return false;
  const known = Array.isArray(user?.knownIps) ? user.knownIps : [];
  return known.some((row) => normalizeIp(row?.ip || row) === expected);
};

const hashHandshakeProof = ({ challenge = '', token = '', userAgent = '', userId = '' }) => (
  crypto
    .createHash('sha256')
    .update(`${String(challenge)}|${String(token)}|${String(userAgent)}|${String(userId)}`)
    .digest('hex')
);

const encodeProofToken = (proofHex = '') => {
  const base = Buffer.from(String(proofHex), 'utf8').toString('base64url');
  return `hsv1.${base}`;
};

const buildSecurityLockFromUnknownIp = ({ req, session, user }) => {
  const challengeNonce = crypto.randomBytes(24).toString('base64url');
  const challenge = `acdmhs1.${challengeNonce}`;
  const proofHash = hashHandshakeProof({
    challenge,
    token: req.token || '',
    userAgent: req.headers['user-agent'] || '',
    userId: String(user?._id || '')
  });
  const requestIp = getClientIp(req);
  const sessionIp = normalizeIp(session?.deviceInfo?.ip || '');
  const expiresAt = new Date(Date.now() + UNKNOWN_IP_LOCK_TTL_MS);

  return {
    active: true,
    reason: 'unknown_ip',
    code: TRAFFIC_LOCK_CODE,
    challenge,
    expectedProofToken: encodeProofToken(proofHash),
    requestIp,
    sessionIp,
    createdAt: new Date(),
    expiresAt,
    attempts: 0
  };
};

const isTrafficLockActive = (lock) => {
  if (!lock || lock.active !== true) return false;
  const expiry = new Date(lock.expiresAt || 0).getTime();
  if (!expiry) return false;
  return expiry > Date.now();
};

const sendTrafficLockResponse = (res, lock) => (
  res.status(423).json({
    success: false,
    code: TRAFFIC_LOCK_CODE,
    error: 'Tráfico inusual detectado. Debe completar handshake de seguridad.',
    lock: {
      reason: 'unknown_ip',
      challenge: lock?.challenge,
      requestIp: lock?.requestIp,
      sessionIp: lock?.sessionIp,
      expiresAt: lock?.expiresAt
    }
  })
);

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido'
      });
    }

    // Validar token usando SessionService
    const session = await SessionService.validateAccessToken(token);

    if (!session || !session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o sesión expirada'
      });
    }

    req.user = session.userId; // El populate ya trae el usuario completo
    // Endurece shape del usuario para evitar fallas en chequeos de permisos.
    req.user.permisos = Array.isArray(req.user?.permisos) ? req.user.permisos : [];
    req.user.rol = normalizeRole(req.user?.rol || '');
    req.token = token;
    req.session = session;
    req.sessionId = session._id; // Agregar sessionId para gestión de sesiones

    const path = String(req.originalUrl || '').split('?')[0];
    const allowWhileLocked = LOCK_ALLOWED_PATHS.has(path);
    const currentLock = req.user?.securityLock;

    if (currentLock?.active && !isTrafficLockActive(currentLock)) {
      await User.updateOne(
        { _id: req.user._id },
        { $unset: { securityLock: '' } }
      );
      req.user.securityLock = null;
    }

    if (isTrafficLockActive(req.user?.securityLock)) {
      if (!allowWhileLocked) {
        return sendTrafficLockResponse(res, req.user.securityLock);
      }
      return next();
    }

    const requestIp = getClientIp(req);
    const sessionIp = normalizeIp(req.session?.deviceInfo?.ip || '');
    const sameSessionIp = !!requestIp && !!sessionIp && requestIp === sessionIp;
    const knownIp = isKnownIp(req.user, requestIp);
    const shouldLock = requestIp && sessionIp && !sameSessionIp && !knownIp;

    if (shouldLock) {
      const nextLock = buildSecurityLockFromUnknownIp({
        req,
        session: req.session,
        user: req.user
      });

      await User.updateOne(
        { _id: req.user._id },
        { $set: { securityLock: nextLock } }
      );
      req.user.securityLock = nextLock;

      if (!allowWhileLocked) {
        return sendTrafficLockResponse(res, nextLock);
      }
    }

    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error);
    res.status(401).json({
      success: false,
      error: 'Por favor autentíquese'
    });
  }
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const role = normalizeRole(req.user?.rol || '');
      const permisos = Array.isArray(req.user?.permisos) ? req.user.permisos : [];
      const permisosSet = new Set(permisos.map((p) => normalizePermission(p)));
      const wantedPermission = normalizePermission(permission);
      const hasPrivilegedRole = await isPrivilegedRole(role);
      const isSupervisorAllowed = role === 'supervisor' && SUPERVISOR_ALLOWED_PERMISSIONS.has(wantedPermission);

      if (hasPrivilegedRole || permisosSet.has('*') || permisosSet.has(wantedPermission) || isSupervisorAllowed) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para realizar esta acción'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error al validar permisos'
      });
    }
  };
};

const requireAdmin = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.rol || '');
    const permisos = Array.isArray(req.user?.permisos) ? req.user.permisos : [];
    const permisosSet = new Set(permisos.map((p) => normalizePermission(p)));
    const hasPrivilegedRole = await isPrivilegedRole(role);
    const hasAdminPermissions = (
      permisosSet.has('*') ||
      permisosSet.has('gestionar_usuarios') ||
      permisosSet.has('gestionar_roles_permisos') ||
      permisosSet.has('gestionar_seguridad') ||
      permisosSet.has('ver_sesiones_admin')
    );
    if (hasPrivilegedRole || hasAdminPermissions) return next();
    return res.status(403).json({
      success: false,
      error: 'Se requieren permisos de administrador'
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      error: 'Error al validar rol privilegiado'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({
        _id: decoded.userId,
        isActive: true
      });
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignorar errores de autenticación opcional
  }
  next();
};

module.exports = {
  authMiddleware,
  requirePermission,
  requireAdmin,
  optionalAuth
};
