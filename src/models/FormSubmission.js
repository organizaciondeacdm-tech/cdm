const { BaseMongoModel, toObjectId } = require('./base/mongoModel');

class FormSubmission extends BaseMongoModel {
  static collectionName = 'form_submissions';
  static sensitiveFields = ['payload', 'encryptedPayload', 'iv', 'authTag', 'sessionId'];
  static references = {
    templateId: { model: () => require('./FormTemplate'), localField: 'templateId', isArray: false }
  };

  static async preSave(payload) {
    if (payload.templateId) payload.templateId = toObjectId(payload.templateId);
    if (!payload.payload) payload.payload = {};
    if (!Array.isArray(payload.searchIndex)) payload.searchIndex = [];
    if (!payload.status) payload.status = 'synced';
    if (!payload.createdBy) payload.createdBy = 'anonymous';
    if (!payload.updatedBy) payload.updatedBy = 'anonymous';
  }
}

module.exports = FormSubmission;
