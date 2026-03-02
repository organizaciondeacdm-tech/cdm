const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['text', 'textarea', 'email', 'number', 'date', 'select'],
    default: 'text'
  },
  required: { type: Boolean, default: false },
  placeholder: { type: String, trim: true },
  options: [{ type: String, trim: true }],
  suggestionSource: { type: String, enum: ['escuelas', 'docentes', 'alumnos', 'none'], default: 'none' }
}, { _id: false });

const formTemplateSchema = new mongoose.Schema({
  templateKey: { type: String, required: true, trim: true, lowercase: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  entityType: { type: String, enum: ['escuela', 'docente', 'alumno', 'custom'], default: 'custom' },
  fields: { type: [fieldSchema], default: [] },
  isActive: { type: Boolean, default: true },
  isLatest: { type: Boolean, default: true, index: true },
  version: { type: Number, default: 1 },
  parentTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormTemplate' },
  metadata: { type: Object, default: {} }
}, {
  timestamps: true
});

formTemplateSchema.index({ templateKey: 1, version: 1 }, { unique: true });
formTemplateSchema.index({ entityType: 1, isActive: 1 });

formTemplateSchema.pre('validate', function(next) {
  if (!this.templateKey && this.name) {
    this.templateKey = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
  next();
});

module.exports = mongoose.model('FormTemplate', formTemplateSchema);
