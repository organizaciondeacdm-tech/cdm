const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const path = require('path');
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

const app = express();

// Flag para rastrear inicialización
let dbInitialized = false;
let dbInitializing = false;

// Middleware para inicializar conexión a MongoDB en la primera solicitud
app.use(async (req, res, next) => {
  if (!dbInitialized && !dbInitializing) {
    dbInitializing = true;
    try {
      await connectDB();
      dbInitialized = true;
      dbInitializing = false;
    } catch (error) {
      dbInitializing = false;
      console.error('Failed to connect to database:', error.message);
      // Continuar de todas formas para permitir rutas de health check
    }
  }
  next();
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
  message: 'Demasiadas peticiones, intente nuevamente más tarde'
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
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
});

// Compresión
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// Middleware de auditoría
app.use((req, res, next) => {
  const oldJson = res.json;
  res.json = function(data) {
    // Log de acciones importantes
    if (req.method !== 'GET' && res.statusCode < 400) {
      registrarAccion(
        req.user,
        `${req.method} ${req.originalUrl}`,
        req.baseUrl.split('/').pop(),
        { body: req.body, params: req.params, query: req.query },
        req
      );
    }
    oldJson.call(this, data);
  };
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/escuelas', escuelaRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/reportes', reporteRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
  });
}

// Manejo de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

module.exports = app;