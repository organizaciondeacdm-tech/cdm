const { BaseMongoModel } = require('./base/mongoModel');

class AuthThrottle extends BaseMongoModel {
  static collectionName = 'auth_throttles';
  static sensitiveFields = ['key'];

  static async getOrCreate(key) {
    let row = await this.findOne({ key });
    if (row) return row;

    try {
      row = await this.create({ key, attempts: [], blockedUntil: null });
      return row;
    } catch (error) {
      return this.findOne({ key });
    }
  }
}

module.exports = AuthThrottle;
