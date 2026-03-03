const errorHandler = (err, req, res, next) => {
  // Usar console.error directamente, sin logger
  console.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
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
    error: message
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
