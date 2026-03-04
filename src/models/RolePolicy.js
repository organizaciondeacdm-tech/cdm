const { BaseMongoModel } = require('./base/mongoModel');
const { buildLookupKey, normalizeRole, normalizePermission, protectAcl, revealAcl } = require('../utils/accessControlCrypto');

class RolePolicy extends BaseMongoModel {
  static collectionName = 'role_policies';

  static getRoleLookup(role) {
    return buildLookupKey('role', normalizeRole(role));
  }

  static transformOnRead(doc) {
    return revealAcl(doc, 'role', 'defaultPermissions');
  }

  static async preUpdate(update) {
    const next = { ...(update || {}) };
    next.$set = { ...(next.$set || {}) };

    const hasRole = Object.prototype.hasOwnProperty.call(next.$set, 'role');
    const hasPerms = Object.prototype.hasOwnProperty.call(next.$set, 'defaultPermissions');
    if (!hasRole && !hasPerms) return next;

    const secured = protectAcl({
      role: hasRole ? next.$set.role : 'viewer',
      permissions: hasPerms ? next.$set.defaultPermissions : [],
      recordedAt: new Date()
    });

    if (hasRole) {
      next.$set.role = secured.role;
      next.$set.roleLookup = secured.roleLookup;
    }
    if (hasPerms) {
      next.$set.defaultPermissions = secured.permissions;
      next.$set.defaultPermissionsLookup = secured.permissionsLookup;
    }

    next.$set.aclSecurity = {
      ...(next.$set.aclSecurity || {}),
      scheme: 'aclv1',
      securedAt: secured.securedAt,
      recordedAt: secured.recordedAt
    };

    return next;
  }

  static async preSave(payload) {
    const role = normalizeRole(payload.role || 'viewer');
    const defaultPermissions = (Array.isArray(payload.defaultPermissions) ? payload.defaultPermissions : [])
      .map((p) => normalizePermission(p))
      .filter(Boolean);
    const secured = protectAcl({
      role,
      permissions: defaultPermissions,
      recordedAt: payload.createdAt || new Date()
    });

    payload.role = secured.role;
    payload.roleLookup = secured.roleLookup;
    payload.defaultPermissions = secured.permissions;
    payload.defaultPermissionsLookup = secured.permissionsLookup;
    payload.aclSecurity = {
      ...(payload.aclSecurity || {}),
      scheme: 'aclv1',
      securedAt: secured.securedAt,
      recordedAt: secured.recordedAt
    };
  }

  static async ensureDefaults() {
    const defaults = {
      admin: ['*'],
      supervisor: [
        'crear_escuela', 'editar_escuela', 'eliminar_escuela',
        'crear_docente', 'editar_docente', 'eliminar_docente',
        'crear_alumno', 'editar_alumno', 'eliminar_alumno',
        'exportar_datos', 'ver_reportes'
      ],
      viewer: ['ver_reportes']
    };

    await Promise.all(Object.entries(defaults).map(async ([role, defaultPermissions]) => {
      const roleLookup = this.getRoleLookup(role);
      const existing = await this.findOne({ $or: [{ roleLookup }, { role }] });
      if (!existing) {
        await this.create({ role, defaultPermissions });
        return;
      }

      const existingPerms = Array.isArray(existing.defaultPermissions) ? existing.defaultPermissions : [];
      const mergedPermissions = Array.from(new Set([...existingPerms, ...defaultPermissions]));
      const hasDiff = mergedPermissions.length !== existingPerms.length;
      if (hasDiff) {
        await this.updateOne(
          { $or: [{ roleLookup }, { role }] },
          { $set: { defaultPermissions: mergedPermissions } }
        );
      }
    }));
  }

  static async getByRole(role) {
    await this.ensureDefaults();
    const roleLookup = this.getRoleLookup(role);
    return this.findOne({ $or: [{ roleLookup }, { role }] }).lean();
  }

  static async getAllPolicies() {
    await this.ensureDefaults();
    return this.find({}).lean();
  }
}

module.exports = RolePolicy;
