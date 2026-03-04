const SecurityIpState = require('../models/SecurityIpState');
const SecurityRule = require('../models/SecurityRule');
const SecurityTrafficEvent = require('../models/SecurityTrafficEvent');
const AuthThrottle = require('../models/AuthThrottle');

const DEFAULT_RULES = {
  globalWindowMs: 15 * 60 * 1000,
  globalMaxRequests: 300,
  burstWindowMs: 10 * 1000,
  burstMaxRequests: 60,
  autoBanMinutes: 30,
  historyLimit: 5000,
  historyRetentionDays: 30
};

// IPs that are never subject to rate-limiting or bans (loopback / dev)
const WHITELISTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  'localhost'
]);

const isWhitelisted = (ip) => WHITELISTED_IPS.has(ip);

const getIp = (req) => String(
  req.headers['x-forwarded-for']?.split(',')[0] ||
  req.headers['x-real-ip'] ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress ||
  req.ip ||
  'unknown'
).trim();

const getRulesDoc = async () => {
  const doc = await SecurityRule.getGlobalRules();
  return doc || DEFAULT_RULES;
};

const normalizeRules = (doc) => ({
  globalWindowMs: Number(doc?.globalWindowMs) || DEFAULT_RULES.globalWindowMs,
  globalMaxRequests: Number(doc?.globalMaxRequests) || DEFAULT_RULES.globalMaxRequests,
  burstWindowMs: Number(doc?.burstWindowMs) || DEFAULT_RULES.burstWindowMs,
  burstMaxRequests: Number(doc?.burstMaxRequests) || DEFAULT_RULES.burstMaxRequests,
  autoBanMinutes: Number(doc?.autoBanMinutes) || DEFAULT_RULES.autoBanMinutes,
  historyLimit: Number(doc?.historyLimit) || DEFAULT_RULES.historyLimit,
  historyRetentionDays: Number(doc?.historyRetentionDays) || DEFAULT_RULES.historyRetentionDays
});

const isBlocked = (ipState) => {
  if (!ipState) return false;
  if (ipState.manualBan) return true;
  if (!ipState.blockedUntil) return false;
  return new Date(ipState.blockedUntil).getTime() > Date.now();
};

const releaseIfExpired = async (ipState) => {
  if (!ipState || !ipState.blockedUntil) return ipState;
  if (ipState.manualBan) return ipState;

  if (new Date(ipState.blockedUntil).getTime() <= Date.now()) {
    ipState.blockedUntil = null;
    ipState.banReason = '';
    ipState.banSetAt = null;
    await ipState.save();
  }

  return ipState;
};

const recordEvent = async ({ ip, method, path, statusCode, durationMs = 0, blocked = false, reason = '', historyRetentionDays = DEFAULT_RULES.historyRetentionDays }) => {
  const retentionDays = Math.max(1, Number(historyRetentionDays) || DEFAULT_RULES.historyRetentionDays);
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  await SecurityTrafficEvent.create({
    ts: new Date(),
    ip,
    method,
    path,
    statusCode,
    durationMs,
    blocked,
    reason,
    expiresAt
  });

  const ipState = await SecurityIpState.getOrCreate(ip);
  ipState.lastSeenAt = new Date();
  ipState.statusCounts = ipState.statusCounts || {};
  ipState.statusCounts.total = (ipState.statusCounts.total || 0) + 1;

  if (statusCode >= 200 && statusCode < 300) ipState.statusCounts.s2xx = (ipState.statusCounts.s2xx || 0) + 1;
  else if (statusCode >= 400 && statusCode < 500) ipState.statusCounts.s4xx = (ipState.statusCounts.s4xx || 0) + 1;
  else if (statusCode >= 500) ipState.statusCounts.s5xx = (ipState.statusCounts.s5xx || 0) + 1;

  if (statusCode === 429) {
    ipState.statusCounts.s429 = (ipState.statusCounts.s429 || 0) + 1;
  }

  await ipState.save();
};

