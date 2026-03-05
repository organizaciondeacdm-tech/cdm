const { createLogger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { initializeDataSource } = require('./typeorm');
const { loadRuntimeEnvFromMongo } = require('./runtimeEnv');

const logsDir = path.join(__dirname, '../../logs');
if (!process.env.VERCEL && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const transports = [
  { type: 'console', format: 'simple' }
];

if (!process.env.VERCEL) {
  transports.push(
    { type: 'file', filename: 'logs/error.log', level: 'error' },
    { type: 'file', filename: 'logs/combined.log' }
  );
}

const logger = createLogger({
  level: 'info',
  transports
});

let connectingPromise = null;

const connectDB = async () => {
  if (!connectingPromise) {
    connectingPromise = initializeDataSource(logger)
      .then(async (ds) => {
        try {
          await loadRuntimeEnvFromMongo({ override: true, logger });
        } catch (runtimeEnvError) {
          logger.warn(`Runtime env from MongoDB not loaded: ${runtimeEnvError.message}`);
        }
        return ds;
      })
      .catch((error) => {
        connectingPromise = null;
        logger.error('Database connection error:', error.message);
        throw error;
      });
  }

  return connectingPromise;
};

module.exports = connectDB;
