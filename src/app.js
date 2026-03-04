const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { registrarAccion } = require('./services/auditoriaService');
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
const RolePolicy = require('./models/RolePolicy');
const { isPrivilegedRole } = require('./services/privilegedRoleService');
const { normalizeRole, normalizePermission } = require('./utils/accessControlCrypto');

const app = express();
const PUBLIC_RUNTIME_ENV_KEYS = ['VITE_API_URL', 'VITE_AUTH_STORAGE_SECRET'];
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
  'gestionar_usuarios',
  'gestionar_roles_permisos',
  'gestionar_seguridad',
  'ver_sesiones_admin'
].map((permission) => normalizePermission(permission)).filter(Boolean);

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
  if (req.method !== 'GET' && req.user) {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        registrarAccion(
          req.user,
          `${req.method} ${req.originalUrl}`,
          req.baseUrl.split('/').pop() || 'unknown',
          { body: req.body, params: req.params },
          req
        ).catch(err => console.error('Auditoría no crítica:', err.message));
      }
    });
  }
  next();
});

// Rutas
app.get('/api/runtime-environment', async (_req, res) => {
  try {
    const data = PUBLIC_RUNTIME_ENV_KEYS.reduce((acc, key) => {
      const value = process.env[key];
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = String(value);
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data,
      runtimeEnv: getRuntimeEnvState()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener runtime environment'
    });
  }
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
    const permisosSet = new Set(permisos.map((p) => normalizePermission(p)));
    const hasAdminPrivileges = await isPrivilegedRole(role);
    const hasAdminPermissions = (
      permisosSet.has('*') ||
      permisosSet.has('gestionar_usuarios') ||
      permisosSet.has('gestionar_roles_permisos') ||
      permisosSet.has('gestionar_seguridad') ||
      permisosSet.has('ver_sesiones_admin')
    );

    if (hasAdminPrivileges || hasAdminPermissions) {
      return next();
    }

    return deny();
  } catch (error) {
    return deny(500);
  }
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

const getRoleDefaultPermissions = async (role) => {
  const policy = await RolePolicy.getByRole(normalizeRole(role));
  return Array.isArray(policy?.defaultPermissions) ? policy.defaultPermissions : [];
};

const sanitizePermissions = (rawPermissions, permissionCatalogSet) => {
  const source = Array.isArray(rawPermissions) ? rawPermissions : [];
  const normalized = source
    .map((permission) => normalizePermission(permission))
    .filter(Boolean);
  return Array.from(new Set(normalized))
    .filter((permission) => permission === '*' || permissionCatalogSet.has(permission));
};

// Listar usuarios
app.get('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    res.json({ success: true, data: users.map((user) => user.toObject()) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al listar usuarios' });
  }
});

// Obtener usuario por ID
app.get('/api/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, data: user.toObject() });
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
    const permissionCatalog = new Set(await getPermissionCatalog());
    const roleDefaultPermissions = await getRoleDefaultPermissions(targetRole);
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
      rol: targetRole, permisos: normalizedPerms
    });
    const safe = user.toObject();
    delete safe.passwordHash;
    res.status(201).json({ success: true, data: safe, message: 'Usuario creado exitosamente' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
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
    const requestedRole = payload.rol !== undefined ? normalizeRole(payload.rol || 'viewer') : null;
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
    res.json({ success: true, data: user.toObject(), message: 'Usuario actualizado exitosamente' });
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
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
});

// Roles y permisos (plantillas para administración)
app.get('/api/admin/roles', authMiddleware, requireAdmin, async (_req, res) => {
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
      role: policy.role,
      totalUsers: byRole[policy.role] || 0,
      defaultPermissions: policy.defaultPermissions || []
    }));

    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener roles' });
  }
});

app.put('/api/admin/roles/:role/permisos', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const role = normalizeRole(req.params.role || '');
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
      data: { role, defaultPermissions: nextPerms },
      message: 'Permisos del rol actualizados'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar permisos del rol' });
  }
});

app.get('/api/admin/permisos', authMiddleware, requireAdmin, async (_req, res) => {
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
      data: catalog.map((perm) => ({ permiso: perm, assignedUsers: byPerm[perm] || 0 }))
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
    res.json({
      success: true,
      data,
      message: 'Limpieza de seguridad ejecutada'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al ejecutar limpieza de seguridad' });
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
