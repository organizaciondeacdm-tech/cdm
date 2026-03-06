const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { registrarAccion, consultarAuditoria } = require('./services/auditoriaService');
const JwtKeyManager = require('./utils/jwtKeyManager');
const { getRuntimeEnvState } = require('./config/runtimeEnv');
const { getDataSource } = require('./config/typeorm');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const escuelaRoutes = require('./routes/escuelaRoutes');
const docenteRoutes = require('./routes/docenteRoutes');
const alumnoRoutes = require('./routes/alumnoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const informeRoutes = require('./routes/informeRoutes');
const formEngineRoutes = require('./routes/formEngineRoutes');
const { generarDashboard } = require('./controllers/reporteController');
const {
  getAllActiveSessions,
  revokeSessionByAdmin
} = require('./controllers/authController');
const {
  createEscuela,
  getEscuelas,
  getEscuelaById,
  updateEscuela,
  deleteEscuela
} = require('./controllers/escuelaController');
const { validateEscuela } = require('./middleware/validation');
const User = require('./models/User');
const { sendEmail } = require('./services/emailService');
const { authMiddleware } = require('./middleware/auth');
const Escuela = require('./models/Escuela');
const Docente = require('./models/Docente');
const Alumno = require('./models/Alumno');
const securityMonitorService = require('./services/securityMonitorService');
const SessionService = require('./services/sessionService');
const domainEventOutboxProcessor = require('./services/domainEventOutboxProcessor');
const endpointChannelService = require('./services/endpointChannelService');
const RolePolicy = require('./models/RolePolicy');
const { isPrivilegedRole } = require('./services/privilegedRoleService');
const {
  normalizeRole,
  normalizePermission,
  buildLookupKey,
  encryptAclValue,
  obfuscatePermissionForTransport,
  resolveRoleFromTransport,
  resolvePermissionFromTransport
} = require('./utils/accessControlCrypto');
const {
  isEncryptedEnvelope,
  decryptPayloadEnvelope,
  encryptPayloadEnvelope
} = require('./utils/payloadTransportCrypto');

const FIELD_ALIAS_META_KEY = '__acdmFieldAliasV1';
const FIELD_ALIAS_DATA_KEY = '__acdmPayloadV1';
const FIELD_ALIAS_SCHEME = 'fid1';
const SECURE_ENDPOINT_CODE = 'SECURE_ENDPOINT_REQUIRED';
const PUBLIC_SECURE_BYPASS_PATHS = new Set([
  '/api/security/bootstrap',
  '/api/runtime-environment',
  '/api/health',
  '/api/test'
]);

const deobfuscateAliasedBody = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const meta = payload[FIELD_ALIAS_META_KEY];
  const data = payload[FIELD_ALIAS_DATA_KEY];
  if (!meta || !data || typeof meta !== 'object' || typeof data !== 'object') return payload;
  if (String(meta.scheme || '') !== FIELD_ALIAS_SCHEME) return payload;

  const map = meta.map && typeof meta.map === 'object' ? meta.map : {};
  const out = {};
  Object.entries(data).forEach(([aliasKey, value]) => {
    const original = String(map[aliasKey] || aliasKey);
    out[original] = value;
  });

  Object.keys(payload).forEach((key) => {
    if (key === FIELD_ALIAS_META_KEY || key === FIELD_ALIAS_DATA_KEY) return;
    out[key] = payload[key];
  });

  return out;
};

const app = express();
const PUBLIC_RUNTIME_ENV_KEYS = ['VITE_API_URL', 'VITE_AUTH_STORAGE_SECRET'];
const LOCAL_RUNTIME_ENV_DEFAULTS = {
  VITE_API_URL: '/api',
  VITE_AUTH_STORAGE_SECRET: 'acdm-local-auth-storage-secret'
};
const STATIC_PERMISSION_CATALOG = [
  '*',
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
  'gestionar_formularios',
  'gestionar_usuarios',
  'gestionar_roles_permisos',
  'gestionar_seguridad',
  'ver_sesiones_admin'
].map((permission) => normalizePermission(permission)).filter(Boolean);
const STATIC_ROLE_CATALOG = ['admin', 'desarrollador', 'supervisor', 'viewer'].map((role) => normalizeRole(role));

const hasAdminAclPermissions = (permisos = []) => {
  const permisosSet = new Set(
    (Array.isArray(permisos) ? permisos : []).map((permission) => normalizePermission(permission))
  );
  return (
    permisosSet.has('*') ||
    permisosSet.has('gestionar_usuarios') ||
    permisosSet.has('gestionar_roles_permisos') ||
    permisosSet.has('gestionar_seguridad') ||
    permisosSet.has('ver_sesiones_admin')
  );
};

const buildCapabilityFlags = (permisos = [], role = '') => {
  const set = new Set((Array.isArray(permisos) ? permisos : []).map((permission) => normalizePermission(permission)));
  const normalizedRole = normalizeRole(role || '');
  const isDeveloper = normalizedRole === 'desarrollador';
  const isSupervisor = normalizedRole === 'supervisor';
  const adminLevel = hasAdminAclPermissions(permisos);
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

const obfuscatePermissionsForResponse = (permisos = []) => (
  Array.from(new Set(
    (Array.isArray(permisos) ? permisos : [])
      .map((permission) => normalizePermission(permission))
      .filter(Boolean)
      .map((permission) => obfuscatePermissionForTransport(permission))
  ))
);

const normalizePermissionsForResponse = (permisos = []) => (
  Array.from(new Set(
    (Array.isArray(permisos) ? permisos : [])
      .map((permission) => normalizePermission(permission))
      .filter(Boolean)
  ))
);

const buildAdminUserPayload = (user) => {
  if (!user) return null;
  const data = user.toObject ? user.toObject() : { ...user };
  const rawRole = user?.rol ?? data?.rol ?? '';
  const rawPerms = Array.isArray(user?.permisos) ? user.permisos : data?.permisos;
  const normalizedRole = normalizeRole(rawRole);

  data.rol = normalizedRole;
  data.permisos = normalizePermissionsForResponse(rawPerms);
  data.capabilities = buildCapabilityFlags(rawPerms, normalizedRole);
  if (user?.email) data.email = String(user.email);
  delete data.passwordHash;

  return data;
};

const buildAuthUserPayload = async (user) => {
  if (!user) return null;
  const role = normalizeRole(user.rol || '');
  const permisos = Array.isArray(user.permisos) ? user.permisos : [];
  const capabilities = buildCapabilityFlags(permisos, role);
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    rol: role,
    permisos: obfuscatePermissionsForResponse(permisos),
    capabilities,
    isPrivilegedRole: (await isPrivilegedRole(role)) || hasAdminAclPermissions(permisos)
  };
};

