const crypto = require('crypto');
const { BaseMongoModel } = require('./base/mongoModel');

class JwtKey extends BaseMongoModel {
  static collectionName = 'jwt_keys';
  static sensitiveFields = ['keyValue'];

  static generateSecureKey(length = 64) {
    return crypto.randomBytes(length).toString('base64');
  }

  static async getOrCreateKey(keyType) {
    try {
      let keyDoc = await this.findOne({ keyType });

      if (!keyDoc) {
        const keyValue = this.generateSecureKey();
        keyDoc = await this.create({ keyType, keyValue });
      }

      return keyDoc.keyValue;
    } catch (error) {
      console.error(`Error obteniendo/creando clave ${keyType}:`, error);
      throw error;
    }
  }
}

module.exports = JwtKey;
