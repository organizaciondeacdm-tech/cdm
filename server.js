require('dotenv').config();

const { createLogger } = require('./src/utils/logger');
const connectDB = require('./src/config/database');
const { getDataSource } = require('./src/config/typeorm');

const logger = createLogger({
  level: 'info',
  transports: [
    { type: 'console', format: 'simple' }
  ]
});

const PORT = process.env.PORT || 5000;
const DB_RETRY_INTERVAL_MS = 30000;

let dbRetryTimer = null;

const isDbConnected = () => {
  try {
    return getDataSource().isInitialized;
  } catch (_error) {
    return false;
  }
};

const scheduleDbReconnect = () => {
  if (dbRetryTimer) return;
  dbRetryTimer = setInterval(async () => {
    if (isDbConnected()) {
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

let server;
if (!process.env.VERCEL) {
  const startServer = async () => {
    let dbConnected = false;
    try {
      await connectDB();
      logger.info('Connected to MongoDB (TypeORM)');
      dbConnected = true;
    } catch (error) {
      logger.error('Initial MongoDB connection failed:', error.message);
      logger.warn('Starting server without MongoDB; retrying connection in background');
      scheduleDbReconnect();
    }

    try {
      const app = require('./src/app');
      server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        if (!dbConnected) {
          logger.warn('Server started in degraded mode (MongoDB disconnected)');
        }
        console.log(`Server started at http://localhost:${PORT}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error.message);
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

const gracefulShutdown = async () => {
  try {
    const ds = getDataSource();
    if (ds.isInitialized) {
      await ds.destroy();
    }
  } catch (_error) {
    // no-op
  }
  process.exit(0);
};

if (server) {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando servidor...');
    server.close(async () => {
      await gracefulShutdown();
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT recibido, cerrando servidor...');
    server.close(async () => {
      await gracefulShutdown();
    });
  });
}

process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  console.error('Error fatal:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', { reason, promise });
  console.error('Promesa rechazada:', reason);
});
