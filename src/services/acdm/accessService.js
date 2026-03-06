const { isPrivilegedRole } = require('../../services/privilegedRoleService');

const canViewAllRecords = async (user) => {
  const rol = String(user?.rol || '');
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  return await isPrivilegedRole(rol) || permisos.includes('*');
};

module.exports = {
  canViewAllRecords
};
