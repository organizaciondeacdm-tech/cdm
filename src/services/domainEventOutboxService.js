const DomainEventOutbox = require('../models/DomainEventOutbox');

class DomainEventOutboxService {
  async enqueue({ aggregate, aggregateId, eventType, payload = {}, actorId = null }) {
    try {
      return await DomainEventOutbox.create({
        aggregate,
        aggregateId,
        eventType,
        payload,
        actorId,
        status: 'pending',
        occurredAt: new Date()
      });
    } catch (error) {
      // No bloquear la operación principal por falla de outbox
      console.error('[OUTBOX] enqueue error:', error.message);
      return null;
    }
  }
}

module.exports = new DomainEventOutboxService();
