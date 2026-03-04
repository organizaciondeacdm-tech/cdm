const mongoose = require('mongoose');
const baseEntityPlugin = require('./plugins/baseEntityPlugin');

const securityRuleSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global',
    trim: true,
    index: true
  },
  globalWindowMs: { type: Number, default: 15 * 60 * 1000 },
  globalMaxRequests: { type: Number, default: 300 },
  burstWindowMs: { type: Number, default: 10 * 1000 },
  burstMaxRequests: { type: Number, default: 60 },
  autoBanMinutes: { type: Number, default: 30 },
  historyLimit: { type: Number, default: 5000 },
  historyRetentionDays: { type: Number, default: 30 }
}, {
  timestamps: true
});

securityRuleSchema.statics.getGlobalRules = async function getGlobalRules() {
  let rules = await this.findOne({ key: 'global' });
  if (rules) return rules;

  try {
    rules = await this.create({ key: 'global' });
    return rules;
  } catch (error) {
    if (error?.code === 11000) {
      return this.findOne({ key: 'global' });
    }
    throw error;
  }
};

securityRuleSchema.plugin(baseEntityPlugin, {
  entityName: 'SecurityRule',
  sensitiveFields: []
});

module.exports = mongoose.model('SecurityRule', securityRuleSchema);
