import { useEffect, useMemo, useState } from "react";
import apiService from "../services/acdmApi.js";

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

export function AdminControlCenter({ section, currentUser, onNavigateSection }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

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

  const [bans, setBans] = useState([]);
  const [rules, setRules] = useState(null);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [notice, setNotice] = useState("");

  const [banForm, setBanForm] = useState({ ip: "", minutes: 60, reason: "", permanent: false });

  const permissionCatalog = useMemo(() => permissions.map((p) => p.permiso), [permissions]);

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm(EMPTY_USER_FORM);
  };

  const loadUsers = async () => {
    const [usersRes, permsRes, rolesRes] = await Promise.all([
      apiService.getAdminUsers(),
      apiService.getPermisos(),
      apiService.getRoles()
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
        await loadSecurity();
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

  const revokeSession = async (id) => {
    try {
      await apiService.revokeSessionFromActiveView(id, { asAdmin: true });
      await loadSessions();
    } catch (err) {
      setError(err.message || "No se pudo revocar la sesión");
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

  const isEventBlocked = (ev) => {
    return Boolean(ev?.blocked || ev?.isBlocked || Number(ev?.statusCode) === 429);
  };

  const trafficFilteredHistory = useMemo(() => {
    const query = trafficSearch.trim().toLowerCase();
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
        return true;
      });
  }, [history, trafficMethod, trafficOnlyBlocked, trafficSearch, trafficStatus]);

  const trafficStats = useMemo(() => {
    const sample = trafficFilteredHistory;
    const total = sample.length;
    const blocked = sample.filter(isEventBlocked).length;
    const avgMs = total > 0
      ? Math.round(sample.reduce((acc, ev) => acc + Number(ev?.durationMs || 0), 0) / total)
      : 0;
    return { total, blocked, avgMs };
  }, [trafficFilteredHistory]);

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
                <option value="admin">admin</option>
                <option value="supervisor">supervisor</option>
                <option value="viewer">viewer</option>
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
            <table>
              <thead><tr><th>Username</th><th>Email</th><th>Rol</th><th>Permisos</th><th>Acciones</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.rol}</td>
                    <td style={{ fontSize: 11 }}>{(u.permisos || []).join(', ')}</td>
                    <td>
                      <div className="flex gap-4">
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
          <table>
            <thead><tr><th>Usuario</th><th>IP</th><th>Navegador</th><th>Última actividad</th><th>Expira</th><th>Acción</th></tr></thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text2)" }}>
                    No hay sesiones activas
                  </td>
                </tr>
              ) : sessions.map((s) => (
                <tr key={s._id}>
                  <td>{s.username || s.userId?.username || "-"}</td>
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
        <div className="card-grid">
          {roles.map((r) => {
            const selected = Array.isArray(r.defaultPermissions) ? r.defaultPermissions : [];
            return (
              <div className="card" key={r.role}>
                <div className="card-header"><span className="card-title">Rol: {r.role}</span></div>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>Usuarios: {r.totalUsers}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {permissionCatalog.map((perm) => {
                    const checked = selected.includes('*') || selected.includes(perm);
                    return (
                      <label key={perm} style={{ fontSize: 11 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(selected.filter((p) => p !== '*'));
                            if (e.target.checked) next.add(perm); else next.delete(perm);
                            saveRolePermissions(r.role, [...next]);
                          }}
                        /> {perm}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section === "admin-permissions" && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Permiso</th><th>Usuarios asignados</th></tr></thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.permiso}><td>{p.permiso}</td><td>{p.assignedUsers}</td></tr>
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
              <button className="btn btn-secondary btn-sm" onClick={exportTrafficCsv}>CSV</button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setTrafficSearch("");
                setTrafficMethod("all");
                setTrafficStatus("all");
                setTrafficOnlyBlocked(false);
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
            <div className="table-wrap" style={{ maxHeight: 260 }}>
              <table>
                <thead><tr><th>IP</th><th>Total</th><th>429</th><th>Bloqueada</th><th>Acción</th></tr></thead>
                <tbody>
                  {(realtime?.topIps || []).map((ip) => (
                    <tr key={ip.ip}>
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
            <div className="table-wrap" style={{ maxHeight: 360 }}>
              <table>
                <thead><tr><th>Hora</th><th>IP</th><th>Ruta</th><th>Mét.</th><th>Status</th><th>ms</th><th></th></tr></thead>
                <tbody>
                  {trafficFilteredHistory.map((ev, idx) => (
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

            <div className="table-wrap mt-16" style={{ maxHeight: 260 }}>
              <table>
                <thead><tr><th>IP</th><th>Razón</th><th>Hasta</th><th></th></tr></thead>
                <tbody>
                  {bans.map((b) => (
                    <tr key={b.ip}>
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
        </div>
      )}
    </div>
  );
}
