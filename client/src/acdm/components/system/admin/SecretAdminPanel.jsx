import { useEffect, useState } from "react";
import apiService from "../../../services/acdmApi.js";

const EMPTY_USER_FORM = {
  username: "",
  email: "",
  nombre: "",
  apellido: "",
  rol: "viewer",
  password: ""
};

export function SecretAdminPanel({ isAdmin, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);

  const resetForm = () => {
    setEditingUserId(null);
    setUserForm(EMPTY_USER_FORM);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const sessionsResponse = await apiService.getActiveSessionsView({ preferAdmin: isAdmin });
      setSessions(Array.isArray(sessionsResponse?.data) ? sessionsResponse.data : []);

      if (isAdmin) {
        const usersResponse = await apiService.getAdminUsers();
        setUsers(Array.isArray(usersResponse?.data) ? usersResponse.data : []);
      } else {
        setUsers([]);
      }
    } catch (err) {
      setError(err.message || "No se pudo cargar el panel oculto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const startEditUser = (user) => {
    setEditingUserId(user._id);
    setUserForm({
      username: user.username || "",
      email: user.email || "",
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      rol: user.rol || "viewer",
      password: ""
    });
  };

  const saveUser = async () => {
    if (!isAdmin) return;
    if (!userForm.username.trim() || !userForm.email.trim()) {
      setError("username y email son requeridos");
      return;
    }

    if (!editingUserId && !userForm.password.trim()) {
      setError("password es requerido para crear usuario");
      return;
    }

    setSavingUser(true);
    setError("");
    try {
      if (editingUserId) {
        const payload = {
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          nombre: userForm.nombre.trim(),
          apellido: userForm.apellido.trim(),
          rol: userForm.rol
        };
        if (userForm.password.trim()) {
          payload.password = userForm.password.trim();
        }
        await apiService.updateAdminUser(editingUserId, payload);
      } else {
        await apiService.createAdminUser({
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          nombre: userForm.nombre.trim(),
          apellido: userForm.apellido.trim(),
          rol: userForm.rol,
          password: userForm.password.trim()
        });
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo guardar el usuario");
    } finally {
      setSavingUser(false);
    }
  };

  const removeUser = async (userId) => {
    if (!isAdmin) return;
    if (!window.confirm("¿Eliminar usuario definitivamente?")) return;

    try {
      await apiService.deleteAdminUser(userId);
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo eliminar el usuario");
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await apiService.revokeSessionFromActiveView(sessionId, { asAdmin: isAdmin });
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo revocar la sesión");
    }
  };

  const revokeAllMine = async () => {
    if (!window.confirm("¿Revocar todas tus otras sesiones activas?")) return;
    try {
      await apiService.revokeMyOtherSessions();
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudieron revocar las sesiones");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Panel Oculto</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Acceso habilitado con Ctrl+Alt+A para {currentUser?.username || "usuario"}.
          </p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>↻ Recargar</button>
          <button className="btn btn-danger" onClick={revokeAllMine}>Cerrar otras sesiones</button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-16"><span>⚠️</span>{error}</div>}

      <div className="card mb-16">
        <div className="card-header"><span className="card-title">Sesiones Activas</span></div>
        {loading ? (
          <div className="no-data">Cargando sesiones...</div>
        ) : sessions.length === 0 ? (
          <div className="no-data">No hay sesiones activas</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>IP</th>
                  <th>Navegador</th>
                  <th>Última actividad</th>
                  <th>Expira</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id}>
                    <td>{session.username || session.userId?.username || "-"}</td>
                    <td>{session.deviceInfo?.ip || "-"}</td>
                    <td>{session.deviceInfo?.browser || session.deviceInfo?.userAgent || "-"}</td>
                    <td>{session.lastActivity ? new Date(session.lastActivity).toLocaleString('es-AR') : "-"}</td>
                    <td>{session.expiresAt ? new Date(session.expiresAt).toLocaleString('es-AR') : "-"}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => revokeSession(session._id)}>Revocar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card">
          <div className="card-header"><span className="card-title">CRUD Usuarios</span></div>
          <div className="card-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={userForm.username} onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={userForm.nombre} onChange={(e) => setUserForm((prev) => ({ ...prev, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input className="form-input" value={userForm.apellido} onChange={(e) => setUserForm((prev) => ({ ...prev, apellido: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-select" value={userForm.rol} onChange={(e) => setUserForm((prev) => ({ ...prev, rol: e.target.value }))}>
                  <option value="admin">admin</option>
                  <option value="supervisor">supervisor</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{editingUserId ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
                <input type="password" className="form-input" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} />
              </div>
              <div className="flex gap-8">
                <button className="btn btn-primary" onClick={saveUser} disabled={savingUser}>{savingUser ? "Guardando..." : editingUserId ? "Actualizar" : "Crear"}</button>
                <button className="btn btn-secondary" onClick={resetForm}>Limpiar</button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.rol}</td>
                      <td>{user.isActive ? "Activo" : "Inactivo"}</td>
                      <td>
                        <div className="flex gap-4">
                          <button className="btn btn-secondary btn-sm" onClick={() => startEditUser(user)}>Editar</button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => removeUser(user._id)}
                            disabled={String(user._id) === String(currentUser?._id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: 'var(--text3)' }}>Sin usuarios para mostrar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
