const winston = require('winston');

const transports = [
  new winston.transports.Console({
    format: winston.format.simple()
  })
];

if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.File({ filename: 'logs/entities.log' }),
    new winston.transports.File({ filename: 'logs/entities-error.log', level: 'error' })
  );
}

const logger = winston.createLogger({
  level: process.env.ENTITY_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports
});

const summarizeChanges = (changes = {}) => {
  if (!changes || typeof changes !== 'object') return {};
  const keys = Object.keys(changes).slice(0, 30);
  return keys.reduce((acc, key) => {
    const value = changes[key];
    acc[key] = typeof value === 'object' ? '[object]' : value;
    return acc;
  }, {});
};

const logEntityEvent = ({
  entity,
  operation,
  documentId,
  actorId,
  changes,
  metadata
}) => {
  const payload = {
    entity,
    operation,
    documentId: documentId ? String(documentId) : null,
    actorId: actorId ? String(actorId) : null,
    changes: summarizeChanges(changes),
    metadata: metadata || {}
  };

  logger.info(payload);
};

const logEntityError = ({ entity, operation, error, metadata }) => {
  logger.error({
    entity,
    operation,
    message: error?.message,
    stack: error?.stack,
    metadata: metadata || {}
  });
};

module.exports = {
  logEntityEvent,
  logEntityError
};