const generateTokens = (userId, rol) => {
  const accessJti = crypto.randomBytes(16).toString('hex');
  const refreshJti = crypto.randomBytes(16).toString('hex');
  const jwtExpire = process.env.JWT_EXPIRE || '15m';
  const jwtRefreshExpire = process.env.JWT_REFRESH_EXPIRE || '7d';

  const accessToken = jwt.sign(
    { userId, rol, jti: accessJti },
    JwtKeyManager.getJwtSecret(),
    { expiresIn: jwtExpire }
  );
  let refreshToken;
  try {
    refreshToken = jwt.sign(
      { userId, type: 'refresh', jti: refreshJti },
      JwtKeyManager.getJwtRefreshSecret(),
      { expiresIn: jwtRefreshExpire }
    );
  } catch (_error) {
    refreshToken = jwt.sign(
      { userId, type: 'refresh', jti: refreshJti },
      JwtKeyManager.getJwtSecret(),
      { expiresIn: jwtRefreshExpire }
    );
  }

  return { accessToken, refreshToken };
};

// Variable global para la conexión (patrón Singleton)
let connectionPromise = null;

const ensureDbConnection = async () => {
  if (!connectionPromise) {
    console.log('🔄 Inicializando conexión a MongoDB...');
    connectionPromise = connectDB()
      .then(async (result) => {
        // Initialize JWT keys exactly once, right after the DB is ready
        await JwtKeyManager.initialize();
        return result;
      })
      .catch(err => {
        console.error('❌ Error conectando a DB:', err);
        connectionPromise = null;
        throw err;
      });
  }
  return connectionPromise;
};

let outboxWorkerStarted = false;
const ensureOutboxWorker = () => {
  if (outboxWorkerStarted) return;
  const started = domainEventOutboxProcessor.start({ ensureDbConnection });
  if (started) {
    outboxWorkerStarted = true;
    console.log('[OUTBOX] Worker started');
  } else {
    console.log('[OUTBOX] Worker disabled by environment');
  }
};

// Middleware de conexión a DB (solo para rutas que la necesitan)
app.use('/api', async (req, res, next) => {
  // Rutas que NO necesitan DB (solo salud y test)
  const skipDbRoutes = ['/test', '/health'];

  // /auth/login y /auth/refresh-token SÍ necesitan DB para buscar el usuario
  const needsDb = !skipDbRoutes.some(route => req.path.includes(route));

  if (!needsDb) {
    // Rutas que no necesitan DB
    return next();
  }

  // Intentar conectar a DB
  try {
    await ensureDbConnection();
    ensureOutboxWorker();
    next();
  } catch (error) {
    console.error('❌ Error en middleware DB:', error);
    res.status(503).json({
      success: false,
      error: 'Servicio temporalmente no disponible'
    });
  }
});

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Monitoreo y protección adicional por IP (ban, ráfagas, histórico)
app.use(securityMonitorService.middleware());

// Rate limiting (disabled in test/development environments)
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.E2E_DISABLE_RATE_LIMIT === '1';
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: isTestEnv ? 10_000 : (parseInt(process.env.RATE_LIMIT_MAX) || 100),
  message: 'Demasiadas peticiones, intente nuevamente más tarde',
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || 'default',
  skip: () => isTestEnv
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Interceptor global de salida para payloads JSON de /api
app.use((req, res, next) => {
  const isApiRoute = String(req.originalUrl || '').startsWith('/api/');
  const requestPath = String(req.originalUrl || '').split('?')[0];
  const isPublicBypassPath = PUBLIC_SECURE_BYPASS_PATHS.has(requestPath);
  if (!isApiRoute || isPublicBypassPath) return next();

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (isEncryptedEnvelope(payload)) {
      res.setHeader('x-payload-intercept', '1');
      return originalJson(payload);
    }

    try {
      res.setHeader('x-payload-intercept', '1');
      return originalJson(encryptPayloadEnvelope(payload));
    } catch (_error) {
      return originalJson({
        success: false,
        error: 'No se pudo cifrar el payload de respuesta'
      });
    }
  };

  return next();
});

// Validación global de endpoint seguro para rutas /api sin sesión autenticada
app.use('/api', (req, res, next) => {
  if (String(req.method || '').toUpperCase() === 'OPTIONS') return next();
  const path = String(req.originalUrl || '').split('?')[0];
  if (PUBLIC_SECURE_BYPASS_PATHS.has(path)) return next();

  const hasAuth = !!String(req.headers.authorization || '').trim();
  if (hasAuth) return next();

  const validation = endpointChannelService.validatePublicRequest(req, req.body);
  if (validation.ok) return next();

  const publicChannel = endpointChannelService.issuePublicChannel(req);
  return res.status(428).json({
    success: false,
    code: SECURE_ENDPOINT_CODE,
    error: 'Se requiere handshake seguro de endpoint',
    reason: validation.reason || 'public_secure_required',
    publicChannel
  });
});

// Descifrado obligatorio de payload JSON en métodos mutables de /api
app.use((req, res, next) => {
  const isApiRoute = String(req.originalUrl || '').startsWith('/api/');
  const isMutableMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase());
  if (!isApiRoute || !isMutableMethod) return next();
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  if (!isJson) return next();

  const hasBodyByHeader = Number(req.headers['content-length'] || 0) > 0 || !!req.headers['transfer-encoding'];
  const hasBodyByObject = req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0;
  const hasBody = hasBodyByHeader || hasBodyByObject;
  if (!hasBody) return next();

  if (!isEncryptedEnvelope(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Payload JSON debe estar cifrado'
    });
  }

  try {
    req.body = deobfuscateAliasedBody(decryptPayloadEnvelope(req.body));
    return next();
  } catch (_error) {
    return res.status(400).json({
      success: false,
      error: 'No se pudo descifrar el payload'
    });
  }
});

