class FormSubmissionEntity {
  constructor({ id, templateId, templateName, payload = {}, sessionId, status = 'synced' }) {
    this.id = id;
    this.templateId = templateId;
    this.templateName = templateName;
    this.payload = payload;
    this.sessionId = sessionId;
    this.status = status;
  }

  buildSearchIndex() {
    return Object.values(this.payload)
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 25);
  }

  validate() {
    if (!this.templateId) {
      throw new Error('templateId is required');
    }

    if (!this.templateName) {
      throw new Error('templateName is required');
    }

    if (typeof this.payload !== 'object' || Array.isArray(this.payload)) {
      throw new Error('payload must be an object');
    }

    return true;
  }
}

module.exports = FormSubmissionEntity;
