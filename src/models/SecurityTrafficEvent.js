const mongoose = require('mongoose');
const baseEntityPlugin = require('./plugins/baseEntityPlugin');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SECURITY_TRAFFIC_TTL_DAYS = parsePositiveInt(process.env.SECURITY_TRAFFIC_TTL_DAYS, 30);
const defaultExpiresAt = () => new Date(Date.now() + SECURITY_TRAFFIC_TTL_DAYS * 24 * 60 * 60 * 1000);

const securityTrafficEventSchema = new mongoose.Schema({
  ts: {
    type: Date,
    default: Date.now,
    index: true
  },
  ip: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    trim: true
  },
  path: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  durationMs: {
    type: Number,
    default: 0
  },
  blocked: {
    type: Boolean,
    default: false,
    index: true
  },
  reason: {
    type: String,
    default: ''
  },
  expiresAt: {
    type: Date,
    default: defaultExpiresAt,
    index: true
  }
}, {
  timestamps: false
});

securityTrafficEventSchema.index({ ip: 1, ts: -1 });
securityTrafficEventSchema.index({ ts: -1 });
securityTrafficEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

securityTrafficEventSchema.plugin(baseEntityPlugin, {
  entityName: 'SecurityTrafficEvent',
  sensitiveFields: ['ip']
});

module.exports = mongoose.model('SecurityTrafficEvent', securityTrafficEventSchema);