// Sanitización
app.use(mongoSanitize());
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        try {
          req.body[key] = xss(req.body[key]);
        } catch (e) {
          // Ignorar errores de xss
        }
      }
    });
  }
  next();
});

// Compresión
app.use(compression());

// Logging (solo console, no archivos)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: { write: message => console.log(message.trim()) }
  }));
}

// Middleware de auditoría simplificado
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        const actor = req.user || {
          _id: null,
          username: 'anonymous',
          rol: 'anonymous'
        };
        registrarAccion(
          actor,
          `${req.method} ${req.originalUrl}`,
          req.baseUrl.split('/').pop() || 'unknown',
          {
            body: req.body,
            params: req.params,
            authContext: req.user ? 'authenticated' : 'anonymous'
          },
          req
        ).catch(err => console.error('Auditoría no crítica:', err.message));
      }
    });
  }
  next();
});

// Rutas
app.get('/api/security/bootstrap', (req, res) => {
  try {
    const publicChannel = endpointChannelService.issuePublicChannel(req);
    return res.json({
      success: true,
      data: {
        publicChannel
      },
      source: 'hardcoded-local'
    });
  } catch (_error) {
    return res.json({
      success: true,
      data: {
        publicChannel: {
          version: 'pubchan1',
          channelId: 'pch_local_fallback',
          serverNonce: 'sn_local_fallback',
          clientToken: 'ct_local_fallback',
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + (10 * 60 * 1000)).toISOString(),
          seq: 0
        }
      },
      source: 'hardcoded-local-fallback'
    });
  }
});

app.get('/api/runtime-environment', async (_req, res) => {
  const data = PUBLIC_RUNTIME_ENV_KEYS.reduce((acc, key) => {
    const value = process.env[key] || LOCAL_RUNTIME_ENV_DEFAULTS[key];
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = String(value);
    }
    return acc;
  }, {});

  return res.json({
    success: true,
    data,
    runtimeEnv: {
      loaded: true,
      lastLoadedAt: new Date()
    },
    source: 'hardcoded-local'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/escuelas', escuelaRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/informes', informeRoutes);
app.use('/api/forms', formEngineRoutes);
app.use('/api/form-engine', formEngineRoutes);

app.get('/api/schemas', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      escuela: {
        required: ['de', 'escuela', 'nivel', 'direccion', 'email', 'jornada', 'turno'],
        sample: {
          de: 'DE 01',
          escuela: 'Escuela Modelo',
          nivel: 'Primario',
          direccion: 'Calle Falsa 123, CABA',
          email: 'escuela@acdm.local',
          jornada: 'Simple',
          turno: 'Mañana'
        }
      },
      visita: {
        required: [],
        sample: {
          fecha: new Date().toISOString(),
          visitante: 'Supervisor Distrital',
          observaciones: 'Visita de seguimiento'
        }
      },
      proyecto: {
        required: ['nombre'],
        sample: {
          nombre: 'Proyecto de Inclusión',
          descripcion: 'Acompañamiento pedagógico',
          estado: 'En Progreso',
          fechaInicio: new Date().toISOString(),
          fechaBaja: null
        }
      },
      informe: {
        required: ['titulo'],
        sample: {
          titulo: 'Informe Trimestral',
          estado: 'Pendiente',
          fechaEntrega: new Date().toISOString(),
          observaciones: 'Sin observaciones'
        }
      },
      calendario: {
        query: {
          year: 'YYYY (opcional)',
          month: '1-12 (opcional)'
        }
      }
    }
  });
});

app.get('/api/dashboard', authMiddleware, generarDashboard);

