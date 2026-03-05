const { createLogger } = require('./../utils/logger');
const AuditEvent = require('../models/AuditEvent');

// Configurar logger según el entorno
const transports = [
  { type: 'console', format: 'simple' }
];

// Solo agregar archivos de logs fuera de Vercel
if (!process.env.VERCEL) {
  transports.push(
    { type: 'file', filename: 'logs/auditoria.log' },
    { type: 'file', filename: 'logs/auditoria-error.log', level: 'error' }
  );
}

const logger = createLogger({
  level: 'info',
  transports
});

const sanitizeLimit = (value, fallback = 100, max = 500) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, parsed);
};

const registrarAccion = async (usuario, accion, entidad, detalles, req) => {
  // En Vercel, mantener traza por consola y persistir en DB (sin depender de archivos locales)
  if (process.env.VERCEL) {
    console.log(`[Auditoria] ${accion} - ${entidad}`, {
      usuario: usuario?.username,
      ip: req?.ip
    });
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    usuario: {
      id: usuario?._id,
      username: usuario?.username,
      rol: usuario?.rol
    },
    accion,
    entidad,
    detalles,
    ip: req?.ip || 'N/A',
    userAgent: req?.get('user-agent') || 'N/A',
    metodo: req?.method,
    url: req?.originalUrl
  };

  logger.info(logEntry);
  try {
    await AuditEvent.create({
      timestamp: logEntry.timestamp,
      userId: logEntry.usuario?.id || null,
      username: logEntry.usuario?.username || 'sistema',
      role: logEntry.usuario?.rol || 'unknown',
      action: logEntry.accion,
      entity: logEntry.entidad,
      details: logEntry.detalles || {},
      ip: logEntry.ip,
      userAgent: logEntry.userAgent,
      method: logEntry.metodo,
      url: logEntry.url
    });
  } catch (persistError) {
    logger.error({
      message: 'No se pudo persistir evento de auditoría',
      error: persistError?.message
    });
  }
};

const registrarError = (error, usuario, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    usuario: usuario ? {
      id: usuario._id,
      username: usuario.username
    } : null,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    ip: req?.ip,
    url: req?.originalUrl,
    metodo: req?.method
  };

  logger.error(logEntry);
};

const consultarAuditoria = async (filtros = {}) => {
  const limit = sanitizeLimit(filtros.limit, 100, 500);
  const page = Math.max(1, Number.parseInt(filtros.page, 10) || 1);
  const skip = (page - 1) * limit;

  const query = {};
  const username = String(filtros.username || '').trim().toLowerCase();
  const action = String(filtros.action || '').trim().toLowerCase();
  const entity = String(filtros.entity || '').trim();
  const userId = String(filtros.userId || '').trim();
  const from = filtros.from ? new Date(filtros.from) : null;
  const to = filtros.to ? new Date(filtros.to) : null;

  if (username) query.username = { $regex: username, $options: 'i' };
  if (action) query.action = { $regex: action, $options: 'i' };
  if (entity) query.entity = { $regex: entity, $options: 'i' };
  if (userId) query.userId = userId;

  if (from || to) {
    query.timestamp = {};
    if (from && !Number.isNaN(from.getTime())) query.timestamp.$gte = from;
    if (to && !Number.isNaN(to.getTime())) query.timestamp.$lte = to;
    if (Object.keys(query.timestamp).length === 0) delete query.timestamp;
  }

  const [rows, total] = await Promise.all([
    AuditEvent.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditEvent.countDocuments(query)
  ]);

  return {
    rows: Array.isArray(rows) ? rows : [],
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
};

module.exports = {
  registrarAccion,
  registrarError,
  consultarAuditoria
};
