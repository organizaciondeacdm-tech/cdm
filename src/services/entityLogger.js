const { createLogger } = require('./../utils/logger');

// Console: 'warn' by default so routine create/update events don't flood stdout.
// Set ENTITY_LOG_LEVEL=info (or debug) to see full entity audit in console.
// File transports always capture at 'info' for the audit trail.
const consoleLevel = process.env.ENTITY_LOG_LEVEL || 'warn';

const transports = [
  { type: 'console', format: 'simple', level: consoleLevel }
];

if (!process.env.VERCEL) {
  transports.push(
    { type: 'file', filename: 'logs/entities.log', level: 'info' },
    { type: 'file', filename: 'logs/entities-error.log', level: 'error' }
  );
}

const logger = createLogger({
  level: 'info',
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