// ──────────────────────────────────────────────────────
// 📅  CALENDARIO  – eventos del mes/año
// ──────────────────────────────────────────────────────
app.get('/api/calendario', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = parseInt(year, 10) || now.getFullYear();
    const m = parseInt(month, 10);
    const start = Number.isNaN(m)
      ? new Date(y, 0, 1)
      : new Date(y, m - 1, 1);
    const end = Number.isNaN(m)
      ? new Date(y + 1, 0, 1)
      : new Date(y, m, 1);

    const escuelas = await Escuela.find({}).select('escuela de visitas proyectos informes docentes').lean();
    const docentes = await Docente.find({ activo: true, estado: 'Licencia' })
      .populate('escuela', 'escuela de')
      .select('nombre apellido escuela fechaInicioLicencia fechaFinLicencia motivo')
      .lean();

    const eventos = [];

    escuelas.forEach(esc => {
      (esc.visitas || []).forEach(v => {
        const f = new Date(v.fecha);
        if (f >= start && f < end) {
          eventos.push({
            tipo: 'visita', fecha: v.fecha, escuela: esc.escuela, de: esc.de,
            descripcion: v.observaciones || 'Visita programada', id: v._id
          });
        }
      });
      (esc.proyectos || []).forEach(p => {
        const f = new Date(p.fechaInicio);
        if (f >= start && f < end) {
          eventos.push({
            tipo: 'proyecto', fecha: p.fechaInicio, escuela: esc.escuela, de: esc.de,
            descripcion: p.nombre, estado: p.estado, id: p._id
          });
        }
      });
      (esc.informes || []).forEach(i => {
        if (!i.fechaEntrega) return;
        const f = new Date(i.fechaEntrega);
        if (f >= start && f < end) {
          eventos.push({
            tipo: 'informe', fecha: i.fechaEntrega, escuela: esc.escuela, de: esc.de,
            descripcion: i.titulo, estado: i.estado, id: i._id
          });
        }
      });
    });

    docentes.forEach(d => {
      if (d.fechaFinLicencia) {
        const f = new Date(d.fechaFinLicencia);
        if (f >= start && f < end) {
          eventos.push({
            tipo: 'licencia', fecha: d.fechaFinLicencia,
            escuela: d.escuela?.escuela, de: d.escuela?.de,
            descripcion: `Fin licencia: ${d.apellido}, ${d.nombre} (${d.motivo || '-'})`, id: d._id
          });
        }
      }
    });

    eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    res.json({ success: true, data: eventos, periodo: { year: y, month: m || 'all' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener calendario' });
  }
});

// ──────────────────────────────────────────────────────
// 📄  EXPORTAR PDF global (via reportes/escuelas?formato=pdf)
// + alias de conveniencia
// ──────────────────────────────────────────────────────
app.get('/api/export/pdf', authMiddleware, (req, res) => {
  req.query.formato = 'pdf';
  res.redirect(307, '/api/reportes/escuelas?formato=pdf');
});

// ──────────────────────────────────────────────────────
// 👤  ADMIN – gestión de usuarios
// ──────────────────────────────────────────────────────
const requireAdmin = async (req, res, next) => {
  const deny = (status = 403) => res.status(status).json({
    success: false,
    error: 'Acceso restringido'
  });

  try {
    const userId = req.user?._id;
    if (!userId) {
      return deny(401);
    }

    const user = await User.findById(userId)
      .select('rol permisos')
      .lean();

    if (!user) {
      return deny();
    }

    const role = normalizeRole(user.rol || '');
    const permisos = Array.isArray(user.permisos) ? user.permisos : [];
    const hasAdminPrivileges = await isPrivilegedRole(role);
    const hasAdminPermissions = hasAdminAclPermissions(permisos);

    if (hasAdminPrivileges || hasAdminPermissions) {
      return next();
    }

    return deny();
  } catch (error) {
    return deny(500);
  }
};

const requireDeveloper = (req, res, next) => {
  const role = normalizeRole(req.user?.rol || '');
  if (role === 'desarrollador') return next();
  return res.status(403).json({
    success: false,
    error: 'Acceso restringido al rol desarrollador'
  });
};

const getPermissionCatalog = async () => {
  const fromStatic = [...STATIC_PERMISSION_CATALOG];

  await RolePolicy.ensureDefaults();
  const policies = await RolePolicy.getAllPolicies();
  const fromPolicies = (Array.isArray(policies) ? policies : [])
    .flatMap((policy) => (Array.isArray(policy?.defaultPermissions) ? policy.defaultPermissions : []))
    .map((permission) => normalizePermission(permission))
    .filter(Boolean);

  const users = await User.find({}).select('permisos').lean();
  const fromUsers = (Array.isArray(users) ? users : [])
    .flatMap((row) => (Array.isArray(row?.permisos) ? row.permisos : []))
    .map((permission) => normalizePermission(permission))
    .filter(Boolean);

  return Array.from(new Set([...fromStatic, ...fromPolicies, ...fromUsers]));
};

const getRoleCatalog = async () => {
  await RolePolicy.ensureDefaults();
  const fromStatic = [...STATIC_ROLE_CATALOG];
  const policies = await RolePolicy.getAllPolicies();
  const fromPolicies = (Array.isArray(policies) ? policies : [])
    .map((policy) => normalizeRole(policy?.role))
    .filter(Boolean);
  const users = await User.find({}).select('rol').lean();
  const fromUsers = (Array.isArray(users) ? users : [])
    .map((row) => normalizeRole(row?.rol))
    .filter(Boolean);
  return Array.from(new Set([...fromStatic, ...fromPolicies, ...fromUsers]));
};

const getRoleDefaultPermissions = async (role) => {
  const roleCatalog = await getRoleCatalog();
  const resolvedRole = resolveRoleFromTransport(role, roleCatalog) || normalizeRole(role);
  const policy = await RolePolicy.getByRole(resolvedRole);
  return Array.isArray(policy?.defaultPermissions) ? policy.defaultPermissions : [];
};

const sanitizePermissions = (rawPermissions, permissionCatalogSet) => {
  const source = Array.isArray(rawPermissions) ? rawPermissions : [];
  const catalog = Array.from(permissionCatalogSet || []);
  const normalized = source
    .map((permission) => resolvePermissionFromTransport(permission, catalog))
    .filter(Boolean);
  return Array.from(new Set(normalized))
    .filter((permission) => permission === '*' || permissionCatalogSet.has(permission));
};

// Listar usuarios
app.get('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    res.json({
      success: true,
      data: users.map((user) => buildAdminUserPayload(user)).filter(Boolean)
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al listar usuarios' });
  }
});

// Obtener usuario por ID
app.get('/api/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    const data = buildAdminUserPayload(user);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al obtener usuario' });
  }
});

// Crear usuario
app.post('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, password, email, nombre, apellido, rol, permisos } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ success: false, error: 'username, password y email son requeridos' });
    }
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ success: false, error: 'Usuario o email ya existe' });
    const targetRole = normalizeRole(rol || 'viewer');
    const roleCatalog = await getRoleCatalog();
    const resolvedTargetRole = resolveRoleFromTransport(targetRole, roleCatalog) || targetRole;
    const permissionCatalog = new Set(await getPermissionCatalog());
    const roleDefaultPermissions = await getRoleDefaultPermissions(resolvedTargetRole);
    const normalizedPerms = sanitizePermissions(
      Array.isArray(permisos) && permisos.length > 0 ? permisos : roleDefaultPermissions,
      permissionCatalog
    );

    const user = await User.create({
      username: String(username).trim().toLowerCase(),
      passwordHash: password,
      email: String(email).trim().toLowerCase(),
      nombre,
      apellido,
      rol: resolvedTargetRole, permisos: normalizedPerms
    });
    const safe = buildAdminUserPayload(user);
    res.status(201).json({ success: true, data: safe, message: 'Usuario creado exitosamente' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
});

