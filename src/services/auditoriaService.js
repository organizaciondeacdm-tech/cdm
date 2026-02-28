const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/auditoria.log' }),
    new winston.transports.File({ filename: 'logs/auditoria-error.log', level: 'error' })
  ]
});

const registrarAccion = (usuario, accion, entidad, detalles, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    usuario: {
      id: usuario?._id,
      username: usuario?.username,
      rol: usuario?.rol
    },
    accion,
    entidad,
    detalles,
    ip: req?.ip || 'N/A',
    userAgent: req?.get('user-agent') || 'N/A',
    metodo: req?.method,
    url: req?.originalUrl
  };

  logger.info(logEntry);
};

const registrarError = (error, usuario, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    usuario: usuario ? {
      id: usuario._id,
      username: usuario.username
    } : null,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    ip: req?.ip,
    url: req?.originalUrl,
    metodo: req?.method
  };

  logger.error(logEntry);
};

const consultarAuditoria = async (filtros = {}) => {
  // Esta función leería del archivo de logs y filtraría
  // Implementación básica
  return [];
};

module.exports = {
  registrarAccion,
  registrarError,
  consultarAuditoria
};