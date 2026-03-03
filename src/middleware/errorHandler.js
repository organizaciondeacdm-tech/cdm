const errorHandler = (err, req, res, next) => {
  // SOLO console.error, sin Winston
  console.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = errorHandler;