// Acciones masivas de usuarios
app.post('/api/admin/users/bulk', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const action = String(req.body?.action || '').trim().toLowerCase();
    const sourceIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    const objectIds = Array.from(
      new Set(
        sourceIds
          .map((id) => String(id || '').trim())
          .filter((id) => /^[a-f0-9]{24}$/i.test(id))
      )
    ).map((id) => new ObjectId(id));

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Acción masiva inválida' });
    }

    if (objectIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe enviar al menos un usuario' });
    }

    const actorId = String(req.user?._id || '');
    const targetIds = objectIds.filter((id) => String(id) !== actorId);
    if (targetIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay usuarios válidos para procesar' });
    }

    let result;
    if (action === 'delete') {
      result = await User.deleteMany({ _id: { $in: targetIds } });
    } else {
      result = await User.updateMany(
        { _id: { $in: targetIds } },
        { $set: { isActive: action === 'activate' } }
      );
    }

    registrarAccion(
      req.user,
      `bulk_${action}`,
      'User',
      { total: targetIds.length, targetIds: targetIds.map(String) },
      req
    );

    const affected = Number(result?.modifiedCount ?? result?.deletedCount ?? 0);
    return res.json({
      success: true,
      data: { action, requested: targetIds.length, affected },
      message: `Acción masiva '${action}' ejecutada`
    });
  } catch (_error) {
    return res.status(500).json({ success: false, error: 'Error al ejecutar acción masiva de usuarios' });
  }
});

// Iniciar sesión como otro usuario (solo rol desarrollador)
app.post('/api/admin/users/:id/impersonate', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const actorRole = normalizeRole(req.user?.rol || '');
    if (actorRole !== 'desarrollador') {
      return res.status(403).json({
        success: false,
        error: 'Solo el rol desarrollador puede usar "entrar como usuario"'
      });
    }

    const targetUser = await User.findById(req.params.id).select('-passwordHash -refreshToken');
    if (!targetUser || targetUser.isActive === false) {
      return res.status(404).json({ success: false, error: 'Usuario objetivo no encontrado o inactivo' });
    }

    const { accessToken, refreshToken } = generateTokens(targetUser._id, targetUser.rol);
    const deviceInfo = SessionService.parseDeviceInfo(req);
    const impersonationContext = {
      actorId: String(req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      actorRole,
      targetId: String(targetUser._id),
      targetUsername: String(targetUser.username || ''),
      ts: new Date().toISOString()
    };

    await SessionService.createSession(targetUser, accessToken, refreshToken, {
      ...deviceInfo,
      impersonation: true,
      actorLookup: buildLookupKey('actor', impersonationContext.actorId || impersonationContext.actorUsername),
      context: encryptAclValue(JSON.stringify(impersonationContext))
    });

    const authUser = await buildAuthUserPayload(targetUser);
    registrarAccion(
      req.user,
      'impersonate_user',
      'User',
      { targetUserId: String(targetUser._id), targetUsername: targetUser.username },
      req
    );

    return res.json({
      success: true,
      data: {
        user: authUser,
        tokens: { access: accessToken, refresh: refreshToken },
        impersonation: {
          by: String(req.user?.username || ''),
          actorRole
        }
      }
    });
  } catch (_error) {
    return res.status(500).json({ success: false, error: 'No se pudo iniciar sesión como el usuario objetivo' });
  }
});

