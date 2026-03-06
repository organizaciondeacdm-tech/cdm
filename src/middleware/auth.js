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
  'ver_reportes',
  'gestionar_formularios'
].map((permission) => normalizePermission(permission)));

const TRAFFIC_LOCK_CODE = 'TRAFFIC_LOCK_REQUIRED';
const SECURE_ENDPOINT_CODE = 'SECURE_ENDPOINT_REQUIRED';
const strictEnv = !['development', 'test'].includes(String(process.env.NODE_ENV || '').toLowerCase());
const ENFORCE_SECURE_ENDPOINT = process.env.SECURE_ENDPOINT_STRICT
  ? String(process.env.SECURE_ENDPOINT_STRICT) === '1'
  : strictEnv;
const LOCK_ALLOWED_PATHS = new Set([
  '/api/auth/traffic-handshake',
  '/api/auth/logout'
]);
const SECURE_ENDPOINT_ALLOWED_PATHS = new Set([
  '/api/auth/traffic-handshake',
  '/api/auth/logout'
]);
const UNKNOWN_IP_LOCK_TTL_MS = (parseInt(process.env.UNKNOWN_IP_LOCK_TTL_MINUTES, 10) || 30) * 60 * 1000;
const SECURE_TS_DRIFT_MS = Math.max(10000, Number.parseInt(process.env.SECURE_ENDPOINT_MAX_DRIFT_MS || '120000', 10) || 120000);
const SECURE_NONCE_LIMIT = Math.max(16, Number.parseInt(process.env.SECURE_ENDPOINT_NONCE_WINDOW || '64', 10) || 64);

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

const sha256Hex = (value = '') => (
  crypto.createHash('sha256').update(String(value)).digest('hex')
);

const safeEquals = (a = '', b = '') => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const normalizePath = (value = '') => String(value || '').split('?')[0];

const payloadDigest = (payload) => {
  if (payload === undefined) return sha256Hex('');
  try {
    return sha256Hex(JSON.stringify(payload));
  } catch {
    return sha256Hex('');
  }
};

const buildSecureChannelKey = ({ token = '', serverNonce = '', sessionId = '', clientToken = '' }) => (
  sha256Hex(`${String(token)}|${String(serverNonce)}|${String(sessionId)}|${String(clientToken)}`)
);

const buildExpectedAlias = ({ key, method, path, seq, nonce, ts }) => (
  `epa1.${sha256Hex(`${key}|alias|${method}|${path}|${seq}|${nonce}|${ts}`).slice(0, 48)}`
);

const buildExpectedSignature = ({ key, method, path, seq, nonce, ts, bodyHash }) => (
  `eps1.${sha256Hex(`${key}|sig|${method}|${path}|${seq}|${nonce}|${ts}|${bodyHash}`).slice(0, 64)}`
);

const sendSecureEndpointResponse = (res, channel, reason = 'secure_channel_required') => (
  res.status(428).json({
    success: false,
    code: SECURE_ENDPOINT_CODE,
    error: 'Se requiere handshake seguro de endpoint',
    reason,
    secureChannel: channel || null
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

    const securePath = path;
    const secureAllowedPath = SECURE_ENDPOINT_ALLOWED_PATHS.has(securePath);
    const secureState = req.session?.secureChannel || null;
    const secureExpired = (
      !secureState
      || !secureState.serverNonce
      || !secureState.clientToken
      || new Date(secureState.expiresAt || 0).getTime() <= Date.now()
    );

    const alias = String(req.headers['x-endpoint-alias'] || '').trim();
    const signature = String(req.headers['x-endpoint-signature'] || '').trim();
    const nonce = String(req.headers['x-endpoint-nonce'] || '').trim();
    const tsRaw = String(req.headers['x-endpoint-ts'] || '').trim();
    const seqRaw = String(req.headers['x-endpoint-seq'] || '').trim();
    const ts = Number.parseInt(tsRaw, 10);
    const seq = Number.parseInt(seqRaw, 10);

    if (!secureAllowedPath && ENFORCE_SECURE_ENDPOINT) {
      if (secureExpired) {
        const rotated = await SessionService.rotateSecureChannel(req.sessionId, SessionService.parseDeviceInfo(req));
        return sendSecureEndpointResponse(res, rotated, 'channel_expired');
      }

      const hasHeaders = alias && signature && nonce && Number.isFinite(ts) && Number.isFinite(seq);
      if (!hasHeaders) {
        const channel = SessionService.getPublicSecureChannel(req.session);
        return sendSecureEndpointResponse(res, channel, 'missing_headers');
      }

      const now = Date.now();
      if (Math.abs(now - ts) > SECURE_TS_DRIFT_MS) {
        const channel = SessionService.getPublicSecureChannel(req.session);
        return sendSecureEndpointResponse(res, channel, 'clock_drift');
      }

      const currentSeq = Number(secureState.seq || 0);
      if (seq <= currentSeq) {
        const channel = SessionService.getPublicSecureChannel(req.session);
        return sendSecureEndpointResponse(res, channel, 'replay_seq');
      }

      const recentNonces = Array.isArray(secureState.recentNonces) ? secureState.recentNonces : [];
      if (recentNonces.includes(nonce)) {
        const channel = SessionService.getPublicSecureChannel(req.session);
        return sendSecureEndpointResponse(res, channel, 'replay_nonce');
      }

      if (secureState.uaHash) {
        const uaHash = sha256Hex(req.headers['user-agent'] || '');
        if (uaHash !== String(secureState.uaHash)) {
          const rotated = await SessionService.rotateSecureChannel(req.sessionId, SessionService.parseDeviceInfo(req));
          return sendSecureEndpointResponse(res, rotated, 'ua_mismatch');
        }
      }

      const method = String(req.method || 'GET').toUpperCase();
      const channelKey = buildSecureChannelKey({
        token: req.token || '',
        serverNonce: secureState.serverNonce,
        sessionId: req.session?._id || req.sessionId || '',
        clientToken: secureState.clientToken
      });
      const bodyHash = payloadDigest(req.body);
      const expectedAlias = buildExpectedAlias({ key: channelKey, method, path: securePath, seq, nonce, ts });
      const expectedSignature = buildExpectedSignature({ key: channelKey, method, path: securePath, seq, nonce, ts, bodyHash });

      const validAlias = safeEquals(alias, expectedAlias);
      const validSignature = safeEquals(signature, expectedSignature);
      if (!validAlias || !validSignature) {
        const channel = SessionService.getPublicSecureChannel(req.session);
        return sendSecureEndpointResponse(res, channel, 'invalid_signature');
      }

      const updatedNonces = [nonce, ...recentNonces].slice(0, SECURE_NONCE_LIMIT);
      await req.session.updateOne({
        $set: {
          'secureChannel.seq': seq,
          'secureChannel.lastUsedAt': new Date(),
          'secureChannel.recentNonces': updatedNonces
        }
      });
      req.session.secureChannel = {
        ...(req.session.secureChannel || {}),
        seq,
        recentNonces: updatedNonces,
        lastUsedAt: new Date()
      };
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
