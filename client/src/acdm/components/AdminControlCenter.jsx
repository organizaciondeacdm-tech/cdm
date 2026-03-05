import { useEffect, useMemo, useState } from "react";
import apiService from "../services/acdmApi.js";
import { setAuthSession } from "../../utils/authSession.js";

const EMPTY_USER_FORM = {
  username: "",
  email: "",
  nombre: "",
  apellido: "",
  rol: "viewer",
  password: "",
  permisos: []
};

const SECTION_TITLES = {
  "admin-users": "Usuarios",
  "admin-sessions": "Sesiones",
  "admin-roles": "Roles",
  "admin-permissions": "Permisos",
  "admin-traffic": "Tráfico en tiempo real",
  "admin-security": "Seguridad IP"
};

export function AdminControlCenter({ section, currentUser, onNavigateSection, onSessionSwitched }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [impersonatingUserId, setImpersonatingUserId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [rolePermissionSearch, setRolePermissionSearch] = useState("");
  const [selectedRoleNames, setSelectedRoleNames] = useState([]);
  const [roleBulkPermission, setRoleBulkPermission] = useState("");
  const [roleBulkApplyToUsers, setRoleBulkApplyToUsers] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissionNames, setSelectedPermissionNames] = useState([]);
  const [permissionTargetRole, setPermissionTargetRole] = useState("");
  const [permissionApplyToUsers, setPermissionApplyToUsers] = useState(false);

  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [editingUserId, setEditingUserId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [realtime, setRealtime] = useState(null);
  const [history, setHistory] = useState([]);
  const [trafficLastUpdatedAt, setTrafficLastUpdatedAt] = useState(null);
  const [trafficAutoRefresh, setTrafficAutoRefresh] = useState(true);
  const [trafficRefreshMs, setTrafficRefreshMs] = useState(3000);
  const [trafficHistoryLimit, setTrafficHistoryLimit] = useState(200);
  const [trafficSearch, setTrafficSearch] = useState("");
  const [trafficMethod, setTrafficMethod] = useState("all");
  const [trafficStatus, setTrafficStatus] = useState("all");
  const [trafficOnlyBlocked, setTrafficOnlyBlocked] = useState(false);
  const [trafficActionIp, setTrafficActionIp] = useState("");
  const [trafficTopFilterIp, setTrafficTopFilterIp] = useState("");
  const [trafficTopFilterTotalMin, setTrafficTopFilterTotalMin] = useState("");
  const [trafficTopFilter429Min, setTrafficTopFilter429Min] = useState("");
  const [trafficTopFilterBlocked, setTrafficTopFilterBlocked] = useState("all");
  const [trafficTopPage, setTrafficTopPage] = useState(1);
  const [trafficTopPageSize, setTrafficTopPageSize] = useState(10);
  const [trafficPage, setTrafficPage] = useState(1);
  const [trafficPageSize, setTrafficPageSize] = useState(25);
  const [trafficHistFilterTime, setTrafficHistFilterTime] = useState("");
  const [trafficHistFilterIp, setTrafficHistFilterIp] = useState("");
  const [trafficHistFilterPath, setTrafficHistFilterPath] = useState("");
  const [trafficHistFilterMethod, setTrafficHistFilterMethod] = useState("all");
  const [trafficHistFilterStatus, setTrafficHistFilterStatus] = useState("");
  const [trafficHistFilterMsMin, setTrafficHistFilterMsMin] = useState("");
  const [trafficHistFilterMsMax, setTrafficHistFilterMsMax] = useState("");
  const [selectedTrafficIps, setSelectedTrafficIps] = useState([]);

  const [bans, setBans] = useState([]);
  const [securitySearch, setSecuritySearch] = useState("");
  const [selectedBanIps, setSelectedBanIps] = useState([]);
  const [rules, setRules] = useState(null);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [notice, setNotice] = useState("");
  const [auditRows, setAuditRows] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(25);
  const [auditUsernameFilter, setAuditUsernameFilter] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");

  const [banForm, setBanForm] = useState({ ip: "", minutes: 60, reason: "", permanent: false });

  const permissionCatalog = useMemo(() => permissions.map((p) => p.permiso), [permissions]);
  const roleOptions = useMemo(() => {
    const fromApi = roles
      .map((r) => String(r?.role || "").trim().toLowerCase())
      .filter(Boolean);
    const fallback = ["admin", "desarrollador", "supervisor", "viewer"];
    return Array.from(new Set([...fromApi, ...fallback]));
  }, [roles]);
  const actorRole = String(currentUser?.rol || "").trim().toLowerCase();
  const canImpersonateUsers = currentUser?.capabilities?.isDeveloper === true || actorRole === "desarrollador" || actorRole === "desarollador";
  const userRows = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => {
      const username = String(u?.username || "").toLowerCase();
      const email = String(u?.email || "").toLowerCase();
      const role = String(u?.rol || "").toLowerCase();
      return username.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [users, userSearch]);
  const roleRows = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((r) => {
      const role = String(r?.role || "").toLowerCase();
      return role.includes(query);
    });
  }, [roles, roleSearch]);
  const permissionRows = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter((p) => String(p?.permiso || "").toLowerCase().includes(query));
  }, [permissions, permissionSearch]);
  const rolePermissionRows = useMemo(() => {
    const query = rolePermissionSearch.trim().toLowerCase();
    if (!query) return permissionCatalog;
    return permissionCatalog.filter((perm) => String(perm || "").toLowerCase().includes(query));
  }, [permissionCatalog, rolePermissionSearch]);
  const compactPermissionToken = (token = "") => {
    const value = String(token || "");
    if (value.length <= 22) return value;
    return `${value.slice(0, 14)}...${value.slice(-6)}`;
  };
  const compactRoleToken = (token = "") => {
    const value = String(token || "");
    if (value.length <= 20) return value;
    return `${value.slice(0, 12)}...${value.slice(-6)}`;
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm(EMPTY_USER_FORM);
  };

  const loadUsers = async () => {
    const usersPromise = apiService.getAdminUsers();
    const rolesPromise = canImpersonateUsers
      ? apiService.getRoles().catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] });
    const permsPromise = canImpersonateUsers
      ? apiService.getPermisos().catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] });

    const [usersRes, permsRes, rolesRes] = await Promise.all([
      usersPromise,
      permsPromise,
      rolesPromise
    ]);
    setUsers(Array.isArray(usersRes?.data) ? usersRes.data : []);
    setPermissions(Array.isArray(permsRes?.data) ? permsRes.data : []);
    setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
  };

  const loadSessions = async () => {
    const sessionsRes = await apiService.getActiveSessionsView({ preferAdmin: true });
    setSessions(Array.isArray(sessionsRes?.data) ? sessionsRes.data : []);
  };

  const loadTraffic = async (options = {}) => {
    const limit = Number(options.limit ?? trafficHistoryLimit) || 200;
    const [rtRes, histRes] = await Promise.all([
      apiService.getSecurityTrafficRealtime(),
      apiService.getSecurityTrafficHistory(limit)
    ]);
    setRealtime(rtRes?.data || null);
    setHistory(Array.isArray(histRes?.data) ? histRes.data : []);
    setTrafficLastUpdatedAt(new Date());
  };

  const loadSecurity = async () => {
    const [bansRes, rulesRes] = await Promise.all([
      apiService.getBannedIps(),
      apiService.getSecurityRules()
    ]);
    setBans(Array.isArray(bansRes?.data) ? bansRes.data : []);
    setRules(rulesRes?.data || null);
  };

  const loadAudit = async (options = {}) => {
    const page = Number(options.page ?? auditPage) || 1;
    const limit = Number(options.limit ?? auditLimit) || 25;
    const response = await apiService.getAuditHistory({
      page,
      limit,
      username: options.username ?? auditUsernameFilter,
      action: options.action ?? auditActionFilter
    });
    const payload = response?.data || {};
    setAuditRows(Array.isArray(payload.rows) ? payload.rows : []);
    setAuditTotal(Number(payload.total || 0));
    setAuditPage(Number(payload.page || page));
    setAuditLimit(Number(payload.limit || limit));
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      if (["admin-users", "admin-roles", "admin-permissions"].includes(section)) {
        await loadUsers();
      }

      if (["admin-sessions", "admin-secret"].includes(section)) {
        await loadSessions();
      }

      if (["admin-traffic"].includes(section)) {
        await Promise.all([loadTraffic(), loadSecurity()]);
      }

      if (["admin-security"].includes(section)) {
        await Promise.all([loadSecurity(), loadAudit({ page: 1 })]);
      }
    } catch (err) {
      setError(err.message || "No se pudo cargar la sección de administración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [section]);

  useEffect(() => {
    if (section !== "admin-traffic" || !trafficAutoRefresh) return;
    const timer = setInterval(() => {
      loadTraffic({ limit: trafficHistoryLimit }).catch(() => {});
    }, trafficRefreshMs);
    return () => clearInterval(timer);
  }, [section, trafficAutoRefresh, trafficRefreshMs, trafficHistoryLimit]);

  useEffect(() => {
    if (section !== "admin-traffic") return;
    loadTraffic({ limit: trafficHistoryLimit }).catch(() => {});
  }, [section, trafficHistoryLimit]);

  useEffect(() => {
    const validIds = new Set(users.map((u) => String(u?._id)));
    setSelectedUserIds((prev) => prev.filter((id) => validIds.has(String(id))));
  }, [users]);

  useEffect(() => {
    const validRoles = new Set(roles.map((r) => String(r?.role || "").trim().toLowerCase()));
    setSelectedRoleNames((prev) => prev.filter((role) => validRoles.has(String(role).trim().toLowerCase())));
    setPermissionTargetRole((prev) => {
      if (!prev) return validRoles.values().next().value || "";
      return validRoles.has(String(prev).trim().toLowerCase()) ? prev : (validRoles.values().next().value || "");
    });
  }, [roles]);

  useEffect(() => {
    const validPerms = new Set(permissions.map((p) => String(p?.permiso || "").trim()));
    setSelectedPermissionNames((prev) => prev.filter((perm) => validPerms.has(String(perm).trim())));
    if (!roleBulkPermission && permissions.length > 0) {
      setRoleBulkPermission(String(permissions[0]?.permiso || ""));
    }
  }, [permissions, roleBulkPermission]);

  useEffect(() => {
    const query = trafficSearch.trim().toLowerCase();
    const colIp = trafficTopFilterIp.trim().toLowerCase();
    const totalMin = Number(trafficTopFilterTotalMin);
    const blockedMin = Number(trafficTopFilter429Min);
    const rows = Array.isArray(realtime?.topIps) ? realtime.topIps : [];
    const filtered = rows.filter((row) => {
      const ip = String(row?.ip || "").toLowerCase();
      if (query && !ip.includes(query)) return false;
      if (colIp && !ip.includes(colIp)) return false;
      const total = Number(row?.total || 0);
      const blocked = Number(row?.blocked || 0);
      if (Number.isFinite(totalMin) && trafficTopFilterTotalMin !== "" && total < totalMin) return false;
      if (Number.isFinite(blockedMin) && trafficTopFilter429Min !== "" && blocked < blockedMin) return false;
      if (trafficTopFilterBlocked === "blocked" && !row?.isBlocked) return false;
      if (trafficTopFilterBlocked === "unblocked" && row?.isBlocked) return false;
      return true;
    });
    const validIps = new Set(filtered.map((row) => String(row?.ip || "")));
    setSelectedTrafficIps((prev) => prev.filter((ip) => validIps.has(String(ip || ""))));
  }, [
    realtime,
    trafficSearch,
    trafficTopFilterIp,
    trafficTopFilterTotalMin,
    trafficTopFilter429Min,
    trafficTopFilterBlocked
  ]);

  useEffect(() => {
    const query = securitySearch.trim().toLowerCase();
    const filtered = query
      ? bans.filter((row) => {
        const ip = String(row?.ip || "").toLowerCase();
        const reason = String(row?.reason || "").toLowerCase();
        return ip.includes(query) || reason.includes(query);
      })
      : bans;
    const validIps = new Set(filtered.map((row) => String(row?.ip || "")));
    setSelectedBanIps((prev) => prev.filter((ip) => validIps.has(String(ip || ""))));
  }, [bans, securitySearch]);

  useEffect(() => {
    if (section !== "admin-security") return;
    loadAudit({ page: 1 }).catch(() => {});
  }, [section, auditUsernameFilter, auditActionFilter, auditLimit]);

  const startEditUser = (user) => {
    setEditingUserId(user._id);
    setUserForm({
      username: user.username || "",
      email: user.email || "",
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      rol: user.rol || "viewer",
      password: "",
      permisos: Array.isArray(user.permisos) ? user.permisos : []
    });
  };

  const togglePermInForm = (perm) => {
    setUserForm((prev) => {
      const exists = prev.permisos.includes(perm);
      return {
        ...prev,
        permisos: exists ? prev.permisos.filter((p) => p !== perm) : [...prev.permisos, perm]
      };
    });
  };

  const saveUser = async () => {
    if (!userForm.username.trim() || !userForm.email.trim()) {
      setError("username y email son requeridos");
      return;
    }

    if (!editingUserId && !userForm.password.trim()) {
      setError("password es requerido para crear usuario");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        username: userForm.username.trim(),
        email: userForm.email.trim(),
        nombre: userForm.nombre.trim(),
        apellido: userForm.apellido.trim(),
        rol: userForm.rol,
        permisos: userForm.permisos
      };

      if (userForm.password.trim()) payload.password = userForm.password.trim();

      if (editingUserId) {
        await apiService.updateAdminUser(editingUserId, payload);
      } else {
        await apiService.createAdminUser(payload);
      }

      resetUserForm();
      await loadUsers();
    } catch (err) {
      setError(err.message || "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("¿Eliminar usuario?")) return;
    try {
      await apiService.deleteAdminUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message || "No se pudo eliminar el usuario");
    }
  };

  const toggleUserSelection = (id) => {
    const key = String(id);
    setSelectedUserIds((prev) => (
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    ));
  };

  const toggleSelectAllUserRows = () => {
    const rowIds = userRows
      .map((u) => String(u?._id))
      .filter((id) => id && id !== String(currentUser?._id));
    if (rowIds.length === 0) return;
    setSelectedUserIds((prev) => {
      const allSelected = rowIds.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !rowIds.includes(id));
      const next = new Set(prev);
      rowIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const runBulkUserAction = async (action) => {
    if (selectedUserIds.length === 0) return;
    const labels = {
      activate: "activar",
      deactivate: "desactivar",
      delete: "eliminar"
    };
    const actionLabel = labels[action] || action;
    if (!window.confirm(`¿Confirma ${actionLabel} ${selectedUserIds.length} usuario(s)?`)) return;

    setError("");
    try {
      await apiService.bulkAdminUsers(action, selectedUserIds);
      setSelectedUserIds([]);
      await loadUsers();
    } catch (err) {
      setError(err.message || "No se pudo ejecutar la acción masiva");
    }
  };

  const impersonateUser = async (id) => {
    if (!canImpersonateUsers) {
      setError("Solo el rol desarrollador puede usar 'entrar como usuario'");
      return;
    }
    if (String(id) === String(currentUser?._id)) {
      setError("Ya estás autenticado como ese usuario");
      return;
    }
    if (!window.confirm("Se iniciará sesión como este usuario. ¿Continuar?")) return;

    setError("");
    setImpersonatingUserId(String(id));
    try {
      const response = await apiService.impersonateAdminUser(id);
      const targetUser = response?.data?.user;
      const access = response?.data?.tokens?.access;
      const refresh = response?.data?.tokens?.refresh;
      if (!targetUser || !access || !refresh) {
        throw new Error("Respuesta inválida al entrar como usuario");
      }

      await setAuthSession({
        user: targetUser,
        tokens: { access, refresh },
        updatedAt: Date.now()
      });
      if (typeof onSessionSwitched === "function") onSessionSwitched(targetUser);
      window.location.reload();
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión como el usuario");
    } finally {
      setImpersonatingUserId("");
    }
  };

  const toggleRoleSelection = (role) => {
    const key = String(role || "").trim().toLowerCase();
    if (!key) return;
    setSelectedRoleNames((prev) => (
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    ));
  };

  const toggleSelectAllRoleRows = () => {
    const rowRoles = roleRows.map((r) => String(r?.role || "").trim().toLowerCase()).filter(Boolean);
    if (rowRoles.length === 0) return;
    setSelectedRoleNames((prev) => {
      const allSelected = rowRoles.every((role) => prev.includes(role));
      if (allSelected) return prev.filter((role) => !rowRoles.includes(role));
      const next = new Set(prev);
      rowRoles.forEach((role) => next.add(role));
      return [...next];
    });
  };

  const runBulkRolePermissions = async (operation, rolesToApply = selectedRoleNames, permsToApply = []) => {
    const rolesList = (Array.isArray(rolesToApply) ? rolesToApply : []).map((r) => String(r || "").trim().toLowerCase()).filter(Boolean);
    const permsList = (Array.isArray(permsToApply) ? permsToApply : []).map((p) => String(p || "").trim()).filter(Boolean);

    if (rolesList.length === 0) {
      setError("Seleccione al menos un rol");
      return;
    }
    if (permsList.length === 0) {
      setError("Seleccione al menos un permiso");
      return;
    }

    const labels = { add: "agregar", remove: "quitar", replace: "reemplazar" };
    const label = labels[operation] || operation;
    if (!window.confirm(`¿Confirma ${label} permisos en ${rolesList.length} rol(es)?`)) return;

    setError("");
    try {
      await apiService.bulkUpdateRolePermissions({
        roles: rolesList,
        permisos: permsList,
        operation,
        applyToUsers: roleBulkApplyToUsers
      });
      setNotice(`Permisos actualizados en ${rolesList.length} rol(es).`);
      await loadUsers();
    } catch (err) {
      setError(err.message || "No se pudo actualizar permisos en lote");
    }
  };

  const togglePermissionSelection = (perm) => {
    const key = String(perm || "").trim();
    if (!key) return;
    setSelectedPermissionNames((prev) => (
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    ));
  };

  const toggleSelectAllPermissionRows = () => {
    const rowPerms = permissionRows.map((p) => String(p?.permiso || "").trim()).filter(Boolean);
    if (rowPerms.length === 0) return;
    setSelectedPermissionNames((prev) => {
      const allSelected = rowPerms.every((perm) => prev.includes(perm));
      if (allSelected) return prev.filter((perm) => !rowPerms.includes(perm));
      const next = new Set(prev);
      rowPerms.forEach((perm) => next.add(perm));
      return [...next];
    });
  };

  const runPermissionToRoleAction = async (operation) => {
    const targetRole = String(permissionTargetRole || "").trim().toLowerCase();
    if (!targetRole) {
      setError("Seleccione un rol destino");
      return;
    }
    if (selectedPermissionNames.length === 0) {
      setError("Seleccione al menos un permiso");
      return;
    }

    setError("");
    try {
      await apiService.bulkUpdateRolePermissions({
        roles: [targetRole],
        permisos: selectedPermissionNames,
        operation,
        applyToUsers: permissionApplyToUsers
      });
      setNotice(`Permisos ${operation === "add" ? "agregados" : "quitados"} al rol ${targetRole}.`);
      await loadUsers();
    } catch (err) {
      setError(err.message || "No se pudo aplicar permisos al rol");
    }
  };

  const revokeSession = async (id) => {
    try {
      await apiService.revokeSessionFromActiveView(id, { asAdmin: true });
      await loadSessions();
    } catch (err) {
      setError(err.message || "No se pudo revocar la sesión");
    }
  };

  const sessionRows = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((s) => {
      const username = String(s.username || s.userId?.username || "").toLowerCase();
      const ip = String(s.deviceInfo?.ip || "").toLowerCase();
      const browser = String(s.deviceInfo?.browser || s.deviceInfo?.userAgent || "").toLowerCase();
      return username.includes(query) || ip.includes(query) || browser.includes(query);
    });
  }, [sessions, sessionSearch]);

  useEffect(() => {
    const validIds = new Set(sessionRows.map((s) => String(s._id)));
    setSelectedSessionIds((prev) => prev.filter((id) => validIds.has(String(id))));
  }, [sessionRows]);

  const toggleSessionSelection = (id) => {
    setSelectedSessionIds((prev) => {
      const key = String(id);
      return prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key];
    });
  };

  const toggleSelectAllSessionRows = () => {
    const rowIds = sessionRows.map((s) => String(s._id));
    if (rowIds.length === 0) return;
    setSelectedSessionIds((prev) => {
      const allSelected = rowIds.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !rowIds.includes(id));
      const next = new Set(prev);
      rowIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const revokeSelectedSessions = async () => {
    if (selectedSessionIds.length === 0) return;
    if (!window.confirm(`¿Cerrar ${selectedSessionIds.length} sesión(es) seleccionada(s)?`)) return;
    setError("");
    try {
      const results = await Promise.allSettled(
        selectedSessionIds.map((id) => apiService.revokeSessionFromActiveView(id, { asAdmin: true }))
      );
      setSelectedSessionIds([]);
      await loadSessions();
      const failedCount = results.filter((result) => result.status === "rejected").length;
      if (failedCount > 0) {
        setError(`Se cerraron ${selectedSessionIds.length - failedCount} sesión(es), pero ${failedCount} fallaron.`);
      }
    } catch (err) {
      setError(err.message || "No se pudieron cerrar las sesiones seleccionadas");
    }
  };

  const revokeAllSessions = async () => {
    if (sessions.length === 0) return;
    if (!window.confirm(`¿Cerrar todas las sesiones activas (${sessions.length})?`)) return;
    setError("");
    try {
      const results = await Promise.allSettled(
        sessions.map((s) => apiService.revokeSessionFromActiveView(s._id, { asAdmin: true }))
      );
      setSelectedSessionIds([]);
      await loadSessions();
      const failedCount = results.filter((result) => result.status === "rejected").length;
      if (failedCount > 0) {
        setError(`Se cerraron ${sessions.length - failedCount} sesión(es), pero ${failedCount} fallaron.`);
      }
    } catch (err) {
      setError(err.message || "No se pudieron cerrar todas las sesiones");
    }
  };

  const saveRolePermissions = async (role, nextPerms) => {
    try {
      await apiService.updateRolePermissions(role, nextPerms, false);
      await loadUsers();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el rol");
    }
  };

  const banIp = async () => {
    if (!banForm.ip.trim()) {
      setError("IP requerida");
      return;
    }

    try {
      await apiService.banIp({
        ip: banForm.ip.trim(),
        minutes: Number(banForm.minutes) || 60,
        reason: banForm.reason || 'Ban manual',
        permanent: banForm.permanent
      });
      setBanForm({ ip: "", minutes: 60, reason: "", permanent: false });
      await loadSecurity();
    } catch (err) {
      setError(err.message || "No se pudo bloquear IP");
    }
  };

  const unbanIp = async (ip) => {
    try {
      await apiService.unbanIp(ip);
      await loadSecurity();
    } catch (err) {
      setError(err.message || "No se pudo desbloquear IP");
    }
  };

  const saveRules = async () => {
    try {
      await apiService.updateSecurityRules(rules || {});
      await loadSecurity();
    } catch (err) {
      setError(err.message || "No se pudo guardar reglas");
    }
  };

  const runCleanupNow = async () => {
    try {
      setError("");
      const response = await apiService.cleanupSecurity({
        historyRetentionDays: rules?.historyRetentionDays
      });
      setCleanupResult(response?.data || null);
      await loadSecurity();
      if (section === "admin-traffic") {
        await loadTraffic();
      }
    } catch (err) {
      setError(err.message || "No se pudo ejecutar limpieza");
    }
  };

  const auditTotalPages = useMemo(() => {
    const total = Math.max(0, Number(auditTotal || 0));
    const size = Math.max(1, Number(auditLimit || 25));
    return Math.max(1, Math.ceil(total / size));
  }, [auditTotal, auditLimit]);

  const goAuditPage = async (nextPage) => {
    const page = Math.min(Math.max(1, Number(nextPage || 1)), auditTotalPages);
    try {
      await loadAudit({ page });
    } catch (err) {
      setError(err.message || "No se pudo cargar historial de auditoría");
    }
  };

  const clearRealtimeTrafficNow = async () => {
    if (!window.confirm("¿Limpiar métricas de Tráfico en tiempo real?")) return;
    try {
      setError("");
      const response = await apiService.clearSecurityTrafficRealtime();
      setNotice(`Tráfico RT limpiado. IPs reseteadas: ${response?.data?.resetIpRows || 0}`);
      await loadTraffic({ limit: trafficHistoryLimit });
    } catch (err) {
      setError(err.message || "No se pudo limpiar tráfico en tiempo real");
    }
  };

  const clearTrafficHistoryNow = async () => {
    if (!window.confirm("¿Limpiar Histórico reciente de tráfico?")) return;
    try {
      setError("");
      const response = await apiService.clearSecurityTrafficHistory();
      setNotice(`Histórico limpiado. Eventos eliminados: ${response?.data?.deletedTrafficEvents || 0}`);
      await loadTraffic({ limit: trafficHistoryLimit });
    } catch (err) {
      setError(err.message || "No se pudo limpiar histórico de tráfico");
    }
  };

  const isEventBlocked = (ev) => {
    return Boolean(ev?.blocked || ev?.isBlocked || Number(ev?.statusCode) === 429);
  };

  const trafficFilteredHistory = useMemo(() => {
    const query = trafficSearch.trim().toLowerCase();
    const colTime = trafficHistFilterTime.trim().toLowerCase();
    const colIp = trafficHistFilterIp.trim().toLowerCase();
    const colPath = trafficHistFilterPath.trim().toLowerCase();
    const colMethod = String(trafficHistFilterMethod || "all").toUpperCase();
    const colStatus = trafficHistFilterStatus.trim();
    const colMsMin = Number(trafficHistFilterMsMin);
    const colMsMax = Number(trafficHistFilterMsMax);
    return history
      .slice()
      .reverse()
      .filter((ev) => {
        if (query) {
          const ip = String(ev?.ip || "").toLowerCase();
          const path = String(ev?.path || "").toLowerCase();
          if (!ip.includes(query) && !path.includes(query)) return false;
        }

        if (trafficMethod !== "all" && String(ev?.method || "").toUpperCase() !== trafficMethod) {
          return false;
        }

        const statusCode = Number(ev?.statusCode || 0);
        if (trafficStatus === "2xx" && !(statusCode >= 200 && statusCode < 300)) return false;
        if (trafficStatus === "4xx" && !(statusCode >= 400 && statusCode < 500)) return false;
        if (trafficStatus === "5xx" && !(statusCode >= 500 && statusCode < 600)) return false;
        if (trafficStatus === "429" && statusCode !== 429) return false;

        if (trafficOnlyBlocked && !isEventBlocked(ev)) return false;

        const timeString = new Date(ev?.ts || Date.now()).toLocaleTimeString('es-AR').toLowerCase();
        if (colTime && !timeString.includes(colTime)) return false;
        if (colIp && !String(ev?.ip || "").toLowerCase().includes(colIp)) return false;
        if (colPath && !String(ev?.path || "").toLowerCase().includes(colPath)) return false;
        if (colMethod !== "ALL" && String(ev?.method || "").toUpperCase() !== colMethod) return false;
        if (colStatus && String(ev?.statusCode ?? "") !== colStatus) return false;

        const duration = Number(ev?.durationMs || 0);
        if (Number.isFinite(colMsMin) && trafficHistFilterMsMin !== "" && duration < colMsMin) return false;
        if (Number.isFinite(colMsMax) && trafficHistFilterMsMax !== "" && duration > colMsMax) return false;
        return true;
      });
  }, [
    history,
    trafficMethod,
    trafficOnlyBlocked,
    trafficSearch,
    trafficStatus,
    trafficHistFilterTime,
    trafficHistFilterIp,
    trafficHistFilterPath,
    trafficHistFilterMethod,
    trafficHistFilterStatus,
    trafficHistFilterMsMin,
    trafficHistFilterMsMax
  ]);

  const trafficTopIps = useMemo(() => {
    const query = trafficSearch.trim().toLowerCase();
    const colIp = trafficTopFilterIp.trim().toLowerCase();
    const totalMin = Number(trafficTopFilterTotalMin);
    const blockedMin = Number(trafficTopFilter429Min);
    const rows = Array.isArray(realtime?.topIps) ? realtime.topIps : [];
    return rows.filter((ipRow) => {
      const ip = String(ipRow?.ip || "").toLowerCase();
      if (query && !ip.includes(query)) return false;
      if (colIp && !ip.includes(colIp)) return false;

      const total = Number(ipRow?.total || 0);
      const blocked = Number(ipRow?.blocked || 0);
      if (Number.isFinite(totalMin) && trafficTopFilterTotalMin !== "" && total < totalMin) return false;
      if (Number.isFinite(blockedMin) && trafficTopFilter429Min !== "" && blocked < blockedMin) return false;

      if (trafficTopFilterBlocked === "blocked" && !ipRow?.isBlocked) return false;
      if (trafficTopFilterBlocked === "unblocked" && ipRow?.isBlocked) return false;
      return true;
    });
  }, [
    realtime,
    trafficSearch,
    trafficTopFilterIp,
    trafficTopFilterTotalMin,
    trafficTopFilter429Min,
    trafficTopFilterBlocked
  ]);

  const trafficTopTotalPages = useMemo(() => {
    const total = trafficTopIps.length;
    const size = Math.max(1, Number(trafficTopPageSize) || 10);
    return Math.max(1, Math.ceil(total / size));
  }, [trafficTopIps.length, trafficTopPageSize]);

  const paginatedTrafficTopIps = useMemo(() => {
    const size = Math.max(1, Number(trafficTopPageSize) || 10);
    const safePage = Math.min(Math.max(1, Number(trafficTopPage) || 1), trafficTopTotalPages);
    const start = (safePage - 1) * size;
    return trafficTopIps.slice(start, start + size);
  }, [trafficTopIps, trafficTopPage, trafficTopPageSize, trafficTopTotalPages]);

  const securityBanRows = useMemo(() => {
    const query = securitySearch.trim().toLowerCase();
    if (!query) return bans;
    return bans.filter((b) => {
      const ip = String(b?.ip || "").toLowerCase();
      const reason = String(b?.reason || "").toLowerCase();
      return ip.includes(query) || reason.includes(query);
    });
  }, [bans, securitySearch]);

  const trafficStats = useMemo(() => {
    const sample = trafficFilteredHistory;
    const total = sample.length;
    const blocked = sample.filter(isEventBlocked).length;
    const avgMs = total > 0
      ? Math.round(sample.reduce((acc, ev) => acc + Number(ev?.durationMs || 0), 0) / total)
      : 0;
    return { total, blocked, avgMs };
  }, [trafficFilteredHistory]);

  const trafficTotalPages = useMemo(() => {
    const total = trafficFilteredHistory.length;
    const size = Math.max(1, Number(trafficPageSize) || 25);
    return Math.max(1, Math.ceil(total / size));
  }, [trafficFilteredHistory.length, trafficPageSize]);

  const paginatedTrafficHistory = useMemo(() => {
    const size = Math.max(1, Number(trafficPageSize) || 25);
    const safePage = Math.min(Math.max(1, Number(trafficPage) || 1), trafficTotalPages);
    const start = (safePage - 1) * size;
    return trafficFilteredHistory.slice(start, start + size);
  }, [trafficFilteredHistory, trafficPage, trafficPageSize, trafficTotalPages]);

  useEffect(() => {
    setTrafficPage(1);
  }, [
    trafficSearch,
    trafficMethod,
    trafficStatus,
    trafficOnlyBlocked,
    trafficHistoryLimit,
    trafficPageSize,
    trafficHistFilterTime,
    trafficHistFilterIp,
    trafficHistFilterPath,
    trafficHistFilterMethod,
    trafficHistFilterStatus,
    trafficHistFilterMsMin,
    trafficHistFilterMsMax
  ]);

  useEffect(() => {
    if (trafficPage > trafficTotalPages) {
      setTrafficPage(trafficTotalPages);
    }
  }, [trafficPage, trafficTotalPages]);

  useEffect(() => {
    setTrafficTopPage(1);
  }, [trafficSearch, trafficTopFilterIp, trafficTopFilterTotalMin, trafficTopFilter429Min, trafficTopFilterBlocked, trafficTopPageSize]);

  useEffect(() => {
    if (trafficTopPage > trafficTopTotalPages) {
      setTrafficTopPage(trafficTopTotalPages);
    }
  }, [trafficTopPage, trafficTopTotalPages]);

  const banIpFromTraffic = async (ip) => {
    if (!ip) return;
    if (!window.confirm(`¿Banear IP ${ip}?`)) return;

    try {
      setTrafficActionIp(ip);
      setError("");
      await apiService.banIp({ ip, minutes: 60, reason: "Ban manual desde Tráfico", permanent: false });
      setNotice(`IP ${ip} bloqueada por 60 minutos.`);
      await Promise.all([loadTraffic({ limit: trafficHistoryLimit }), loadSecurity()]);
    } catch (err) {
      setError(err.message || "No se pudo bloquear la IP");
    } finally {
      setTrafficActionIp("");
    }
  };

  const unbanIpFromTraffic = async (ip) => {
    if (!ip) return;
    try {
      setTrafficActionIp(ip);
      setError("");
      await apiService.unbanIp(ip);
      setNotice(`IP ${ip} desbloqueada.`);
      await Promise.all([loadTraffic({ limit: trafficHistoryLimit }), loadSecurity()]);
    } catch (err) {
      setError(err.message || "No se pudo desbloquear la IP");
    } finally {
      setTrafficActionIp("");
    }
  };

  const toggleTrafficIpSelection = (ip) => {
    const key = String(ip || "").trim();
    if (!key) return;
    setSelectedTrafficIps((prev) => (
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    ));
  };

  const toggleSelectAllTrafficIps = () => {
    const rows = trafficTopIps.map((row) => String(row?.ip || "").trim()).filter(Boolean);
    if (rows.length === 0) return;
    setSelectedTrafficIps((prev) => {
      const allSelected = rows.every((ip) => prev.includes(ip));
      if (allSelected) return prev.filter((ip) => !rows.includes(ip));
      const next = new Set(prev);
      rows.forEach((ip) => next.add(ip));
      return [...next];
    });
  };

  const bulkBanSelectedTrafficIps = async () => {
    if (selectedTrafficIps.length === 0) return;
    if (!window.confirm(`¿Banear ${selectedTrafficIps.length} IP(s) seleccionada(s)?`)) return;
    try {
      setError("");
      await Promise.all(
        selectedTrafficIps.map((ip) => apiService.banIp({ ip, minutes: 60, reason: "Ban masivo desde Tráfico", permanent: false }))
      );
      setSelectedTrafficIps([]);
      await Promise.all([loadTraffic({ limit: trafficHistoryLimit }), loadSecurity()]);
      setNotice("IPs seleccionadas bloqueadas.");
    } catch (err) {
      setError(err.message || "No se pudieron bloquear las IPs seleccionadas");
    }
  };

  const bulkUnbanSelectedTrafficIps = async () => {
    if (selectedTrafficIps.length === 0) return;
    if (!window.confirm(`¿Desbloquear ${selectedTrafficIps.length} IP(s) seleccionada(s)?`)) return;
    try {
      setError("");
      await Promise.all(selectedTrafficIps.map((ip) => apiService.unbanIp(ip)));
      setSelectedTrafficIps([]);
      await Promise.all([loadTraffic({ limit: trafficHistoryLimit }), loadSecurity()]);
      setNotice("IPs seleccionadas desbloqueadas.");
    } catch (err) {
      setError(err.message || "No se pudieron desbloquear las IPs seleccionadas");
    }
  };

  const toggleBanIpSelection = (ip) => {
    const key = String(ip || "").trim();
    if (!key) return;
    setSelectedBanIps((prev) => (
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    ));
  };

  const toggleSelectAllBanIps = () => {
    const rows = securityBanRows.map((row) => String(row?.ip || "").trim()).filter(Boolean);
    if (rows.length === 0) return;
    setSelectedBanIps((prev) => {
      const allSelected = rows.every((ip) => prev.includes(ip));
      if (allSelected) return prev.filter((ip) => !rows.includes(ip));
      const next = new Set(prev);
      rows.forEach((ip) => next.add(ip));
      return [...next];
    });
  };

  const bulkUnbanSelectedBans = async () => {
    if (selectedBanIps.length === 0) return;
    if (!window.confirm(`¿Desbloquear ${selectedBanIps.length} IP(s) seleccionada(s)?`)) return;
    try {
      setError("");
      await Promise.all(selectedBanIps.map((ip) => apiService.unbanIp(ip)));
      setSelectedBanIps([]);
      await Promise.all([loadSecurity(), loadTraffic({ limit: trafficHistoryLimit })]);
      setNotice("Bloqueos seleccionados removidos.");
    } catch (err) {
      setError(err.message || "No se pudieron desbloquear las IPs seleccionadas");
    }
  };

  const exportTrafficCsv = () => {
    const headers = ["timestamp", "ip", "path", "method", "statusCode", "durationMs", "blocked"];
    const rows = trafficFilteredHistory.map((ev) => ([
      new Date(ev?.ts || Date.now()).toISOString(),
      ev?.ip || "",
      ev?.path || "",
      ev?.method || "",
      ev?.statusCode ?? "",
      ev?.durationMs ?? "",
      isEventBlocked(ev) ? "1" : "0"
    ]));

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traffic-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="card">Cargando {section}...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
          Admin: {SECTION_TITLES[section] || section}
        </h1>
        <button className="btn btn-secondary" onClick={loadData}>↻ Recargar</button>
      </div>

      {(section === "admin-traffic" || section === "admin-security") && (
        <div className="card mb-16">
          <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{
                background: section === "admin-traffic" ? "rgba(0,212,255,0.15)" : undefined,
                borderColor: section === "admin-traffic" ? "var(--accent)" : undefined
              }}
              onClick={() => onNavigateSection?.("admin-traffic")}
            >
              📡 Tráfico RT
            </button>
            <button
              className="btn btn-secondary btn-sm"
              style={{
                background: section === "admin-security" ? "rgba(0,212,255,0.15)" : undefined,
                borderColor: section === "admin-security" ? "var(--accent)" : undefined
              }}
              onClick={() => onNavigateSection?.("admin-security")}
            >
              🚫 Seguridad IP
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger mb-16"><span>⚠️</span>{error}</div>}
      {notice && <div className="alert alert-success mb-16"><span>✅</span>{notice}</div>}

      {section === "admin-users" && (
        <div className="card-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{editingUserId ? 'Editar usuario' : 'Crear usuario'}</span></div>
            <div className="form-group"><label className="form-label">Username</label><input className="form-input" value={userForm.username} onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={userForm.nombre} onChange={(e) => setUserForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={userForm.apellido} onChange={(e) => setUserForm((p) => ({ ...p, apellido: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Rol</label>
              <select className="form-select" value={userForm.rol} onChange={(e) => setUserForm((p) => ({ ...p, rol: e.target.value }))}>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="form-group"><label className="form-label">{editingUserId ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label><input type="password" className="form-input" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Permisos</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {permissionCatalog.map((perm) => (
                  <label key={perm} style={{ fontSize: 11 }}>
                    <input type="checkbox" checked={userForm.permisos.includes(perm)} onChange={() => togglePermInForm(perm)} /> {perm}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-primary" onClick={saveUser} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button className="btn btn-secondary" onClick={resetUserForm}>Limpiar</button>
            </div>
          </div>

          <div className="card table-wrap">
            <div className="flex items-center justify-between mb-16" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>herramientas</span>
                <button className="btn btn-secondary btn-sm" onClick={toggleSelectAllUserRows} disabled={userRows.length === 0}>
                  seleccionar
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => runBulkUserAction("activate")} disabled={selectedUserIds.length === 0}>
                  activar ({selectedUserIds.length})
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => runBulkUserAction("deactivate")} disabled={selectedUserIds.length === 0}>
                  desactivar ({selectedUserIds.length})
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => runBulkUserAction("delete")} disabled={selectedUserIds.length === 0}>
                  eliminar ({selectedUserIds.length})
                </button>
              </div>
              <input
                className="form-input"
                style={{ width: 220 }}
                placeholder="filtrar usuario / email / rol"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <table>
              <thead><tr><th style={{ width: 42 }}>Sel</th><th>Username</th><th>Email</th><th>Rol</th><th>Estado</th><th>Permisos</th><th>Acciones</th></tr></thead>
              <tbody>
                {userRows.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={String(u._id) === String(currentUser?._id)}
                        checked={selectedUserIds.includes(String(u._id))}
                        onChange={() => toggleUserSelection(u._id)}
                      />
                    </td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.rol}</td>
                    <td>{u.isActive === false ? "Inactivo" : "Activo"}</td>
                    <td style={{ fontSize: 11 }}>{(u.permisos || []).join(', ')}</td>
                    <td>
                      <div className="flex gap-4">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => impersonateUser(u._id)}
                          disabled={!canImpersonateUsers || String(u._id) === String(currentUser?._id) || impersonatingUserId === String(u._id)}
                          title={canImpersonateUsers ? "Entrar como este usuario" : "Solo desarrollador puede entrar como usuario"}
                        >
                          {impersonatingUserId === String(u._id) ? "Entrando..." : "Entrar como"}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEditUser(u)}>Editar</button>
                        <button className="btn btn-danger btn-sm" disabled={String(u._id) === String(currentUser?._id)} onClick={() => deleteUser(u._id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "admin-sessions" && (
        <div className="card table-wrap">
          <div className="flex items-center justify-between mb-16" style={{ gap: 8, flexWrap: "wrap" }}>
            <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>herramientas</span>
              <button className="btn btn-danger btn-sm" onClick={revokeAllSessions} disabled={sessions.length === 0}>
                cerrar todas
              </button>
              <button className="btn btn-secondary btn-sm" onClick={toggleSelectAllSessionRows} disabled={sessionRows.length === 0}>
                seleccionar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={revokeSelectedSessions} disabled={selectedSessionIds.length === 0}>
                cerrar seleccionadas ({selectedSessionIds.length})
              </button>
            </div>
            <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
              <input
                className="form-input"
                style={{ width: 220 }}
                placeholder="filtrar usuario / ip / navegador"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
              />
              <details>
                <summary className="btn btn-secondary btn-sm" style={{ listStyle: "none", cursor: "pointer" }}>más</summary>
                <div className="card" style={{ position: "absolute", marginTop: 8, zIndex: 5, minWidth: 200 }}>
                  <div className="flex" style={{ flexDirection: "column", gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSessionIds([])}>limpiar selección</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSessionSearch("")}>limpiar filtro</button>
                    <button className="btn btn-secondary btn-sm" onClick={loadSessions}>recargar sesiones</button>
                  </div>
                </div>
              </details>
            </div>
          </div>

          <table>
            <thead><tr><th style={{ width: 42 }}>Sel</th><th>Usuario</th><th>Estado</th><th>IP</th><th>Navegador</th><th>Última actividad</th><th>Expira</th><th>Acción</th></tr></thead>
            <tbody>
              {sessionRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text2)" }}>
                    No hay sesiones
                  </td>
                </tr>
              ) : sessionRows.map((s) => (
                <tr key={s._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.includes(String(s._id))}
                      onChange={() => toggleSessionSelection(s._id)}
                    />
                  </td>
                  <td>{s.username || s.userId?.username || "-"}</td>
                  <td>{s.isActive ? "Activa" : "Inactiva"}</td>
                  <td>{s.deviceInfo?.ip || '-'}</td>
                  <td>{s.deviceInfo?.browser || s.deviceInfo?.userAgent || '-'}</td>
                  <td>{s.lastActivity ? new Date(s.lastActivity).toLocaleString('es-AR') : '-'}</td>
                  <td>{s.expiresAt ? new Date(s.expiresAt).toLocaleString('es-AR') : '-'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => revokeSession(s._id)}>Revocar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "admin-roles" && (
        <>
          <div className="card mb-16">
            <div className="flex items-center justify-between" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>herramientas</span>
                <button className="btn btn-secondary btn-sm" onClick={toggleSelectAllRoleRows} disabled={roleRows.length === 0}>
                  seleccionar
                </button>
                <select className="form-select" style={{ width: 220 }} value={roleBulkPermission} onChange={(e) => setRoleBulkPermission(e.target.value)}>
                  <option value="">permiso...</option>
                  {permissionCatalog.map((perm) => (
                    <option key={perm} value={perm} title={perm}>{compactPermissionToken(perm)}</option>
                  ))}
                </select>
                <button className="btn btn-secondary btn-sm" onClick={() => runBulkRolePermissions("add", selectedRoleNames, [roleBulkPermission])} disabled={selectedRoleNames.length === 0 || !roleBulkPermission}>
                  agregar ({selectedRoleNames.length})
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => runBulkRolePermissions("remove", selectedRoleNames, [roleBulkPermission])} disabled={selectedRoleNames.length === 0 || !roleBulkPermission}>
                  quitar ({selectedRoleNames.length})
                </button>
                <label style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={roleBulkApplyToUsers} onChange={(e) => setRoleBulkApplyToUsers(e.target.checked)} /> aplicar a usuarios
                </label>
              </div>
              <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
                <input
                  className="form-input"
                  style={{ width: 190 }}
                  placeholder="filtrar rol"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
                <input
                  className="form-input"
                  style={{ width: 190 }}
                  placeholder="filtrar permiso"
                  value={rolePermissionSearch}
                  onChange={(e) => setRolePermissionSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card-grid">
          {roleRows.map((r) => {
            const selected = Array.isArray(r.defaultPermissions) ? r.defaultPermissions : [];
            return (
              <div className="card" key={r.role}>
                <div className="card-header">
                  <span className="card-title" title={r.role}>Rol: {compactRoleToken(r.role)}</span>
                  <label style={{ fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={selectedRoleNames.includes(String(r.role || "").trim().toLowerCase())}
                      onChange={() => toggleRoleSelection(r.role)}
                    /> seleccionar
                  </label>
                </div>
                <div className="flex items-center justify-between" style={{ marginBottom: 8, gap: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>Usuarios: {r.totalUsers}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>Permisos: {selected.length}</p>
                </div>
                <div className="flex gap-8 mb-8">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => saveRolePermissions(r.role, [...permissionCatalog])}
                    disabled={permissionCatalog.length === 0}
                  >
                    todo
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => saveRolePermissions(r.role, [])}>
                    ninguno
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {rolePermissionRows.map((perm) => {
                    const checked = selected.includes('*') || selected.includes(perm);
                    return (
                      <label key={perm} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(selected.filter((p) => p !== '*'));
                            if (e.target.checked) next.add(perm); else next.delete(perm);
                            saveRolePermissions(r.role, [...next]);
                          }}
                        />
                        <span style={{ fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={perm}>
                          {compactPermissionToken(perm)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {section === "admin-permissions" && (
        <div className="card table-wrap">
          <div className="flex items-center justify-between mb-16" style={{ gap: 8, flexWrap: "wrap" }}>
            <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>herramientas</span>
              <button className="btn btn-secondary btn-sm" onClick={toggleSelectAllPermissionRows} disabled={permissionRows.length === 0}>
                seleccionar
              </button>
              <select className="form-select" style={{ width: 200 }} value={permissionTargetRole} onChange={(e) => setPermissionTargetRole(e.target.value)}>
                <option value="">rol destino...</option>
                {roles.map((r) => (
                  <option key={r.role} value={String(r.role || "").toLowerCase()}>{r.role}</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => runPermissionToRoleAction("add")} disabled={!permissionTargetRole || selectedPermissionNames.length === 0}>
                agregar al rol
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => runPermissionToRoleAction("remove")} disabled={!permissionTargetRole || selectedPermissionNames.length === 0}>
                quitar del rol
              </button>
              <label style={{ fontSize: 12 }}>
                <input type="checkbox" checked={permissionApplyToUsers} onChange={(e) => setPermissionApplyToUsers(e.target.checked)} /> aplicar a usuarios
              </label>
            </div>
            <input
              className="form-input"
              style={{ width: 220 }}
              placeholder="filtrar permiso"
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
            />
          </div>

          <table>
            <thead><tr><th style={{ width: 42 }}>Sel</th><th>Permiso</th><th>Usuarios asignados</th></tr></thead>
            <tbody>
              {permissionRows.map((p) => (
                <tr key={p.permiso}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPermissionNames.includes(String(p.permiso || ""))}
                      onChange={() => togglePermissionSelection(p.permiso)}
                    />
                  </td>
                  <td>{p.permiso}</td>
                  <td>{p.assignedUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "admin-traffic" && (
        <>
          <div className="card mb-16">
            <div className="card-header"><span className="card-title">Controles de Tráfico</span></div>
            <div className="flex gap-8" style={{ flexWrap: "wrap", alignItems: "center" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setTrafficAutoRefresh((v) => !v)}
              >
                {trafficAutoRefresh ? "⏸ Auto-refresh ON" : "▶ Auto-refresh OFF"}
              </button>
              <select className="form-select" style={{ width: 160 }} value={trafficRefreshMs} onChange={(e) => setTrafficRefreshMs(Number(e.target.value))}>
                <option value={2000}>Cada 2s</option>
                <option value={3000}>Cada 3s</option>
                <option value={5000}>Cada 5s</option>
                <option value={10000}>Cada 10s</option>
              </select>
              <select className="form-select" style={{ width: 180 }} value={trafficHistoryLimit} onChange={(e) => setTrafficHistoryLimit(Number(e.target.value))}>
                <option value={100}>Histórico 100</option>
                <option value={200}>Histórico 200</option>
                <option value={500}>Histórico 500</option>
                <option value={1000}>Histórico 1000</option>
              </select>
              <input className="form-input" style={{ width: 220 }} placeholder="Filtrar IP o ruta..." value={trafficSearch} onChange={(e) => setTrafficSearch(e.target.value)} />
              <select className="form-select" style={{ width: 140 }} value={trafficMethod} onChange={(e) => setTrafficMethod(e.target.value)}>
                <option value="all">Método: Todos</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              <select className="form-select" style={{ width: 140 }} value={trafficStatus} onChange={(e) => setTrafficStatus(e.target.value)}>
                <option value="all">Status: Todos</option>
                <option value="2xx">2xx</option>
                <option value="4xx">4xx</option>
                <option value="5xx">5xx</option>
                <option value="429">Solo 429</option>
              </select>
              <label style={{ fontSize: 12 }}>
                <input type="checkbox" checked={trafficOnlyBlocked} onChange={(e) => setTrafficOnlyBlocked(e.target.checked)} /> Solo bloqueadas
              </label>
              <button className="btn btn-secondary btn-sm" onClick={toggleSelectAllTrafficIps} disabled={trafficTopIps.length === 0}>
                seleccionar IPs
              </button>
              <button className="btn btn-danger btn-sm" onClick={bulkBanSelectedTrafficIps} disabled={selectedTrafficIps.length === 0}>
                banear sel. ({selectedTrafficIps.length})
              </button>
              <button className="btn btn-secondary btn-sm" onClick={bulkUnbanSelectedTrafficIps} disabled={selectedTrafficIps.length === 0}>
                desbloquear sel. ({selectedTrafficIps.length})
              </button>
              <button className="btn btn-secondary btn-sm" onClick={exportTrafficCsv}>CSV</button>
              <button className="btn btn-secondary btn-sm" onClick={clearRealtimeTrafficNow}>
                Limpiar RT
              </button>
              <button className="btn btn-secondary btn-sm" onClick={clearTrafficHistoryNow}>
                Limpiar histórico
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setTrafficSearch("");
                setTrafficMethod("all");
                setTrafficStatus("all");
                setTrafficOnlyBlocked(false);
                setTrafficTopFilterIp("");
                setTrafficTopFilterTotalMin("");
                setTrafficTopFilter429Min("");
                setTrafficTopFilterBlocked("all");
                setTrafficHistFilterTime("");
                setTrafficHistFilterIp("");
                setTrafficHistFilterPath("");
                setTrafficHistFilterMethod("all");
                setTrafficHistFilterStatus("");
                setTrafficHistFilterMsMin("");
                setTrafficHistFilterMsMax("");
              }}>Limpiar filtros</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text2)" }}>
              Última actualización: {trafficLastUpdatedAt ? trafficLastUpdatedAt.toLocaleTimeString("es-AR") : "sin datos"} | Eventos visibles: {trafficStats.total} | Bloqueados: {trafficStats.blocked} | Latencia media: {trafficStats.avgMs} ms
            </div>
          </div>

        <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Tráfico en tiempo real</span></div>
            <p>RPM: <strong>{realtime?.requestPerMinute || 0}</strong></p>
            <p>Bloqueadas/min: <strong>{realtime?.blockedPerMinute || 0}</strong></p>
            <p>IPs activas: <strong>{realtime?.activeIps || 0}</strong></p>
            <div className="flex items-center justify-between mb-8" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="flex items-center gap-8">
                <button className="btn btn-secondary btn-sm" onClick={() => setTrafficTopPage((p) => Math.max(1, p - 1))} disabled={trafficTopPage <= 1}>
                  ◀ Anterior
                </button>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  Página {trafficTopPage} / {trafficTopTotalPages}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setTrafficTopPage((p) => Math.min(trafficTopTotalPages, p + 1))} disabled={trafficTopPage >= trafficTopTotalPages}>
                  Siguiente ▶
                </button>
              </div>
              <select className="form-select" style={{ width: 150 }} value={trafficTopPageSize} onChange={(e) => setTrafficTopPageSize(Number(e.target.value))}>
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>
            <div className="table-wrap" style={{ maxHeight: 260 }}>
              <table>
                <thead>
                  <tr><th style={{ width: 42 }}>Sel</th><th>IP</th><th>Total</th><th>429</th><th>Bloqueada</th><th>Acción</th></tr>
                  <tr>
                    <th></th>
                    <th><input className="form-input" style={{ width: 120 }} placeholder="ip" value={trafficTopFilterIp} onChange={(e) => setTrafficTopFilterIp(e.target.value)} /></th>
                    <th><input className="form-input" style={{ width: 90 }} placeholder="min" value={trafficTopFilterTotalMin} onChange={(e) => setTrafficTopFilterTotalMin(e.target.value)} /></th>
                    <th><input className="form-input" style={{ width: 90 }} placeholder="min" value={trafficTopFilter429Min} onChange={(e) => setTrafficTopFilter429Min(e.target.value)} /></th>
                    <th>
                      <select className="form-select" style={{ width: 120 }} value={trafficTopFilterBlocked} onChange={(e) => setTrafficTopFilterBlocked(e.target.value)}>
                        <option value="all">todos</option>
                        <option value="blocked">sí</option>
                        <option value="unblocked">no</option>
                      </select>
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrafficTopIps.map((ip) => (
                    <tr key={ip.ip}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedTrafficIps.includes(String(ip.ip || ""))}
                          onChange={() => toggleTrafficIpSelection(ip.ip)}
                        />
                      </td>
                      <td>{ip.ip}</td>
                      <td>{ip.total}</td>
                      <td>{ip.blocked}</td>
                      <td>{ip.isBlocked ? 'Sí' : 'No'}</td>
                      <td>
                        {ip.isBlocked ? (
                          <button className="btn btn-secondary btn-sm" disabled={trafficActionIp === ip.ip} onClick={() => unbanIpFromTraffic(ip.ip)}>Desbloquear</button>
                        ) : (
                          <button className="btn btn-danger btn-sm" disabled={trafficActionIp === ip.ip} onClick={() => banIpFromTraffic(ip.ip)}>Banear</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Histórico reciente</span></div>
            <div className="flex items-center justify-between mb-8" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="flex items-center gap-8">
                <button className="btn btn-secondary btn-sm" onClick={() => setTrafficPage((p) => Math.max(1, p - 1))} disabled={trafficPage <= 1}>
                  ◀ Anterior
                </button>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  Página {trafficPage} / {trafficTotalPages}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setTrafficPage((p) => Math.min(trafficTotalPages, p + 1))} disabled={trafficPage >= trafficTotalPages}>
                  Siguiente ▶
                </button>
              </div>
              <select className="form-select" style={{ width: 150 }} value={trafficPageSize} onChange={(e) => setTrafficPageSize(Number(e.target.value))}>
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
            <div className="table-wrap" style={{ maxHeight: 360 }}>
              <table>
                <thead>
                  <tr><th>Hora</th><th>IP</th><th>Ruta</th><th>Mét.</th><th>Status</th><th>ms</th><th></th></tr>
                  <tr>
                    <th><input className="form-input" style={{ width: 95 }} placeholder="hora" value={trafficHistFilterTime} onChange={(e) => setTrafficHistFilterTime(e.target.value)} /></th>
                    <th><input className="form-input" style={{ width: 110 }} placeholder="ip" value={trafficHistFilterIp} onChange={(e) => setTrafficHistFilterIp(e.target.value)} /></th>
                    <th><input className="form-input" style={{ width: 130 }} placeholder="ruta" value={trafficHistFilterPath} onChange={(e) => setTrafficHistFilterPath(e.target.value)} /></th>
                    <th>
                      <select className="form-select" style={{ width: 90 }} value={trafficHistFilterMethod} onChange={(e) => setTrafficHistFilterMethod(e.target.value)}>
                        <option value="all">todos</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </th>
                    <th><input className="form-input" style={{ width: 80 }} placeholder="status" value={trafficHistFilterStatus} onChange={(e) => setTrafficHistFilterStatus(e.target.value)} /></th>
                    <th>
                      <div className="flex gap-4">
                        <input className="form-input" style={{ width: 58 }} placeholder="min" value={trafficHistFilterMsMin} onChange={(e) => setTrafficHistFilterMsMin(e.target.value)} />
                        <input className="form-input" style={{ width: 58 }} placeholder="max" value={trafficHistFilterMsMax} onChange={(e) => setTrafficHistFilterMsMax(e.target.value)} />
                      </div>
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrafficHistory.map((ev, idx) => (
                    <tr key={`${ev.ts}-${idx}`}>
                      <td>{new Date(ev.ts).toLocaleTimeString('es-AR')}</td>
                      <td>{ev.ip}</td>
                      <td style={{ fontSize: 11 }}>{ev.path}</td>
                      <td>{ev.method}</td>
                      <td>{ev.statusCode}</td>
                      <td>{ev.durationMs}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" disabled={trafficActionIp === ev.ip} onClick={() => banIpFromTraffic(ev.ip)}>Banear</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
      )}

      {section === "admin-security" && (
        <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Banear IP</span></div>
            <div className="form-group"><label className="form-label">IP</label><input className="form-input" value={banForm.ip} onChange={(e) => setBanForm((p) => ({ ...p, ip: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Minutos</label><input className="form-input" type="number" value={banForm.minutes} onChange={(e) => setBanForm((p) => ({ ...p, minutes: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Motivo</label><input className="form-input" value={banForm.reason} onChange={(e) => setBanForm((p) => ({ ...p, reason: e.target.value }))} /></div>
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={banForm.permanent} onChange={(e) => setBanForm((p) => ({ ...p, permanent: e.target.checked }))} /> Ban permanente</label>
            <div className="mt-16"><button className="btn btn-danger" onClick={banIp}>Banear IP</button></div>

            <div className="flex items-center justify-between mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>herramientas</span>
                <button className="btn btn-secondary btn-sm" onClick={toggleSelectAllBanIps} disabled={securityBanRows.length === 0}>
                  seleccionar
                </button>
                <button className="btn btn-secondary btn-sm" onClick={bulkUnbanSelectedBans} disabled={selectedBanIps.length === 0}>
                  desbloquear sel. ({selectedBanIps.length})
                </button>
              </div>
              <input
                className="form-input"
                style={{ width: 220 }}
                placeholder="filtrar ip / motivo"
                value={securitySearch}
                onChange={(e) => setSecuritySearch(e.target.value)}
              />
            </div>

            <div className="table-wrap mt-16" style={{ maxHeight: 260 }}>
              <table>
                <thead><tr><th style={{ width: 42 }}>Sel</th><th>IP</th><th>Razón</th><th>Hasta</th><th></th></tr></thead>
                <tbody>
                  {securityBanRows.map((b) => (
                    <tr key={b.ip}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedBanIps.includes(String(b.ip || ""))}
                          onChange={() => toggleBanIpSelection(b.ip)}
                        />
                      </td>
                      <td>{b.ip}</td>
                      <td>{b.reason || '-'}</td>
                      <td>{b.manualBan ? 'Permanente' : (b.blockedUntil ? new Date(b.blockedUntil).toLocaleString('es-AR') : '-')}</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => unbanIp(b.ip)}>Desbloquear</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Reglas de protección (429)</span></div>
            {!rules ? <div className="no-data">Sin reglas</div> : (
              <>
                <div className="form-group"><label className="form-label">Ventana global (ms)</label><input className="form-input" type="number" value={rules.globalWindowMs} onChange={(e) => setRules((p) => ({ ...p, globalWindowMs: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Max requests global</label><input className="form-input" type="number" value={rules.globalMaxRequests} onChange={(e) => setRules((p) => ({ ...p, globalMaxRequests: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Ventana burst (ms)</label><input className="form-input" type="number" value={rules.burstWindowMs} onChange={(e) => setRules((p) => ({ ...p, burstWindowMs: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Max burst</label><input className="form-input" type="number" value={rules.burstMaxRequests} onChange={(e) => setRules((p) => ({ ...p, burstMaxRequests: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Auto-ban (min)</label><input className="form-input" type="number" value={rules.autoBanMinutes} onChange={(e) => setRules((p) => ({ ...p, autoBanMinutes: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Retención histórico (días)</label><input className="form-input" type="number" value={rules.historyRetentionDays || 30} onChange={(e) => setRules((p) => ({ ...p, historyRetentionDays: e.target.value }))} /></div>
                <div className="flex gap-8">
                  <button className="btn btn-primary" onClick={saveRules}>Guardar reglas</button>
                  <button className="btn btn-secondary" onClick={runCleanupNow}>Ejecutar limpieza</button>
                </div>
                {cleanupResult && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)' }}>
                    Eliminados: tráfico {cleanupResult.deletedTrafficEvents || 0}, throttle {cleanupResult.deletedAuthThrottleRows || 0}, bloqueos liberados {cleanupResult.releasedIpBlocks || 0}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Histórico por usuario</span></div>
            <div className="flex items-center justify-between mb-8" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
                <input
                  className="form-input"
                  style={{ width: 150 }}
                  placeholder="usuario"
                  value={auditUsernameFilter}
                  onChange={(e) => setAuditUsernameFilter(e.target.value)}
                />
                <input
                  className="form-input"
                  style={{ width: 170 }}
                  placeholder="acción"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                />
                <select className="form-select" style={{ width: 120 }} value={auditLimit} onChange={(e) => setAuditLimit(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => loadAudit({ page: 1 })}>recargar</button>
            </div>

            <div className="flex items-center gap-8 mb-8">
              <button className="btn btn-secondary btn-sm" onClick={() => goAuditPage(auditPage - 1)} disabled={auditPage <= 1}>◀</button>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>Página {auditPage} / {auditTotalPages} · total {auditTotal}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => goAuditPage(auditPage + 1)} disabled={auditPage >= auditTotalPages}>▶</button>
            </div>

            <div className="table-wrap" style={{ maxHeight: 300 }}>
              <table>
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Método</th></tr></thead>
                <tbody>
                  {auditRows.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text2)" }}>Sin eventos</td></tr>
                  ) : auditRows.map((row) => (
                    <tr key={String(row._id || `${row.timestamp}-${row.username}-${row.action}`)}>
                      <td style={{ fontSize: 11 }}>{row.timestamp ? new Date(row.timestamp).toLocaleString("es-AR") : "-"}</td>
                      <td>{row.username || "-"}</td>
                      <td>{row.action || "-"}</td>
                      <td>{row.entity || "-"}</td>
                      <td>{row.method || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
