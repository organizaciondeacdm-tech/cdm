const requiredByEnv = {
  development: ['MONGODB_URI', 'JWT_SECRET', 'CORS_ORIGIN'],
  staging: ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CORS_ORIGIN', 'ENCRYPTION_KEY'],
  production: ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CORS_ORIGIN', 'ENCRYPTION_KEY']
};

function normalizeNodeEnv(raw) {
  if (!raw) return 'development';
  if (raw === 'prod') return 'production';
  return raw;
}

function validateEnv(env = process.env) {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const required = requiredByEnv[nodeEnv] || requiredByEnv.development;

  const missing = required.filter((key) => !env[key] || !String(env[key]).trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables (${nodeEnv}): ${missing.join(', ')}`);
  }

  const rateLimitWindow = Number(env.RATE_LIMIT_WINDOW || 15);
  const rateLimitMax = Number(env.RATE_LIMIT_MAX || 100);

  if (Number.isNaN(rateLimitWindow) || Number.isNaN(rateLimitMax)) {
    throw new Error('RATE_LIMIT_WINDOW and RATE_LIMIT_MAX must be numeric');
  }

  let encryptionKey = env.ENCRYPTION_KEY;
  if (!encryptionKey && nodeEnv === 'development') {
    encryptionKey = `${env.JWT_SECRET}-dev-fallback`;
  }

  return {
    nodeEnv,
    port: Number(env.PORT || 5000),
    mongoUri: env.MONGODB_URI,
    jwtSecret: env.JWT_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    corsOrigin: env.CORS_ORIGIN,
    encryptionKey,
    rateLimitWindow,
    rateLimitMax
  };
}

module.exports = {
  validateEnv
};
