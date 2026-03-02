const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv } = require('../src/config/env');

test('development env accepts fallback encryption key', () => {
  const config = validateEnv({
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://localhost:27017/dev',
    JWT_SECRET: 'dev-secret',
    CORS_ORIGIN: 'http://localhost:3000'
  });

  assert.equal(config.nodeEnv, 'development');
  assert.ok(config.encryptionKey.includes('dev-fallback'));
});

test('staging env requires encryption and refresh secrets', () => {
  assert.throws(() => validateEnv({
    NODE_ENV: 'staging',
    MONGODB_URI: 'mongodb://localhost:27017/staging',
    JWT_SECRET: 'staging-secret',
    CORS_ORIGIN: 'https://staging.example.com'
  }));

  const config = validateEnv({
    NODE_ENV: 'staging',
    MONGODB_URI: 'mongodb://localhost:27017/staging',
    JWT_SECRET: 'staging-secret',
    JWT_REFRESH_SECRET: 'staging-refresh',
    ENCRYPTION_KEY: 'staging-encryption',
    CORS_ORIGIN: 'https://staging.example.com'
  });

  assert.equal(config.nodeEnv, 'staging');
});

test('production env enforces numeric limits', () => {
  assert.throws(() => validateEnv({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://localhost:27017/prod',
    JWT_SECRET: 'prod-secret',
    JWT_REFRESH_SECRET: 'prod-refresh',
    ENCRYPTION_KEY: 'prod-encryption',
    CORS_ORIGIN: 'https://app.example.com',
    RATE_LIMIT_WINDOW: 'bad-value',
    RATE_LIMIT_MAX: '100'
  }));

  const config = validateEnv({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://localhost:27017/prod',
    JWT_SECRET: 'prod-secret',
    JWT_REFRESH_SECRET: 'prod-refresh',
    ENCRYPTION_KEY: 'prod-encryption',
    CORS_ORIGIN: 'https://app.example.com',
    RATE_LIMIT_WINDOW: '20',
    RATE_LIMIT_MAX: '250'
  });

  assert.equal(config.rateLimitWindow, 20);
  assert.equal(config.rateLimitMax, 250);
});
