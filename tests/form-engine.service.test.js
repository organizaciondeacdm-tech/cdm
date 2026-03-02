const test = require('node:test');
const assert = require('node:assert/strict');
const { FormEngineService } = require('../src/aad/application/services/formEngineService');

function createInMemoryRepositories() {
  const templates = [];
  const submissions = [];

  return {
    templateRepository: {
      async create(payload) {
        const row = { _id: payload._id || `t-${templates.length + 1}`, ...payload };
        templates.push(row);
        return row;
      },
      async list() { return templates.filter((t) => t.isLatest !== false); },
      async findById(id) { return templates.find((t) => t._id === id) || null; },
      async markNotLatest(id) {
        const row = templates.find((t) => t._id === id);
        if (row) row.isLatest = false;
        return row;
      },
      async delete(id) {
        const idx = templates.findIndex((t) => t._id === id);
        if (idx !== -1) return templates.splice(idx, 1)[0];
        return null;
      }
    },
    submissionRepository: {
      async findByIdempotencyKey(key) {
        return submissions.find((s) => s.idempotencyKey === key) || null;
      },
      async create(payload) {
        const row = { _id: `s-${submissions.length + 1}`, ...payload };
        submissions.push(row);
        return row;
      },
      async bulkCreate(rows) {
        rows.forEach((payload) => submissions.push({ _id: `s-${submissions.length + 1}`, ...payload }));
        return rows;
      },
      async list() {
        return { items: submissions, total: submissions.length, page: 1, limit: 50, pages: 1 };
      },
      async update() { return null; },
      async remove() { return null; }
    }
  };
}

const cryptoAdapter = {
  encrypt(value) {
    return {
      encryptedPayload: Buffer.from(JSON.stringify(value)).toString('base64'),
      iv: 'iv',
      authTag: 'tag'
    };
  },
  decrypt(input) {
    return JSON.parse(Buffer.from(input.encryptedPayload, 'base64').toString('utf8'));
  }
};

test('updateTemplate creates versioned successor', async () => {
  const repos = createInMemoryRepositories();
  const service = new FormEngineService({
    templateRepository: repos.templateRepository,
    submissionRepository: repos.submissionRepository,
    cryptoAdapter,
    batchQueue: { start() {}, enqueue() {} }
  });

  const created = await service.createTemplate({
    name: 'Plantilla Base',
    entityType: 'custom',
    fields: [{ name: 'campo', label: 'Campo', type: 'text' }]
  });

  const updated = await service.updateTemplate(created._id, {
    description: 'v2',
    fields: [{ name: 'campo', label: 'Campo V2', type: 'text' }]
  });

  assert.equal(updated.version, 2);
  assert.equal(updated.parentTemplateId, created._id);
  const first = await repos.templateRepository.findById(created._id);
  assert.equal(first.isLatest, false);
});

test('saveSubmission is idempotent with same key', async () => {
  const repos = createInMemoryRepositories();
  const service = new FormEngineService({
    templateRepository: repos.templateRepository,
    submissionRepository: repos.submissionRepository,
    cryptoAdapter,
    batchQueue: { start() {}, enqueue() {} }
  });

  const payload = {
    templateId: 't-1',
    templateName: 'Base',
    payload: { escuela: 'Escuela 1' },
    sessionId: 'abc',
    idempotencyKey: 'fixed-key'
  };

  const first = await service.saveSubmission(payload, 'tester');
  const second = await service.saveSubmission(payload, 'tester');

  assert.equal(first._id, second._id);
});