// Actualizar usuario
app.put('/api/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const current = await User.findById(req.params.id).select('_id');
    if (!current) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    const payload = req.body || {};
    const update = {};

    if (payload.username !== undefined) update.username = String(payload.username || '').trim().toLowerCase();
    if (payload.email !== undefined) update.email = String(payload.email || '').trim().toLowerCase();
    if (payload.nombre !== undefined) update.nombre = payload.nombre;
    if (payload.apellido !== undefined) update.apellido = payload.apellido;
    if (payload.password) update.passwordHash = payload.password;

    const permissionCatalog = new Set(await getPermissionCatalog());
    const roleCatalog = await getRoleCatalog();
    const requestedRole = payload.rol !== undefined
      ? (resolveRoleFromTransport(payload.rol || 'viewer', roleCatalog) || normalizeRole(payload.rol || 'viewer'))
      : null;
    const hasPermisosInPayload = Array.isArray(payload.permisos);

    if (requestedRole) {
      update.rol = requestedRole;
      if (!hasPermisosInPayload) {
        const rolePerms = await getRoleDefaultPermissions(requestedRole);
        update.permisos = sanitizePermissions(rolePerms, permissionCatalog);
      }
    }

    if (hasPermisosInPayload) {
      update.permisos = sanitizePermissions(payload.permisos, permissionCatalog);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
    }

    await User.updateOne({ _id: req.params.id }, { $set: update });
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    const data = buildAdminUserPayload(user);
    res.json({ success: true, data, message: 'Usuario actualizado exitosamente' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario
app.delete('/api/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, error: 'No puedes eliminar tu propio usuario' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    await User.deleteOne({ _id: user._id });
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
});

// Roles y permisos (plantillas para administración)
app.get('/api/admin/roles', authMiddleware, requireAdmin, requireDeveloper, async (_req, res) => {
  try {
    await RolePolicy.ensureDefaults();
    const users = await User.find({}).select('rol').lean();
    const byRole = users.reduce((acc, row) => {
      const role = normalizeRole(row?.rol || '');
      if (!role) return acc;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const policies = await RolePolicy.getAllPolicies();
    const roles = policies.map((policy) => ({
      role: normalizeRole(policy.role),
      totalUsers: byRole[policy.role] || 0,
      defaultPermissions: normalizePermissionsForResponse(policy.defaultPermissions || [])
    }));

    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener roles' });
  }
});

app.put('/api/admin/roles/:role/permisos', authMiddleware, requireAdmin, requireDeveloper, async (req, res) => {
  try {
    const roleCatalog = await getRoleCatalog();
    const role = resolveRoleFromTransport(req.params.role || '', roleCatalog);
    if (!role) {
      return res.status(400).json({ success: false, error: 'Rol inválido' });
    }
    await RolePolicy.ensureDefaults();
    const currentPolicy = await RolePolicy.getByRole(role);
    if (!currentPolicy) {
      return res.status(400).json({ success: false, error: 'Rol inválido' });
    }

    const catalog = new Set(await getPermissionCatalog());
    const nextPerms = sanitizePermissions(req.body?.permisos, catalog);

    await RolePolicy.updateOne(
      { $or: [{ roleLookup: RolePolicy.getRoleLookup(role) }, { role }] },
      { $set: { defaultPermissions: nextPerms } },
      { upsert: true }
    );

    if (req.body?.applyToUsers === true) {
      await User.updateMany(
        { $or: [{ rolLookup: User.getRoleLookup(role) }, { rol: role }] },
        { $set: { permisos: nextPerms } }
      );
    }

    res.json({
      success: true,
      data: { role: normalizeRole(role), defaultPermissions: normalizePermissionsForResponse(nextPerms) },
      message: 'Permisos del rol actualizados'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar permisos del rol' });
  }
});

app.post('/api/admin/roles/bulk/permisos', authMiddleware, requireAdmin, requireDeveloper, async (req, res) => {
  try {
    await RolePolicy.ensureDefaults();

    const operation = String(req.body?.operation || '').trim().toLowerCase();
    const validOperations = new Set(['add', 'remove', 'replace']);
    if (!validOperations.has(operation)) {
      return res.status(400).json({ success: false, error: 'Operación inválida. Use add, remove o replace' });
    }

    const roleCatalog = await getRoleCatalog();
    const roleNames = Array.from(new Set(
      (Array.isArray(req.body?.roles) ? req.body.roles : [])
        .map((role) => resolveRoleFromTransport(role, roleCatalog))
        .filter(Boolean)
    ));
    if (roleNames.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe seleccionar al menos un rol' });
    }

    const catalog = new Set(await getPermissionCatalog());
    const requestedPerms = sanitizePermissions(req.body?.permisos, catalog);
    if (requestedPerms.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe indicar al menos un permiso válido' });
    }

    const applyToUsers = req.body?.applyToUsers === true;
    const updatedRoles = [];

    for (const role of roleNames) {
      const currentPolicy = await RolePolicy.getByRole(role);
      if (!currentPolicy) continue;

      const currentPerms = Array.isArray(currentPolicy.defaultPermissions)
        ? currentPolicy.defaultPermissions
        : [];

      let nextPerms = currentPerms;
      if (operation === 'replace') {
        nextPerms = requestedPerms;
      } else if (operation === 'add') {
        nextPerms = Array.from(new Set([...currentPerms, ...requestedPerms]));
      } else if (operation === 'remove') {
        const removeSet = new Set(requestedPerms);
        nextPerms = currentPerms.filter((perm) => !removeSet.has(perm));
      }

      await RolePolicy.updateOne(
        { $or: [{ roleLookup: RolePolicy.getRoleLookup(role) }, { role }] },
        { $set: { defaultPermissions: nextPerms } },
        { upsert: true }
      );

      if (applyToUsers) {
        await User.updateMany(
          { $or: [{ rolLookup: User.getRoleLookup(role) }, { rol: role }] },
          { $set: { permisos: nextPerms } }
        );
      }

      updatedRoles.push({ role: normalizeRole(role), defaultPermissions: normalizePermissionsForResponse(nextPerms) });
    }

    registrarAccion(
      req.user,
      `bulk_role_permissions_${operation}`,
      'RolePolicy',
      { roles: roleNames, permisos: requestedPerms, applyToUsers, updatedCount: updatedRoles.length },
      req
    );

    return res.json({
      success: true,
      data: {
        operation,
        applyToUsers,
        requestedRoles: roleNames.length,
        updatedRoles: updatedRoles.length,
        roles: updatedRoles
      },
      message: 'Actualización masiva de permisos de rol completada'
    });
  } catch (_error) {
    return res.status(500).json({ success: false, error: 'Error al actualizar permisos en lote' });
  }
});

app.get('/api/admin/permisos', authMiddleware, requireAdmin, requireDeveloper, async (_req, res) => {
  try {
    const catalog = await getPermissionCatalog();
    const users = await User.find({}).select('permisos').lean();
    const byPerm = users.reduce((acc, row) => {
      const perms = Array.isArray(row?.permisos) ? row.permisos : [];
      perms.forEach((perm) => {
        const key = normalizePermission(perm);
        if (!key) return;
        acc[key] = (acc[key] || 0) + 1;
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: catalog.map((perm) => ({ permiso: normalizePermission(perm), assignedUsers: byPerm[perm] || 0 }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener permisos' });
  }
});

// Seguridad avanzada: tráfico, histórico, bans de IP y reglas
app.get('/api/admin/security/traffic/realtime', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await securityMonitorService.getTrafficRealtime();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener tráfico en tiempo real' });
  }
});

app.get('/api/admin/security/traffic/history', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 300;
    const data = await securityMonitorService.getTrafficHistory({ limit });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener histórico de tráfico' });
  }
});

app.post('/api/admin/security/traffic/realtime/clear', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await securityMonitorService.clearTrafficRealtime();
    registrarAccion(
      req.user,
      'security_traffic_realtime_clear',
      'SecurityTrafficEvent',
      { resetIpRows: data?.resetIpRows || 0, deletedRecentTrafficEvents: data?.deletedRecentTrafficEvents || 0 },
      req
    );
    res.json({ success: true, data, message: 'Tráfico en tiempo real limpiado' });
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Error al limpiar tráfico en tiempo real' });
  }
});

app.post('/api/admin/security/traffic/history/clear', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await securityMonitorService.clearTrafficHistory();
    registrarAccion(
      req.user,
      'security_traffic_history_clear',
      'SecurityTrafficEvent',
      { deletedTrafficEvents: data?.deletedTrafficEvents || 0 },
      req
    );
    res.json({ success: true, data, message: 'Histórico de tráfico limpiado' });
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Error al limpiar histórico de tráfico' });
  }
});

app.get('/api/admin/security/bans', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await securityMonitorService.getBannedIps();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener bans de IP' });
  }
});

app.post('/api/admin/security/bans', authMiddleware, requireAdmin, async (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  const minutes = parseInt(req.body?.minutes, 10) || 60;
  const reason = String(req.body?.reason || 'Ban manual por administrador');
  const permanent = Boolean(req.body?.permanent);

  if (!ip) {
    return res.status(400).json({ success: false, error: 'ip es requerido' });
  }

  try {
    const record = await securityMonitorService.blockIp(ip, { minutes, reason, permanent });
    registrarAccion(
      req.user,
      'security_ip_ban',
      'SecurityIpState',
      { ip, minutes, reason, permanent },
      req
    );
    res.status(201).json({
      success: true,
      data: {
        ip,
        manualBan: record.manualBan,
        blockedUntil: record.blockedUntil,
        reason: record.banReason
      },
      message: 'IP bloqueada'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al bloquear IP' });
  }
});

app.delete('/api/admin/security/bans/:ip', authMiddleware, requireAdmin, async (req, res) => {
  const ip = String(req.params.ip || '').trim();
  if (!ip) {
    return res.status(400).json({ success: false, error: 'ip es requerido' });
  }

  try {
    await securityMonitorService.unblockIp(ip);
    registrarAccion(
      req.user,
      'security_ip_unban',
      'SecurityIpState',
      { ip },
      req
    );
    res.json({ success: true, message: 'IP desbloqueada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al desbloquear IP' });
  }
});

app.get('/api/admin/security/rules', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await securityMonitorService.getRules();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener reglas de seguridad' });
  }
});

app.put('/api/admin/security/rules', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await securityMonitorService.setRules(req.body || {});
    registrarAccion(
      req.user,
      'security_rules_update',
      'SecurityRule',
      { updated: data },
      req
    );
    res.json({ success: true, data, message: 'Reglas de protección actualizadas' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar reglas de seguridad' });
  }
});

app.post('/api/admin/security/cleanup', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await securityMonitorService.cleanupNow({
      historyRetentionDays: req.body?.historyRetentionDays
    });
    registrarAccion(
      req.user,
      'security_cleanup_now',
      'Security',
      data,
      req
    );
    res.json({
      success: true,
      data,
      message: 'Limpieza de seguridad ejecutada'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al ejecutar limpieza de seguridad' });
  }
});

app.get('/api/admin/auditoria', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await consultarAuditoria({
      username: req.query.username,
      action: req.query.action,
      entity: req.query.entity,
      userId: req.query.userId,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit
    });
    res.json({ success: true, data });
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Error al consultar histórico de auditoría' });
  }
});

