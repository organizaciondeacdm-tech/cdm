const mongoose = require('mongoose');
const baseEntityPlugin = require('./plugins/baseEntityPlugin');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const AUTH_THROTTLE_TTL_DAYS = parsePositiveInt(process.env.AUTH_THROTTLE_TTL_DAYS, 7);

const authThrottleSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  attempts: {
    type: [Date],
    default: []
  },
  blockedUntil: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

authThrottleSchema.index({ updatedAt: 1 }, { expireAfterSeconds: AUTH_THROTTLE_TTL_DAYS * 24 * 60 * 60 });

authThrottleSchema.statics.getOrCreate = async function getOrCreate(key) {
  let row = await this.findOne({ key });
  if (row) return row;

  try {
    row = await this.create({ key });
    return row;
  } catch (error) {
    if (error?.code === 11000) {
      return this.findOne({ key });
    }
    throw error;
  }
};

authThrottleSchema.plugin(baseEntityPlugin, {
  entityName: 'AuthThrottle',
  sensitiveFields: ['key']
});

module.exports = mongoose.model('AuthThrottle', authThrottleSchema);
