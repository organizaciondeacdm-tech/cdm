const errorHandler = (err, req, res, next) => {
  // Usar console.error directamente, sin logger
  console.error({
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Errores específicos de MongoDB
  if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 400;
    message = 'Ya existe un registro con esos datos';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID inválido';
  }

  const response = {
    success: false,
    error: message,
    type: err.name || 'Error',
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    response.details = {
      name: err.name,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      hostname: err.hostname,
      stack: err.stack,
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'unknown',
      jwtSecretDefined: !!process.env.JWT_SECRET,
      jwtRefreshSecretDefined: !!process.env.JWT_REFRESH_SECRET,
      mongoUriDefined: !!process.env.MONGODB_URI
    };
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