const enforceHistoryLimit = async (limit) => {
  const safeLimit = Math.max(1000, Number(limit) || DEFAULT_RULES.historyLimit);
  const total = await SecurityTrafficEvent.estimatedDocumentCount();
  if (total <= safeLimit) return;

  const toDelete = total - safeLimit;
  const oldRows = await SecurityTrafficEvent.find({}).sort({ ts: 1 }).limit(toDelete).select('_id').lean();
  if (!oldRows.length) return;

  await SecurityTrafficEvent.deleteMany({ _id: { $in: oldRows.map((r) => r._id) } });
};

const middleware = () => async (req, res, next) => {
  if (!req.path.startsWith('/api')) return next();

  const ip = getIp(req);

  // Never block loopback / whitelisted IPs (local dev, health checks, CI)
  if (isWhitelisted(ip)) return next();

  const startAt = Date.now();

  try {
    const rules = normalizeRules(await getRulesDoc());
    let ipState = await SecurityIpState.getOrCreate(ip);
    ipState = await releaseIfExpired(ipState);

    if (isBlocked(ipState)) {
      const retryAfterSeconds = ipState.manualBan
        ? null
        : Math.max(1, Math.ceil((new Date(ipState.blockedUntil).getTime() - Date.now()) / 1000));

      if (retryAfterSeconds) {
        res.set('Retry-After', String(retryAfterSeconds));
      }

      await recordEvent({
        ip,
        method: req.method,
        path: req.path,
        statusCode: 429,
        blocked: true,
        reason: ipState.banReason || 'IP bloqueada',
        historyRetentionDays: rules.historyRetentionDays
      });

      return res.status(429).json({
        success: false,
        error: 'IP bloqueada temporalmente por seguridad',
        retryAfterSeconds: retryAfterSeconds || undefined
      });
    }

    const now = new Date();
    const globalStart = new Date(now.getTime() - rules.globalWindowMs);
    const burstStart = new Date(now.getTime() - rules.burstWindowMs);

    const [globalCount, burstCount] = await Promise.all([
      SecurityTrafficEvent.countDocuments({ ip, ts: { $gte: globalStart } }),
      SecurityTrafficEvent.countDocuments({ ip, ts: { $gte: burstStart } })
    ]);

    if ((globalCount + 1) > rules.globalMaxRequests || (burstCount + 1) > rules.burstMaxRequests) {
      ipState.blockedUntil = new Date(Date.now() + rules.autoBanMinutes * 60 * 1000);
      ipState.manualBan = false;
      ipState.banReason = (globalCount + 1) > rules.globalMaxRequests
        ? 'Exceso de tráfico global'
        : 'Exceso de ráfaga';
      ipState.banSetAt = new Date();
      ipState.lastSeenAt = new Date();
      await ipState.save();

      const retryAfterSeconds = Math.max(1, rules.autoBanMinutes * 60);
      res.set('Retry-After', String(retryAfterSeconds));

      await recordEvent({
        ip,
        method: req.method,
        path: req.path,
        statusCode: 429,
        blocked: true,
        reason: ipState.banReason,
        historyRetentionDays: rules.historyRetentionDays
      });

      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes. IP bloqueada temporalmente.',
        retryAfterSeconds
      });
    }

    res.on('finish', async () => {
      try {
        await recordEvent({
          ip,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode || 0,
          durationMs: Date.now() - startAt,
          blocked: false,
          historyRetentionDays: rules.historyRetentionDays
        });
        await enforceHistoryLimit(rules.historyLimit);
      } catch (err) {
        console.error('securityMonitorService.finish error:', err.message);
      }
    });

    next();
  } catch (error) {
    console.error('securityMonitorService.middleware error:', error.message);
    next();
  }
};

const getTrafficRealtime = async () => {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const [lastMinute, topIpsRows, activeIps] = await Promise.all([
    SecurityTrafficEvent.find({ ts: { $gte: oneMinuteAgo } }).select('statusCode blocked').lean(),
    SecurityIpState.find({}).sort({ 'statusCounts.total': -1 }).limit(20).lean(),
    SecurityIpState.countDocuments({})
  ]);

  const requestPerMinute = lastMinute.length;
  const blockedPerMinute = lastMinute.filter((ev) => ev.statusCode === 429 || ev.blocked).length;

  const topIps = topIpsRows.map((row) => ({
    ip: row.ip,
    total: row.statusCounts?.total || 0,
    blocked: row.statusCounts?.s429 || 0,
    lastSeenAt: row.lastSeenAt,
    isBlocked: isBlocked(row),
    reason: row.banReason || null
  }));

  return {
    timestamp: new Date().toISOString(),
    requestPerMinute,
    blockedPerMinute,
    activeIps,
    topIps
  };
};

