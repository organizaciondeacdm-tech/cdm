const FormSubmission = require('../../../models/FormSubmission');

class MongoFormSubmissionRepository {
  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    return FormSubmission.findOne({ idempotencyKey }).lean();
  }

  async create(submission) {
    return FormSubmission.create(submission);
  }

  async bulkCreate(submissions) {
    if (!submissions.length) return [];
    return FormSubmission.insertMany(submissions, { ordered: false });
  }

  async list({ templateId, search, status, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', filters = {} }) {
    const query = {};

    if (templateId) query.templateId = templateId;
    if (status) query.status = status;
    if (search) query.searchIndex = { $elemMatch: { $regex: search, $options: 'i' } };

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query[`payload.${key}`] = { $regex: String(value), $options: 'i' };
      }
    });

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      FormSubmission.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
      FormSubmission.countDocuments(query)
    ]);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    };
  }

  async update(id, payload) {
    return FormSubmission.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  }

  async remove(id) {
    return FormSubmission.findByIdAndDelete(id).lean();
  }
}

module.exports = new MongoFormSubmissionRepository();
