class FormTemplateEntity {
  constructor({ id, name, description, entityType, fields = [], metadata = {} }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.entityType = entityType || 'custom';
    this.fields = fields;
    this.metadata = metadata;
  }

  validate() {
    if (!this.name || !this.name.trim()) {
      throw new Error('Template name is required');
    }

    if (!Array.isArray(this.fields) || this.fields.length === 0) {
      throw new Error('Template must include at least one field');
    }

    const duplicated = new Set();
    for (const field of this.fields) {
      if (!field.name || !field.label) {
        throw new Error('Field name and label are required');
      }

      if (duplicated.has(field.name)) {
        throw new Error(`Duplicated field name: ${field.name}`);
      }
      duplicated.add(field.name);
    }

    return true;
  }
}

module.exports = FormTemplateEntity;
