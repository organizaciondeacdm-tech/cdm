const { BaseMongoModel } = require('./base/mongoModel');

class EnvironmentConfig extends BaseMongoModel {
  static collectionName = 'environment_configs';
  static sensitiveFields = ['value'];

  static async preSave(payload) {
    payload.updatedAt = new Date();
    if (payload.key) payload.key = String(payload.key).trim().toUpperCase();
  }

  static getEnabledConfig() {
    return this.find({ enabled: true }).lean();
  }
}

module.exports = EnvironmentConfig;
