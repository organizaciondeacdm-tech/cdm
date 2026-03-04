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

export function AdminControlCenter({ section, currentUser }) {
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
  const [bans, setBans] = useState([]);
  const [rules, setRules] = useState(null);
  const [cleanupResult, setCleanupResult] = useState(null);

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
    const sessionsRes = await apiService.getAdminSessions();
    setSessions(Array.isArray(sessionsRes?.data) ? sessionsRes.data : []);
  };

  const loadTraffic = async () => {
    const [rtRes, histRes] = await Promise.all([
      apiService.getSecurityTrafficRealtime(),
      apiService.getSecurityTrafficHistory(200)
    ]);
    setRealtime(rtRes?.data || null);
    setHistory(Array.isArray(histRes?.data) ? histRes.data : []);
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
        await loadTraffic();
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
    if (section !== "admin-traffic") return;
    const timer = setInterval(() => {
      loadTraffic().catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [section]);

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
      await apiService.revokeSessionAsAdmin(id);
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

  if (loading) {
    return <div className="card">Cargando {section}...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
          Admin: {section}
        </h1>
        <button className="btn btn-secondary" onClick={loadData}>↻ Recargar</button>
      </div>

      {error && <div className="alert alert-danger mb-16"><span>⚠️</span>{error}</div>}

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
              {sessions.map((s) => (
                <tr key={s._id}>
                  <td>{s.username || s.userId?.username}</td>
                  <td>{s.deviceInfo?.ip || '-'}</td>
                  <td>{s.deviceInfo?.browser || '-'}</td>
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
        <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Tráfico en tiempo real</span></div>
            <p>RPM: <strong>{realtime?.requestPerMinute || 0}</strong></p>
            <p>Bloqueadas/min: <strong>{realtime?.blockedPerMinute || 0}</strong></p>
            <p>IPs activas: <strong>{realtime?.activeIps || 0}</strong></p>
            <div className="table-wrap" style={{ maxHeight: 260 }}>
              <table>
                <thead><tr><th>IP</th><th>Total</th><th>429</th><th>Bloqueada</th></tr></thead>
                <tbody>
                  {(realtime?.topIps || []).map((ip) => (
                    <tr key={ip.ip}><td>{ip.ip}</td><td>{ip.total}</td><td>{ip.blocked}</td><td>{ip.isBlocked ? 'Sí' : 'No'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Histórico reciente</span></div>
            <div className="table-wrap" style={{ maxHeight: 360 }}>
              <table>
                <thead><tr><th>Hora</th><th>IP</th><th>Ruta</th><th>Mét.</th><th>Status</th><th>ms</th></tr></thead>
                <tbody>
                  {history.slice().reverse().map((ev, idx) => (
                    <tr key={`${ev.ts}-${idx}`}>
                      <td>{new Date(ev.ts).toLocaleTimeString('es-AR')}</td>
                      <td>{ev.ip}</td>
                      <td style={{ fontSize: 11 }}>{ev.path}</td>
                      <td>{ev.method}</td>
                      <td>{ev.statusCode}</td>
                      <td>{ev.durationMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
