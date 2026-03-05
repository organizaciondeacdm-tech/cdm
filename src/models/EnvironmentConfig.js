const { BaseMongoModel } = require('./base/mongoModel');
const { encryptAclValue, decryptAclValue, isEncryptedAclValue } = require('../utils/accessControlCrypto');

const ENCRYPTED_CONFIG_KEYS = new Set(['ADMIN_PRIVILEGED_ROLE']);
const normalizeKey = (key) => String(key || '').trim().toUpperCase();

class EnvironmentConfig extends BaseMongoModel {
  static collectionName = 'environment_configs';
  static sensitiveFields = ['value'];

  static transformOnRead(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    const key = normalizeKey(doc.key);
    if (!ENCRYPTED_CONFIG_KEYS.has(key)) return doc;
    if (doc.value == null) return doc;
    doc.value = decryptAclValue(doc.value).value;
    return doc;
  }

  static async preUpdate(update) {
    const next = { ...(update || {}) };
    next.$set = { ...(next.$set || {}) };

    if (Object.prototype.hasOwnProperty.call(next.$set, 'key')) {
      next.$set.key = normalizeKey(next.$set.key);
    }

    const key = normalizeKey(next.$set.key);
    if (ENCRYPTED_CONFIG_KEYS.has(key) && Object.prototype.hasOwnProperty.call(next.$set, 'value')) {
      const plainValue = String(next.$set.value ?? '');
      if (!isEncryptedAclValue(plainValue)) {
        next.$set.value = encryptAclValue(plainValue, new Date());
      }
    }

    return next;
  }

  static async preSave(payload) {
    payload.updatedAt = new Date();
    if (payload.key) payload.key = normalizeKey(payload.key);

    if (ENCRYPTED_CONFIG_KEYS.has(payload.key) && payload.value != null) {
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
