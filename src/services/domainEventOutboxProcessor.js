const os = require('os');
const DomainEventOutbox = require('../models/DomainEventOutbox');
const AuditEvent = require('../models/AuditEvent');

class DomainEventOutboxProcessor {
  constructor({
    batchSize = Number.parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10) || 50,
    pollMs = Number.parseInt(process.env.OUTBOX_POLL_MS || '4000', 10) || 4000,
    maxRetries = Number.parseInt(process.env.OUTBOX_MAX_RETRIES || '8', 10) || 8,
    staleProcessingMs = Number.parseInt(process.env.OUTBOX_STALE_MS || '60000', 10) || 60000
  } = {}) {
    this.batchSize = Math.max(1, batchSize);
    this.pollMs = Math.max(1000, pollMs);
    this.maxRetries = Math.max(1, maxRetries);
    this.staleProcessingMs = Math.max(5000, staleProcessingMs);
    this.workerId = `${os.hostname()}:${process.pid}`;
    this.timer = null;
    this.running = false;
  }

  isEnabled() {
    if (process.env.OUTBOX_WORKER_ENABLED === '1') return true;
    if (process.env.OUTBOX_WORKER_ENABLED === '0') return false;
    if (process.env.VERCEL) return false;
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') return false;
    return true;
  }

  start({ ensureDbConnection } = {}) {
    if (!this.isEnabled()) {
      return false;
    }
    if (this.timer) {
      return true;
    }

    const tick = async () => {
      try {
        if (this.running) return;
        this.running = true;
        if (typeof ensureDbConnection === 'function') {
          await ensureDbConnection();
        }
        await this.processBatch();
      } catch (error) {
        console.error('[OUTBOX] tick error:', error.message);
      } finally {
        this.running = false;
      }
    };

    this.timer = setInterval(tick, this.pollMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }

    setTimeout(() => {
      tick().catch((error) => {
        console.error('[OUTBOX] immediate tick error:', error.message);
      });
    }, 200);

    return true;
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async recoverStaleProcessing() {
    const threshold = new Date(Date.now() - this.staleProcessingMs);
    const result = await DomainEventOutbox.updateMany(
      {
        status: 'processing',
        processingStartedAt: { $lt: threshold }
      },
      {
        $set: {
          status: 'pending',
          processingStartedAt: null,
          processingWorker: null,
          lastError: 'Recovered stale processing lock'
        },
        $inc: { retries: 1 }
      }
    );

    return Number(result?.modifiedCount || 0);
  }

  async fetchPendingBatch() {
    return DomainEventOutbox.find({ status: 'pending' })
      .sort({ occurredAt: 1, createdAt: 1 })
      .limit(this.batchSize)
      .lean();
  }

  async claimEvent(eventId) {
    const result = await DomainEventOutbox.updateOne(
      { _id: eventId, status: 'pending' },
      {
        $set: {
          status: 'processing',
          processingStartedAt: new Date(),
          processingWorker: this.workerId,
          processedAt: null
        }
      }
    );

    return Number(result?.matchedCount || 0) > 0;
  }

  async markProcessed(eventId) {
    await DomainEventOutbox.updateOne(
      { _id: eventId },
      {
        $set: {
          status: 'processed',
          processedAt: new Date(),
          processingStartedAt: null,
          processingWorker: null,
          lastError: ''
        }
      }
    );
  }

  async markFailure(event, error) {
    const retries = Number(event?.retries || 0) + 1;
    const isDeadLetter = retries >= this.maxRetries;
    await DomainEventOutbox.updateOne(
      { _id: event._id },
      {
        $set: {
          status: isDeadLetter ? 'dead_letter' : 'pending',
          lastError: String(error?.message || 'Unknown outbox processing error'),
          processingStartedAt: null,
          processingWorker: null,
          failedAt: new Date()
        },
        $inc: { retries: 1 }
      }
    );
  }

  async handleEvent(event) {
    await AuditEvent.create({
      timestamp: new Date(),
      userId: event?.actorId || null,
      username: 'outbox_worker',
      role: 'system',
      action: `outbox:${String(event?.eventType || 'unknown').toLowerCase()}`,
      entity: String(event?.aggregate || 'unknown'),
      details: {
        aggregateId: event?.aggregateId || null,
        payload: event?.payload || {},
        workerId: this.workerId,
        outboxId: String(event?._id || '')
      },
      ip: '127.0.0.1',
      userAgent: 'outbox-worker',
      method: 'ASYNC',
      url: 'domain-event-outbox'
    });
  }

  async processBatch() {
    const recoveredLocks = await this.recoverStaleProcessing();
    const batch = await this.fetchPendingBatch();

    const result = {
      recoveredLocks,
      scanned: batch.length,
      processed: 0,
      failed: 0,
      deadLettered: 0
    };

    for (const event of batch) {
      const claimed = await this.claimEvent(event._id);
      if (!claimed) continue;

      try {
        await this.handleEvent(event);
        await this.markProcessed(event._id);
        result.processed += 1;
      } catch (error) {
        await this.markFailure(event, error);
        const nextRetries = Number(event?.retries || 0) + 1;
        if (nextRetries >= this.maxRetries) result.deadLettered += 1;
        else result.failed += 1;
      }
    }

    return result;
  }

  async getStats() {
    const [pending, processing, processed, deadLetter, total] = await Promise.all([
      DomainEventOutbox.countDocuments({ status: 'pending' }),
      DomainEventOutbox.countDocuments({ status: 'processing' }),
      DomainEventOutbox.countDocuments({ status: 'processed' }),
      DomainEventOutbox.countDocuments({ status: 'dead_letter' }),
      DomainEventOutbox.estimatedDocumentCount()
    ]);

    return {
      workerId: this.workerId,
      enabled: this.isEnabled(),
      running: this.running,
      pollMs: this.pollMs,
      batchSize: this.batchSize,
      maxRetries: this.maxRetries,
      staleProcessingMs: this.staleProcessingMs,
      counters: {
        total,
        pending,
        processing,
        processed,
        deadLetter
      }
    };
  }

  async list({ status, page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));
    const skip = (safePage - 1) * safeLimit;

    const query = {};
    if (status) query.status = String(status).trim();

    const [rows, total] = await Promise.all([
      DomainEventOutbox.find(query).sort({ occurredAt: -1, createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      DomainEventOutbox.countDocuments(query)
    ]);

    return {
      rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.max(1, Math.ceil(total / safeLimit))
      }
    };
  }

  async requeue({ ids = [], fromStatus = 'dead_letter' } = {}) {
    const normalizedIds = Array.from(new Set(
      (Array.isArray(ids) ? ids : []).map((id) => String(id || '').trim()).filter(Boolean)
    ));

    if (!normalizedIds.length) {
      return { requested: 0, modified: 0 };
    }

    const result = await DomainEventOutbox.updateMany(
      { _id: { $in: normalizedIds }, status: String(fromStatus || 'dead_letter') },
      {
        $set: {
          status: 'pending',
          processingStartedAt: null,
          processingWorker: null,
          lastError: ''
        }
      }
    );

    return {
      requested: normalizedIds.length,
      modified: Number(result?.modifiedCount || 0)
    };
  }
}

module.exports = new DomainEventOutboxProcessor();