// Outbox: observabilidad y control manual
app.get('/api/admin/outbox/stats', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const data = await domainEventOutboxProcessor.getStats();
    res.json({ success: true, data });
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas del outbox' });
  }
});

app.get('/api/admin/outbox/events', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await domainEventOutboxProcessor.list({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit
    });
    res.json({ success: true, data });
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Error al listar eventos del outbox' });
  }
});

app.post('/api/admin/outbox/process-now', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await domainEventOutboxProcessor.processBatch();
    registrarAccion(
      req.user,
      'outbox_process_now',
      'DomainEventOutbox',
      data,
      req
    );
    res.json({ success: true, data, message: 'Batch de outbox procesado' });
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Error al procesar outbox manualmente' });
  }
});

app.post('/api/admin/outbox/requeue', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const fromStatus = String(req.body?.fromStatus || 'dead_letter');
    const data = await domainEventOutboxProcessor.requeue({ ids, fromStatus });
    registrarAccion(
      req.user,
      'outbox_requeue',
      'DomainEventOutbox',
      { fromStatus, ...data },
      req
    );
    res.json({ success: true, data, message: 'Eventos reencolados' });
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Error al reencolar eventos del outbox' });
  }
});

// Alias de compatibilidad para sesiones admin fuera de /api/auth
app.get('/api/admin/sessions', authMiddleware, requireAdmin, getAllActiveSessions);
app.delete('/api/admin/sessions/:sessionId', authMiddleware, requireAdmin, revokeSessionByAdmin);

// Admin: gestión de escuelas (incluye "Nueva Escuela")
app.get('/api/admin/escuelas', authMiddleware, requireAdmin, getEscuelas);
app.post('/api/admin/escuelas', authMiddleware, requireAdmin, validateEscuela, createEscuela);
app.get('/api/admin/escuelas/:id', authMiddleware, requireAdmin, getEscuelaById);
app.put('/api/admin/escuelas/:id', authMiddleware, requireAdmin, validateEscuela, updateEscuela);
app.delete('/api/admin/escuelas/:id', authMiddleware, requireAdmin, deleteEscuela);

