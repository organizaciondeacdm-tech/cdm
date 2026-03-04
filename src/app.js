const express = require('express');
const mongoose = require('mongoose');
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

const app = express();

// Variable global para la conexión (patrón Singleton)
let connectionPromise = null;

const ensureDbConnection = async () => {
  if (!connectionPromise) {
    console.log('🔄 Inicializando conexión a MongoDB...');
    connectionPromise = connectDB().catch(err => {
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
    
    // Inicializar claves JWT después de conectar a DB
    if (!JwtKeyManager.initialized) {
      await JwtKeyManager.initialize();
    }
    
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

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Demasiadas peticiones, intente nuevamente más tarde',
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || 'default'
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
app.use('/api/auth', authRoutes);
app.use('/api/escuelas', escuelaRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/informes', informeRoutes);
app.use('/api/forms', formEngineRoutes);

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
          eventos.push({ tipo: 'visita', fecha: v.fecha, escuela: esc.escuela, de: esc.de,
            descripcion: v.observaciones || 'Visita programada', id: v._id });
        }
      });
      (esc.proyectos || []).forEach(p => {
        const f = new Date(p.fechaInicio);
        if (f >= start && f < end) {
          eventos.push({ tipo: 'proyecto', fecha: p.fechaInicio, escuela: esc.escuela, de: esc.de,
            descripcion: p.nombre, estado: p.estado, id: p._id });
        }
      });
      (esc.informes || []).forEach(i => {
        if (!i.fechaEntrega) return;
        const f = new Date(i.fechaEntrega);
        if (f >= start && f < end) {
          eventos.push({ tipo: 'informe', fecha: i.fechaEntrega, escuela: esc.escuela, de: esc.de,
            descripcion: i.titulo, estado: i.estado, id: i._id });
        }
      });
    });

    docentes.forEach(d => {
      if (d.fechaFinLicencia) {
        const f = new Date(d.fechaFinLicencia);
        if (f >= start && f < end) {
          eventos.push({ tipo: 'licencia', fecha: d.fechaFinLicencia,
            escuela: d.escuela?.escuela, de: d.escuela?.de,
            descripcion: `Fin licencia: ${d.apellido}, ${d.nombre} (${d.motivo || '-'})`, id: d._id });
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
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acceso restringido a administradores' });
  }
  next();
};

// Listar usuarios
app.get('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash').lean();
    res.json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al listar usuarios' });
  }
});

// Obtener usuario por ID
app.get('/api/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, data: user });
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
    const user = await User.create({ username, passwordHash: password, email, nombre, apellido,
      rol: rol || 'viewer', permisos: permisos || [] });
    const { passwordHash: _, ...safe } = user.toObject();
    res.status(201).json({ success: true, data: safe, message: 'Usuario creado exitosamente' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
});

// Actualizar usuario
app.put('/api/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const update = { ...rest };
    if (password) update.passwordHash = password;
    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, data: user, message: 'Usuario actualizado exitosamente' });
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
  
  try {
    // Intentar conectar a DB si no está conectada
    if (mongoose.connection.readyState === 0) {
      await ensureDbConnection();
    }
  } catch (error) {
    connectionError = error.message;
    console.error('Health check: No se pudo conectar a MongoDB:', error.message);
  }

  const mongoStatus = mongoose.connection.readyState;
  const mongoStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const response = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: {
      status: mongoStatusMap[mongoStatus] || 'unknown',
      readyState: mongoStatus,
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A',
      port: mongoose.connection.port || 'N/A',
      models: Object.keys(mongoose.connection.models).length
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
