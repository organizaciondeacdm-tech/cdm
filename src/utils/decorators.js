const { InternalServerError } = require('./httpExceptions');

class TryCatchDecorator {
  /**
   * Decorator para manejar try-catch en controladores
   * @param {Function} fn - Función del controlador
   * @returns {Function} - Función envuelta con manejo de errores
   */
  static handle(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        console.error(`Error in ${fn.name}:`, error);

        // Si es una HttpException, usar su respuesta
        if (error instanceof require('./httpExceptions').HttpException) {
          return res.status(error.statusCode).json(error.toJSON());
        }

        // Para otros errores, devolver Internal Server Error con debug
        const debugInfo = process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : null;

        const internalError = new InternalServerError(
          'Error interno del servidor',
          debugInfo
        );

        res.status(internalError.statusCode).json(internalError.toJSON());
      }
    };
  }

  /**
   * Decorator para métodos de clase
   * @param {Object} target - Clase
   * @param {string} propertyKey - Nombre del método
   * @param {PropertyDescriptor} descriptor - Descriptor de la propiedad
   */
  static method(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`Error in ${propertyKey}:`, error);

        // Re-lanzar el error para que sea manejado por el caller
        throw error;
      }
    };

    return descriptor;
  }

  /**
   * Middleware para Express que envuelve rutas con try-catch
   * @param {Function} fn - Función middleware
   * @returns {Function} - Middleware envuelto
   */
  static middleware(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        console.error('Middleware error:', error);
        next(error); // Pasar al siguiente middleware de error
      }
    };
  }
}

module.exports = TryCatchDecorator;