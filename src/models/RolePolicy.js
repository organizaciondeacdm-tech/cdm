const mongoose = require('mongoose');
const baseEntityPlugin = require('./plugins/baseEntityPlugin');

const rolePolicySchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  defaultPermissions: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

rolePolicySchema.statics.ensureDefaults = async function ensureDefaults() {
  const defaults = {
    admin: ['*'],
    supervisor: ['crear_escuela', 'editar_escuela', 'crear_docente', 'editar_docente', 'crear_alumno', 'editar_alumno', 'ver_reportes'],
    viewer: ['ver_reportes']
  };

  await Promise.all(Object.entries(defaults).map(async ([role, defaultPermissions]) => {
    await this.updateOne(
      { role },
      { $setOnInsert: { role, defaultPermissions } },
      { upsert: true }
    );
  }));
};

rolePolicySchema.statics.getByRole = async function getByRole(role) {
  await this.ensureDefaults();
  return this.findOne({ role }).lean();
};

rolePolicySchema.statics.getAllPolicies = async function getAllPolicies() {
  await this.ensureDefaults();
  return this.find({}).lean();
};

rolePolicySchema.plugin(baseEntityPlugin, {
  entityName: 'RolePolicy',
  sensitiveFields: []
});

module.exports = mongoose.model('RolePolicy', rolePolicySchema);
