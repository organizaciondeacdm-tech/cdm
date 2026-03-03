const winston = require('winston');

// Detectar si estamos en Vercel
const isVercel = process.env.VERCEL === '1';

// Configuración base del logger - SOLO CONSOLE en Vercel
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Siempre usar console transport (funciona en todos lados)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
