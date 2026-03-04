const mongoose = require('mongoose');

const environmentConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true
  },
  value: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

environmentConfigSchema.pre('save', function onSave(next) {
  this.updatedAt = new Date();
  next();
});

environmentConfigSchema.statics.getEnabledConfig = function getEnabledConfig() {
  return this.find({ enabled: true }).lean();
};

module.exports = mongoose.model('EnvironmentConfig', environmentConfigSchema);
