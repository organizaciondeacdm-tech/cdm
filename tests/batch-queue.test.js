const test = require('node:test');
const assert = require('node:assert/strict');
const BatchWriteQueue = require('../src/aad/application/services/batchWriteQueue');

test('batch queue retries and opens circuit breaker', async () => {
  let calls = 0;
  const queue = new BatchWriteQueue({
    flushIntervalMs: 999999,
    maxBatchSize: 2,
    maxRetries: 3,
    writer: async () => {
      calls += 1;
      throw new Error('forced failure');
    }
  });

  queue.enqueue({ id: 1 });
  await queue.flush();

  assert.equal(calls, 1);
  assert.equal(queue.queue.length, 1);

  queue.queue[0].nextAttemptAt = Date.now() - 1;
  await queue.flush();
  queue.queue[0].nextAttemptAt = Date.now() - 1;
  await queue.flush();

  assert.ok(queue.circuitOpenUntil > Date.now());

  queue.stop();
});
