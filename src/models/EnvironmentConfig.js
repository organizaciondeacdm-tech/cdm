const { BaseMongoModel } = require('./base/mongoModel');
const { encryptAclValue, decryptAclValue, isEncryptedAclValue } = require('../utils/accessControlCrypto');

const ENCRYPTED_CONFIG_KEYS = new Set(['ADMIN_PRIVILEGED_ROLE']);
const normalizeKey = (key) => String(key || '').trim().toUpperCase();

class EnvironmentConfig extends BaseMongoModel {
  static collectionName = 'environment_configs';
  static sensitiveFields = ['value'];

  static transformOnRead(doc) {
    if (!doc || typeof doc !== 'object') return doc;

    // Al leer, desencriptar key y value
    if (doc.key) {
      doc.key = decryptAclValue(doc.key).value;
    }
    if (doc.value != null) {
      doc.value = decryptAclValue(doc.value).value;
    }
    return doc;
  }

  static async preUpdate(update) {
    const next = { ...(update || {}) };
    next.$set = { ...(next.$set || {}) };

    let currentPlainKey = null;

    if (Object.prototype.hasOwnProperty.call(next.$set, 'key')) {
      currentPlainKey = normalizeKey(next.$set.key);
      next.$set.keyLookup = require('../utils/accessControlCrypto').buildLookupKey('config', currentPlainKey);
      if (!isEncryptedAclValue(next.$set.key)) {
        next.$set.key = encryptAclValue(currentPlainKey, new Date());
      }
    }

    if (Object.prototype.hasOwnProperty.call(next.$set, 'value')) {
      const plainValue = String(next.$set.value ?? '');
      if (!isEncryptedAclValue(plainValue)) {
        next.$set.value = encryptAclValue(plainValue, new Date());
      }
    }

    return next;
  }

  static async preSave(payload) {
    payload.updatedAt = new Date();

    if (payload.key) {
      const plainKey = normalizeKey(payload.key);
      payload.keyLookup = require('../utils/accessControlCrypto').buildLookupKey('config', plainKey);

      if (!isEncryptedAclValue(payload.key)) {
        payload.key = encryptAclValue(plainKey, new Date());
      }
    }

    if (payload.value != null) {
      const plainValue = String(payload.value ?? '');
      if (!isEncryptedAclValue(plainValue)) {
        payload.value = encryptAclValue(plainValue, new Date());
      }
    }
  }

  static getEnabledConfig() {
    return this.find({ enabled: true }).lean();
  }
}

module.exports = EnvironmentConfig;
