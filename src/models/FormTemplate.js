const { BaseMongoModel } = require('./base/mongoModel');

class FormTemplate extends BaseMongoModel {
  static collectionName = 'form_templates';

  static async preSave(payload) {
    if (!payload.templateKey && payload.name) {
      payload.templateKey = String(payload.name)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    if (payload.templateKey) payload.templateKey = String(payload.templateKey).toLowerCase().trim();
    if (payload.isActive === undefined) payload.isActive = true;
    if (payload.isLatest === undefined) payload.isLatest = true;
    if (!payload.version) payload.version = 1;
    if (!Array.isArray(payload.fields)) payload.fields = [];
    if (!payload.metadata) payload.metadata = {};
  }
}

module.exports = FormTemplate;
