const mongoose = require('mongoose');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const { loadRuntimeEnvFromMongo } = require('./runtimeEnv');

// Crear directorio de logs si no existe (solo en desarrollo)
const logsDir = path.join(__dirname, '../../logs');
if (!process.env.VERCEL && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configurar logger según el entorno
const transports = [
  new winston.transports.Console({
    format: winston.format.simple()
  })
];

// Solo agregar archivo de logs fuera de Vercel
if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports
});

let isConnecting = false;
let isConnected = false;

const connectDB = async () => {
  // Evitar conexiones múltiples
  if (isConnecting || isConnected) {
    return mongoose.connection;
  }

  isConnecting = true;

  try {
    // Skip connection if already connected
    if (mongoose.connection.readyState === 1) {
      isConnecting = false;
      isConnected = true;
      return mongoose.connection;
    }

    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      logger.error('MONGODB_URI not defined in environment variables');
      throw new Error('MONGODB_URI environment variable is required');
    }

    // Log la URI (sin credenciales completas)
    const uriLog = mongoUri.replace(/:[^:@]*@/, ':****@');
    logger.info(`Connecting to MongoDB: ${uriLog}`);

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 2,
      family: 4,
      retryWrites: true,
      w: 'majority'
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    isConnected = true;

    // Cargar configuración de entorno desde MongoDB (tiene prioridad sobre .env)
    try {
      await loadRuntimeEnvFromMongo({ override: true, logger });
    } catch (runtimeEnvError) {
      logger.warn(`Runtime env from MongoDB not loaded: ${runtimeEnvError.message}`);
    }
    
    // Eventos de conexión
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    isConnecting = false;
    return conn;
  } catch (error) {
    logger.error('Database connection error:', error.message);
    isConnecting = false;
    isConnected = false;
    throw error;
  }
};

module.exports = connectDB;
