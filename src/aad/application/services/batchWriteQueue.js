class BatchWriteQueue {
  constructor({ flushIntervalMs = 3000, maxBatchSize = 25, maxRetries = 3, writer }) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxBatchSize = maxBatchSize;
    this.maxRetries = maxRetries;
    this.writer = writer;
    this.queue = [];
    this.timer = null;
    this.isFlushing = false;
    this.failures = 0;
    this.circuitOpenUntil = 0;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  enqueue(item) {
    this.queue.push({ item, retries: 0, nextAttemptAt: Date.now() });

    if (this.queue.length >= this.maxBatchSize) {
      void this.flush();
    }
  }

  isCircuitOpen() {
    return Date.now() < this.circuitOpenUntil;
  }

  pullReadyBatch() {
    const now = Date.now();
    const ready = [];
    const pending = [];

    for (const entry of this.queue) {
      if (ready.length < this.maxBatchSize && entry.nextAttemptAt <= now) {
        ready.push(entry);
      } else {
        pending.push(entry);
      }
    }

    this.queue = pending;
    return ready;
  }

  async flush() {
    if (this.isFlushing || this.queue.length === 0 || this.isCircuitOpen()) return;

    this.isFlushing = true;
    const batch = this.pullReadyBatch();

    if (batch.length === 0) {
      this.isFlushing = false;
      return;
    }

    try {
      await this.writer(batch.map((entry) => entry.item));
      this.failures = 0;
    } catch (_error) {
      this.failures += 1;

      for (const entry of batch) {
        const retries = entry.retries + 1;
        if (retries < this.maxRetries) {
          const backoff = Math.min(1000 * (2 ** retries), 15000);
          this.queue.unshift({
            item: entry.item,
            retries,
            nextAttemptAt: Date.now() + backoff
          });
        }
      }

      if (this.failures >= 3) {
        this.circuitOpenUntil = Date.now() + 10000;
      }
    } finally {
      this.isFlushing = false;
    }
  }
}

module.exports = BatchWriteQueue;
