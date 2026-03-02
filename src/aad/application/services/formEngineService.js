const crypto = require('crypto');
const FormTemplateEntity = require('../../domain/entities/FormTemplateEntity');
const FormSubmissionEntity = require('../../domain/entities/FormSubmissionEntity');
const defaultTemplateRepository = require('../../infrastructure/repositories/mongoFormTemplateRepository');
const defaultSubmissionRepository = require('../../infrastructure/repositories/mongoFormSubmissionRepository');
const defaultCryptoAdapter = require('../../infrastructure/adapters/cryptoAdapter');
const BatchWriteQueue = require('./batchWriteQueue');
const { resolveSuggestionStrategy } = require('../strategies/suggestionStrategy');

class FormEngineService {
  constructor({
    templateRepository = defaultTemplateRepository,
    submissionRepository = defaultSubmissionRepository,
    cryptoAdapter = defaultCryptoAdapter,
    suggestionResolver = resolveSuggestionStrategy,
    batchQueue = null
  } = {}) {
    this.templateRepository = templateRepository;
    this.submissionRepository = submissionRepository;
    this.cryptoAdapter = cryptoAdapter;
    this.suggestionResolver = suggestionResolver;
    this.batchQueue = batchQueue || new BatchWriteQueue({
      writer: async (rows) => this.submissionRepository.bulkCreate(rows)
    });
    this.batchQueue.start();
  }

  async createTemplate(payload) {
    const entity = new FormTemplateEntity(payload);
    entity.validate();

    const templateKey = payload.templateKey || payload.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return this.templateRepository.create({
      templateKey,
      name: entity.name,
      description: entity.description,
      entityType: entity.entityType,
      fields: entity.fields,
      metadata: entity.metadata,
      version: 1,
      isLatest: true
    });
  }

  async listTemplates(filters) {
    return this.templateRepository.list(filters);
  }

  async updateTemplate(id, payload) {
    const current = await this.templateRepository.findById(id);
    if (!current) {
      throw new Error('Template not found');
    }

    const nextPayload = {
      ...current,
      ...payload,
      name: payload.name || current.name,
      fields: payload.fields || current.fields,
      description: payload.description ?? current.description,
      entityType: payload.entityType || current.entityType,
      metadata: payload.metadata || current.metadata
    };

    const entity = new FormTemplateEntity(nextPayload);
    entity.validate();

    await this.templateRepository.markNotLatest(id);

    return this.templateRepository.create({
      templateKey: current.templateKey,
      name: nextPayload.name,
      description: nextPayload.description,
      entityType: nextPayload.entityType,
      fields: nextPayload.fields,
      metadata: nextPayload.metadata,
      parentTemplateId: current._id,
      version: Number(current.version || 1) + 1,
      isLatest: true,
      isActive: payload.isActive === undefined ? current.isActive : payload.isActive
    });
  }

  async deleteTemplate(id) {
    return this.templateRepository.delete(id);
  }

  buildSubmissionPersistence(submissionEntity, actor = 'anonymous', extras = {}) {
    const encrypted = this.cryptoAdapter.encrypt(submissionEntity.payload);
    return {
      templateId: submissionEntity.templateId,
      templateName: submissionEntity.templateName,
      templateVersion: extras.templateVersion || 1,
      idempotencyKey: extras.idempotencyKey,
      payload: submissionEntity.payload,
      encryptedPayload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      searchIndex: submissionEntity.buildSearchIndex(),
      sessionId: submissionEntity.sessionId,
      status: submissionEntity.status,
      createdBy: actor,
      updatedBy: actor
    };
  }

  buildIdempotencyKey(payload) {
    if (payload.idempotencyKey) return payload.idempotencyKey;

    const fingerprint = {
      templateId: payload.templateId,
      templateName: payload.templateName,
      sessionId: payload.sessionId,
      payload: payload.payload
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex');
  }

  async saveSubmission(payload, actor) {
    const entity = new FormSubmissionEntity(payload);
    entity.validate();

    const idempotencyKey = this.buildIdempotencyKey(payload);
    const existing = await this.submissionRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing;
    }

    const persistence = this.buildSubmissionPersistence(entity, actor, {
      idempotencyKey,
      templateVersion: payload.templateVersion
    });

    if (payload.useBatch) {
      this.batchQueue.enqueue(persistence);
      return { queued: true, idempotencyKey };
    }

    return this.submissionRepository.create(persistence);
  }

  async bulkSaveSubmissions(payload, actor) {
    const prepared = payload.map((item) => {
      const entity = new FormSubmissionEntity(item);
      entity.validate();
      return this.buildSubmissionPersistence(entity, actor, {
        idempotencyKey: this.buildIdempotencyKey(item),
        templateVersion: item.templateVersion
      });
    });

    return this.submissionRepository.bulkCreate(prepared);
  }

  async listSubmissions(filters) {
    const data = await this.submissionRepository.list(filters);

    data.items = data.items.map((item) => ({
      ...item,
      payload: item.payload || this.cryptoAdapter.decrypt(item)
    }));

    return data;
  }

  async updateSubmission(id, payload, actor) {
    const encrypted = payload.payload ? this.cryptoAdapter.encrypt(payload.payload) : null;
    const mergedPayload = {
      ...payload,
      updatedBy: actor
    };

    if (payload.payload) {
      const entity = new FormSubmissionEntity({
        templateId: payload.templateId || 'unknown',
        templateName: payload.templateName || 'unknown',
        payload: payload.payload,
        status: payload.status || 'synced'
      });

      mergedPayload.searchIndex = entity.buildSearchIndex();
      mergedPayload.encryptedPayload = encrypted.encryptedPayload;
      mergedPayload.iv = encrypted.iv;
      mergedPayload.authTag = encrypted.authTag;
    }

    return this.submissionRepository.update(id, mergedPayload);
  }

  async deleteSubmission(id) {
    return this.submissionRepository.remove(id);
  }

  async getSuggestions(source, q, limit = 8) {
    const strategy = this.suggestionResolver(source);
    return strategy.suggest(q, Number(limit));
  }
}

const formEngineService = new FormEngineService();

module.exports = formEngineService;
module.exports.FormEngineService = FormEngineService;