const getTrafficHistory = async ({ limit = 300 } = {}) => {
  const safeLimit = Math.min(2000, Math.max(1, Number(limit) || 300));
  return SecurityTrafficEvent.find({}).sort({ ts: -1 }).limit(safeLimit).lean();
};

const getBannedIps = async () => {
  const now = new Date();
  const rows = await SecurityIpState.find({
    $or: [
      { manualBan: true },
      { blockedUntil: { $gt: now } }
    ]
  }).sort({ banSetAt: -1 }).lean();

  return rows.map((row) => ({
    ip: row.ip,
    manualBan: row.manualBan,
    blockedUntil: row.blockedUntil,
    reason: row.banReason,
    banSetAt: row.banSetAt,
    lastSeenAt: row.lastSeenAt
  }));
};

const blockIp = async (ip, { minutes, reason = 'Ban manual por administrador', permanent = false } = {}) => {
  const rules = normalizeRules(await getRulesDoc());
  const ipState = await SecurityIpState.getOrCreate(ip);

  const effectiveMinutes = Math.max(1, Number(minutes) || rules.autoBanMinutes);
  ipState.manualBan = Boolean(permanent);
  ipState.blockedUntil = permanent ? null : new Date(Date.now() + effectiveMinutes * 60 * 1000);
  ipState.banReason = reason;
  ipState.banSetAt = new Date();
  ipState.lastSeenAt = new Date();
  await ipState.save();

  return ipState;
};

const unblockIp = async (ip) => {
  const ipState = await SecurityIpState.getOrCreate(ip);
  ipState.manualBan = false;
  ipState.blockedUntil = null;
  ipState.banReason = '';
  ipState.banSetAt = null;
  await ipState.save();
  return ipState;
};

const getRules = async () => {
  const doc = await getRulesDoc();
  return normalizeRules(doc);
};

const cleanupNow = async ({ historyRetentionDays } = {}) => {
  const rules = await getRules();
  const retentionDays = Math.max(1, Number(historyRetentionDays) || Number(rules.historyRetentionDays) || DEFAULT_RULES.historyRetentionDays);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [deletedTraffic, deletedAuthThrottle, releasedIpBlocks] = await Promise.all([
    SecurityTrafficEvent.deleteMany({ ts: { $lt: cutoff } }),
    // Borra buckets sin bloqueos vigentes y sin actividad reciente (el resto lo limpia TTL)
    AuthThrottle.deleteMany({
      blockedUntil: null,
      updatedAt: { $lt: cutoff }
    }),
    SecurityIpState.updateMany(
      { manualBan: false, blockedUntil: { $lte: now } },
      { $set: { blockedUntil: null, banReason: '', banSetAt: null } }
    )
  ]);

  return {
    retentionDays,
    cutoff,
    deletedTrafficEvents: deletedTraffic?.deletedCount || 0,
    deletedAuthThrottleRows: deletedAuthThrottle?.deletedCount || 0,
    releasedIpBlocks: releasedIpBlocks?.modifiedCount || 0
  };
};

const setRules = async (input = {}) => {
  const doc = await SecurityRule.getGlobalRules();

  Object.keys(DEFAULT_RULES).forEach((key) => {
    if (input[key] === undefined || input[key] === null) return;
    const value = Number(input[key]);
    if (Number.isFinite(value) && value > 0) {
      doc[key] = Math.round(value);
    }
  });

  await doc.save();
  return normalizeRules(doc);
};

module.exports = {
  middleware,
  getTrafficRealtime,
  getTrafficHistory,
  getBannedIps,
  blockIp,
  unblockIp,
  getRules,
  setRules,
  cleanupNow,
  getIp
};
