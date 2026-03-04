const FormTemplate = require('../../../models/FormTemplate');

class MongoFormTemplateRepository {
  async create(template) {
    return FormTemplate.create(template);
  }

  async list({ entityType, isActive = true, isLatest = true } = {}) {
    const query = {};

    if (entityType) query.entityType = entityType;
    if (typeof isActive === 'boolean') query.isActive = isActive;
    if (typeof isLatest === 'boolean') query.isLatest = isLatest;

    return FormTemplate.find(query).sort({ createdAt: -1 }).lean();
  }

  async findById(id) {
    return FormTemplate.findById(id).lean();
  }

  async update(id, payload) {
    return FormTemplate.findByIdAndUpdate(id, payload, { new: true });
  }

  async markNotLatest(id) {
    return FormTemplate.findByIdAndUpdate(id, { isLatest: false }, { new: true });
  }

  async getMaxVersion(templateKey) {
    const result = await FormTemplate.findOne({ templateKey })
      .sort({ version: -1 })
      .select('version')
      .lean();
    return result ? Number(result.version) : 0;
  }

  async delete(id) {
    return FormTemplate.deleteOne({ _id: id });
  }
}

module.exports = new MongoFormTemplateRepository();
