const { BaseMongoModel } = require('./base/mongoModel');

class DomainEventOutbox extends BaseMongoModel {
  static collectionName = 'domain_event_outbox';

  static async preSave(payload) {
    payload.aggregate = String(payload.aggregate || 'unknown').trim();
    payload.aggregateId = String(payload.aggregateId || '').trim();
    payload.eventType = String(payload.eventType || 'unknown').trim();
    payload.payload = payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
    payload.status = String(payload.status || 'pending').trim();
    payload.occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
    if (!payload.retries && payload.retries !== 0) payload.retries = 0;
  }
}

module.exports = DomainEventOutbox;
