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

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const escuelaRoutes = require('./routes/escuelaRoutes');
const docenteRoutes = require('./routes/docenteRoutes');
const alumnoRoutes = require('./routes/alumnoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const { sendEmail } = require('./services/emailService');

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
  // Rutas que NO necesitan DB
  const publicRoutes = ['/auth/login', '/auth/refresh-token', '/test', '/health'];
  
  if (publicRoutes.some(route => req.path.includes(route))) {
    return next();
  }

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

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para enviar alertas por email (simplificado)
app.post('/api/send-alert-email', async (req, res) => {
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
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV
  });
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
