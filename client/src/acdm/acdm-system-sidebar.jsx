// ============================================================
// SIDEBAR COMPONENT
// ============================================================
export function Sidebar({
  isCollapsed,
  onCollapsedChange,
  activeSection,
  onSectionChange,
  isAdmin,
  alertCount,
  onNewEscuela
}) {
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "escuelas", icon: "🏫", label: "Escuelas", badge: 0 },
    { id: "visitas", icon: "👁️", label: "Visitas" },
    { id: "proyectos", icon: "📦", label: "Proyectos" },
    { id: "informes", icon: "📋", label: "Informes" },
    { id: "alertas", icon: "🔔", label: "Alertas", badge: alertCount },
    { id: "estadisticas", icon: "📈", label: "Estadísticas" },
    { id: "calendario", icon: "📅", label: "Calendario" },
    { id: "exportar", icon: "📄", label: "Exportar" },
  ];

  return (
    <nav className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="nav-section" style={{ display: isCollapsed ? 'none' : 'block' }}>
        Navegación
      </div>
      {navItems.map(item => (
        <div
          key={item.id}
          className={`nav-item ${activeSection === item.id ? "active" : ""}`}
          onClick={() => onSectionChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {!isCollapsed && <span>{item.label}</span>}
          {!isCollapsed && item.badge > 0 && (
            <span className="nav-badge">{item.badge}</span>
          )}
        </div>
      ))}

      {isAdmin && !isCollapsed && (
        <>
          <hr className="divider" />
          <div className="nav-section">Admin</div>
          <div
            className="nav-item"
            onClick={() => {
              onNewEscuela();
              onSectionChange("escuelas");
            }}
          >
            <span className="nav-icon">➕</span>
            <span>Nueva Escuela</span>
          </div>
        </>
      )}

      {!isCollapsed && (
        <div style={{ padding: '20px 16px', marginTop: 'auto' }}>
          <div
            style={{
              fontSize: 9,
              color: 'var(--text3)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              lineHeight: 1.6,
            }}
          >
            Atajos de teclado:<br />
            Ctrl+F: Buscar<br />
            Ctrl+E: Exportar<br />
            Ctrl+Alt+A: Admin
          </div>
        </div>
      )}
    </nav>
  );
}
