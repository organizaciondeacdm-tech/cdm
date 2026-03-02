/**
 * Middleware para verificar y gestionar conexión a MongoDB
 */

const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

let dbConnectionStatus = {
  connected: false,
  lastAttempt: null,
  attemptCount: 0
};

const checkMongoDBConnection = async (req, res, next) => {
  try {
    const readyState = mongoose.connection.readyState;
    
    // 0 = disconnected
    // 1 = connected
    // 2 = connecting
    // 3 = disconnecting
    
    if (readyState === 1) {
      // Conectado correctamente
      dbConnectionStatus.connected = true;
      dbConnectionStatus.lastAttempt = new Date();
      req.db = {
        connected: true,
        state: 'connected'
      };
      next();
    } else if (readyState === 2) {
      // Esperando conexión - permitir que continúe
      logger.warn('MongoDB está conectando...');
      req.db = {
        connected: false,
        state: 'connecting'
      };
      next();
    } else {
      // Desconectado - permitir acceso de todas formas pero con advertencia
      logger.warn('MongoDB desconectado. Intentando usar BD...');
      req.db = {
        connected: false,
        state: 'disconnected'
      };
      next();
    }
  } catch (error) {
    logger.error('Error checking MongoDB connection:', error.message);
    // Permitir que continúe para evitar bloquear todas las solicitudes
    req.db = { connected: false };
    next();
  }
};

const mongoErrorHandler = (error, req, res, next) => {
  if (error.name === 'MongoNetworkError') {
    logger.error('MongoDB Network Error:', error.message);
    return res.status(503).json({
      success: false,
      error: 'Error de conexión a la base de datos'
    });
  }
  
  if (error.name === 'MongoAuthenticationError') {
    logger.error('MongoDB Auth Error:', error.message);
    return res.status(503).json({
      success: false,
      error: 'Error de autenticación con la base de datos'
    });
  }

  if (error.name === 'MongoServerError' && error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      error: `${field} ya existe`
    });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: messages
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'ID inválido'
    });
  }

  next(error);
};

const getDBStatus = (req, res) => {
  res.json({
    success: true,
    data: {
      connected: dbConnectionStatus.connected,
      readyState: mongoose.connection.readyState,
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      lastAttempt: dbConnectionStatus.lastAttempt,
      connectionState: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }[mongoose.connection.readyState]
    }
  });
};

module.exports = {
  checkMongoDBConnection,
  mongoErrorHandler,
  getDBStatus,
  dbConnectionStatus
};