app.get('/api/estadisticas', authMiddleware, async (req, res) => {
  try {
    const [escuelas, docentes, alumnos, visitas, proyectos, informes] = await Promise.all([
      Escuela.countDocuments({ estado: { $ne: 'inactiva' } }),
      Docente.countDocuments({ activo: true }),
      Alumno.countDocuments({ activo: true }),
      Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$visitas', []] } } } } }]),
      Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$proyectos', []] } } } } }]),
      Escuela.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$informes', []] } } } } }])
    ]);

    res.json({
      success: true,
      data: {
        escuelas,
        docentes,
        alumnos,
        visitas: visitas[0]?.total || 0,
        proyectos: proyectos[0]?.total || 0,
        informes: informes[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas globales' });
  }
});

app.get('/api/buscar', authMiddleware, async (req, res) => {
  try {
    const term = String(req.query.q || '').trim();
    if (!term) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(term, 'i');
    const escuelas = await Escuela.find({
      $or: [{ escuela: regex }, { de: regex }, { direccion: regex }]
    })
      .select('_id de escuela nivel direccion estado')
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: escuelas
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al realizar búsqueda' });
  }
});

app.get('/api/alertas', authMiddleware, async (req, res) => {
  try {
    const escuelas = await Escuela.find({})
      .populate({ path: 'docentes', match: { activo: true }, select: 'estado fechaFinLicencia nombre apellido' })
      .select('escuela de proyectos informes')
      .lean();

    const alerts = [];
    const now = new Date();
    const tenDays = new Date();
    tenDays.setDate(tenDays.getDate() + 10);

    escuelas.forEach(esc => {
      if (!esc.docentes || esc.docentes.length === 0) {
        alerts.push({
          id: `sin-docente-${esc._id}`,
          tipo: 'sin_docentes',
          severidad: 'alta',
          escuelaId: esc._id,
          escuela: esc.escuela,
          mensaje: 'Escuela sin docentes activos asignados'
        });
      }

      (esc.docentes || []).forEach(doc => {
        if (doc.estado === 'Licencia' && doc.fechaFinLicencia) {
          const end = new Date(doc.fechaFinLicencia);
          if (end >= now && end <= tenDays) {
            alerts.push({
              id: `licencia-${doc._id}`,
              tipo: 'licencia_proxima',
              severidad: 'media',
              escuelaId: esc._id,
              escuela: esc.escuela,
              mensaje: `Licencia próxima a vencer: ${doc.apellido || ''}, ${doc.nombre || ''}`.trim()
            });
          }
        }
      });
    });

    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener alertas' });
  }
});

app.post('/api/alertas/:id/acknowledge', authMiddleware, async (req, res) => {
  res.json({ success: true, message: 'Alerta marcada como revisada' });
});

app.get('/api/export/json', authMiddleware, async (req, res) => {
  try {
    const escuelas = await Escuela.find({})
      .populate({ path: 'docentes', match: { activo: true } })
      .populate({ path: 'alumnos', match: { activo: true } })
      .lean();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=acdm-export.json');
    res.send(JSON.stringify({ success: true, data: escuelas }, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al exportar JSON' });
  }
});

app.get('/api/export/csv', authMiddleware, async (req, res) => {
  try {
    const escuelas = await Escuela.find({}).select('de escuela nivel direccion estado').lean();
    const header = 'de,escuela,nivel,direccion,estado';
    const rows = escuelas.map(esc => {
      const values = [esc.de, esc.escuela, esc.nivel, esc.direccion, esc.estado].map(v =>
        `"${String(v ?? '').replace(/"/g, '""')}"`
      );
      return values.join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=acdm-export.csv');
    res.send([header, ...rows].join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al exportar CSV' });
  }
});

app.get('/api/export/html', authMiddleware, async (req, res) => {
  try {
    const escuelas = await Escuela.find({})
      .populate({ path: 'docentes', match: { activo: true } })
      .populate({ path: 'alumnos', match: { activo: true } })
      .lean();

    const rows = escuelas.map((esc) => `
      <tr>
        <td>${esc.de || ''}</td>
        <td>${esc.escuela || ''}</td>
        <td>${esc.nivel || ''}</td>
        <td>${(esc.docentes || []).length}</td>
        <td>${(esc.alumnos || []).length}</td>
        <td>${(esc.visitas || []).length}</td>
        <td>${(esc.proyectos || []).length}</td>
        <td>${(esc.informes || []).length}</td>
      </tr>
    `).join('');

    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ACDM Export HTML</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 16px; }
      h1 { margin-bottom: 6px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      th { background: #f4f4f4; }
    </style>
  </head>
  <body>
    <h1>Exportación ACDM</h1>
    <p>Generado: ${new Date().toISOString()}</p>
    <table>
      <thead>
        <tr>
          <th>DE</th>
          <th>Escuela</th>
          <th>Nivel</th>
          <th>Docentes</th>
          <th>Alumnos</th>
          <th>Visitas</th>
          <th>Proyectos</th>
          <th>Informes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=acdm-export.html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al exportar HTML' });
  }
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para enviar alertas por email (simplificado)
app.post('/api/send-alert-email', authMiddleware, async (req, res) => {
  try {
    const { to, subject, alerts, message } = req.body;

    if (!to || !alerts || alerts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Email destinatario y alertas son requeridos'
      });
    }

    const html = `
      <h1>Alertas del Sistema ACDM</h1>
      <p>Se han generado ${alerts.length} alertas</p>
      <p>${message || ''}</p>
    `;

    // If no email credentials configured, simulate success
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[EMAIL SIMULADO] Para: ${to} | Asunto: ${subject || 'Alertas del Sistema'} | Alertas: ${alerts.length}`);
      return res.status(200).json({
        success: true,
        message: `Email enviado a ${to}`,
        alertsCount: alerts.length,
        simulated: true
      });
    }

    await sendEmail(to, subject || 'Alertas del Sistema', html);

    res.status(200).json({
      success: true,
      message: `Email enviado a ${to}`,
      alertsCount: alerts.length
    });
  } catch (error) {
    console.error('Error sending alert email:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el email'
    });
  }
});

// Ruta de health check
app.get('/health', async (req, res) => {
  let connectionError = null;
  let dataSource = null;

  try {
    await ensureDbConnection();
    dataSource = getDataSource();
  } catch (error) {
    connectionError = error.message;
    console.error('Health check: No se pudo conectar a MongoDB:', error.message);
  }

  const isConnected = Boolean(dataSource?.isInitialized);

  const response = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: {
      status: isConnected ? 'connected' : 'disconnected',
      readyState: isConnected ? 1 : 0,
      host: process.env.MONGODB_URI ? 'configured' : 'N/A',
      name: 'mongodb',
      port: 'N/A',
      models: 'typeorm-mongo'
    },
    environment: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV,
    runtimeEnv: getRuntimeEnvState(),
    node: {
      version: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    }
  };

  // Agregar error si existe
  if (connectionError) {
    response.mongodb.error = connectionError;
  }

  res.status(200).json(response);
});

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ACDM Backend API',
    version: '1.0.0',
    environment: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV,
    endpoints: {
      auth: '/api/auth',
      escuelas: '/api/escuelas',
      docentes: '/api/docentes',
      alumnos: '/api/alumnos',
      reportes: '/api/reportes',
      health: '/health',
      test: '/api/test'
    }
  });
});

// ❌ ELIMINADO: Toda la lógica de archivos estáticos con fs
// En Vercel, el frontend se sirve por separado

// Manejo de 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejo de errores
app.use(errorHandler);

module.exports = app;
