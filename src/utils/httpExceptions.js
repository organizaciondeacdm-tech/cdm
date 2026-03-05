class HttpException extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      details: this.details,
      type: this.name
    };
  }
}

// 4xx Client Errors
class BadRequest extends HttpException {
  constructor(message = 'Bad Request', details = null) {
    super(400, message, details);
  }
}

class Unauthorized extends HttpException {
  constructor(message = 'Unauthorized', details = null) {
    super(401, message, details);
  }
}

class Forbidden extends HttpException {
  constructor(message = 'Forbidden', details = null) {
    super(403, message, details);
  }
}

class NotFound extends HttpException {
  constructor(message = 'Not Found', details = null) {
    super(404, message, details);
  }
}

class MethodNotAllowed extends HttpException {
  constructor(message = 'Method Not Allowed', details = null) {
    super(405, message, details);
  }
}

class Conflict extends HttpException {
  constructor(message = 'Conflict', details = null) {
    super(409, message, details);
  }
}

class UnprocessableEntity extends HttpException {
  constructor(message = 'Unprocessable Entity', details = null) {
    super(422, message, details);
  }
}

class TooManyRequests extends HttpException {
  constructor(message = 'Too Many Requests', details = null) {
    super(429, message, details);
  }
}

// 5xx Server Errors
class InternalServerError extends HttpException {
  constructor(message = 'Internal Server Error', details = null) {
    super(500, message, details);
  }
}

class NotImplemented extends HttpException {
  constructor(message = 'Not Implemented', details = null) {
    super(501, message, details);
  }
}

class BadGateway extends HttpException {
  constructor(message = 'Bad Gateway', details = null) {
    super(502, message, details);
  }
}

class ServiceUnavailable extends HttpException {
  constructor(message = 'Service Unavailable', details = null) {
    super(503, message, details);
  }
}

class GatewayTimeout extends HttpException {
  constructor(message = 'Gateway Timeout', details = null) {
    super(504, message, details);
  }
}

module.exports = {
  HttpException,
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  MethodNotAllowed,
  Conflict,
  UnprocessableEntity,
  TooManyRequests,
  InternalServerError,
  NotImplemented,
  BadGateway,
  ServiceUnavailable,
  GatewayTimeout
};