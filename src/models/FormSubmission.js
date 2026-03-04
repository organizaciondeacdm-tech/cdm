const mongoose = require('mongoose');
const baseEntityPlugin = require('./plugins/baseEntityPlugin');

const formSubmissionSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormTemplate',
    required: true,
    index: true
  },
  templateName: { type: String, required: true, trim: true },
  templateVersion: { type: Number, default: 1 },
  idempotencyKey: { type: String, trim: true, index: true, sparse: true, unique: true },
  payload: { type: Object, default: {} },
  encryptedPayload: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  searchIndex: [{ type: String, index: true }],
  status: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'synced'
  },
  sessionId: { type: String, index: true },
  createdBy: { type: String, default: 'anonymous' },
  updatedBy: { type: String, default: 'anonymous' }
}, {
  timestamps: true
});

formSubmissionSchema.index({ templateId: 1, createdAt: -1 });
formSubmissionSchema.index({ status: 1, createdAt: -1 });

formSubmissionSchema.plugin(baseEntityPlugin, {
  entityName: 'FormSubmission',
  sensitiveFields: ['payload', 'encryptedPayload', 'iv', 'authTag', 'sessionId']
});

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
