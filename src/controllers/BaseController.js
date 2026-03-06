class BaseController {
  static handle(fn, { defaultMessage = 'Error interno del servidor', defaultStatus = 500 } = {}) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        if (res.headersSent) return;

        const isDuplicateKey = Number(error?.code) === 11000;
        const status = Number(error?.statusCode || error?.status || (isDuplicateKey ? 400 : defaultStatus)) || 500;
        const normalizedStatus = status >= 400 ? status : 500;
        const message = isDuplicateKey ? 'Registro duplicado' : (error?.message || defaultMessage);

        const payload = {
          success: false,
          error: message
        };

        if (process.env.NODE_ENV === 'development' && error?.stack) {
          payload.debug = { name: error.name, stack: error.stack };
        }

        res.status(normalizedStatus).json(payload);
      }
    };
  }

  static ok(res, data, message) {
    const payload = { success: true };
    if (data !== undefined) payload.data = data;
    if (message) payload.message = message;
    return res.json(payload);
  }

  static created(res, data, message) {
    const payload = { success: true };
    if (data !== undefined) payload.data = data;
    if (message) payload.message = message;
    return res.status(201).json(payload);
  }

  static parsePagination(query = {}, { defaultPage = 1, defaultLimit = 20, maxLimit = 200 } = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || defaultPage);
    const requestedLimit = Number.parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(Math.max(1, requestedLimit), maxLimit);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }
}

module.exports = BaseController;
