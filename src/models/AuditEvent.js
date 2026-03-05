const { BaseMongoModel } = require('./base/mongoModel');

class AuditEvent extends BaseMongoModel {
  static collectionName = 'audit_events';
  static sensitiveFields = ['ip', 'userAgent', 'details'];

  static async preSave(payload) {
    payload.timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
    payload.username = String(payload.username || '').trim().toLowerCase() || 'sistema';
    payload.action = String(payload.action || '').trim().toLowerCase() || 'unknown';
    payload.entity = String(payload.entity || '').trim() || 'unknown';
    payload.method = String(payload.method || '').trim().toUpperCase() || 'N/A';
    payload.url = String(payload.url || '').trim() || 'N/A';
    payload.ip = String(payload.ip || 'N/A').trim();
    payload.userAgent = String(payload.userAgent || 'N/A').trim();
    if (!payload.details || typeof payload.details !== 'object') {
      payload.details = {};
    }
  }
}

module.exports = AuditEvent;
