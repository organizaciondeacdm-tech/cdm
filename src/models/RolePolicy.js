const { BaseMongoModel } = require('./base/mongoModel');

class RolePolicy extends BaseMongoModel {
  static collectionName = 'role_policies';

  static async ensureDefaults() {
    const defaults = {
      admin: ['*'],
      supervisor: ['crear_escuela', 'editar_escuela', 'crear_docente', 'editar_docente', 'crear_alumno', 'editar_alumno', 'ver_reportes'],
      viewer: ['ver_reportes']
    };

    await Promise.all(Object.entries(defaults).map(async ([role, defaultPermissions]) => {
      const existing = await this.findOne({ role });
      if (!existing) {
        await this.create({ role, defaultPermissions });
      }
    }));
  }

  static async getByRole(role) {
    await this.ensureDefaults();
    return this.findOne({ role }).lean();
  }

  static async getAllPolicies() {
    await this.ensureDefaults();
    return this.find({}).lean();
  }
}

module.exports = RolePolicy;
