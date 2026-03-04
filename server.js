require('dotenv').config();

const mongoose = require('mongoose');
const winston = require('winston');
const connectDB = require('./src/config/database');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const PORT = process.env.PORT || 5000;
const DB_RETRY_INTERVAL_MS = 30000;

let dbRetryTimer = null;

const scheduleDbReconnect = () => {
  if (dbRetryTimer) return;
  dbRetryTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      clearInterval(dbRetryTimer);
      dbRetryTimer = null;
      return;
    }

    try {
      await connectDB();
      logger.info('MongoDB reconectado exitosamente');
      clearInterval(dbRetryTimer);
      dbRetryTimer = null;
    } catch (error) {
      logger.warn(`Reintento de MongoDB falló: ${error.message}`);
    }
  }, DB_RETRY_INTERVAL_MS);
};

// Solo iniciar el servidor si NO estamos en Vercel
let server;
if (!process.env.VERCEL) {
  const startServer = async () => {
    let dbConnected = false;
    try {
      // Intentar conectar a MongoDB antes de iniciar el servidor
      await connectDB();
      logger.info('Connected to MongoDB');
      dbConnected = true;
    } catch (error) {
      logger.error('Initial MongoDB connection failed:', error.message);
      logger.warn('Starting server without MongoDB; retrying connection in background');
      scheduleDbReconnect();
    }

    try {
      // Cargar app después de intento de conexión para aprovechar env de Mongo cuando esté disponible
      const app = require('./src/app');
      server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        if (!dbConnected) {
          logger.warn('Server started in degraded mode (MongoDB disconnected)');
        }
        console.log(`🚀 Server started at http://localhost:${PORT}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error.message);
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

// Manejo de señales de terminación (solo si el servidor está corriendo)
if (server) {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando servidor...');
    server.close(() => {
      mongoose.connection.close(false, () => {
        logger.info('Servidor y conexión a DB cerrados');
        process.exit(0);
      });
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT recibido, cerrando servidor...');
    server.close(() => {
      mongoose.connection.close(false, () => {
        logger.info('Servidor y conexión a DB cerrados');
        process.exit(0);
      });
    });
  });
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  console.error('🔥 Error fatal:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', { reason, promise });
  console.error('🔥 Promesa rechazada:', reason);
});
