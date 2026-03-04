const mongoose = require('mongoose');
const baseEntityPlugin = require('./plugins/baseEntityPlugin');

const securityIpStateSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  firstSeenAt: {
    type: Date,
    default: Date.now
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  blockedUntil: {
    type: Date,
    default: null,
    index: true
  },
  manualBan: {
    type: Boolean,
    default: false,
    index: true
  },
  banReason: {
    type: String,
    default: ''
  },
  banSetAt: {
    type: Date,
    default: null
  },
  statusCounts: {
    total: { type: Number, default: 0 },
    s2xx: { type: Number, default: 0 },
    s4xx: { type: Number, default: 0 },
    s5xx: { type: Number, default: 0 },
    s429: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

securityIpStateSchema.statics.getOrCreate = async function getOrCreate(ip) {
  let row = await this.findOne({ ip });
  if (row) return row;

  try {
    row = await this.create({ ip });
    return row;
  } catch (error) {
    if (error?.code === 11000) {
      return this.findOne({ ip });
    }
    throw error;
  }
};

securityIpStateSchema.plugin(baseEntityPlugin, {
  entityName: 'SecurityIpState',
  sensitiveFields: ['ip']
});

module.exports = mongoose.model('SecurityIpState', securityIpStateSchema);
