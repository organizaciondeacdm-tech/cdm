import { useAcdmContext } from "../context/AcdmContext.jsx";
import { UserMenu } from "../components/UserMenu.jsx";

export function Header() {
    const {
        sidebarCollapsed, setSidebarCollapsed,
        search, setSearch,
        currentUser, handleLogout, isAdmin,
        darkMode, setDarkMode
    } = useAcdmContext();

    return (
        <header className="header">
            <div className="flex items-center gap-16">
                <button className="btn-icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ fontSize: 18 }}>☰</button>
                <div>
                    <div className="header-title">🏫 Sistema ACDM</div>
                    <div className="header-sub">Gestión de Asistentes Celadores/as para estudiantes con Discapacidad Motora</div>
                </div>
            </div>
            <div className="flex items-center gap-16">
                <div className="search-input-wrap" style={{ width: 220 }}>
                    <span className="search-icon">🔍</span>
                    <input className="form-input search-main" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ paddingLeft: 32 }} />
                </div>
                <div className="papiweb-brand">
                    <div className="led-dot" />
                    <div className="papiweb-logo">
                        <div className="papiweb-text">PAPIWEB</div>
                        <div className="papiweb-sub">Desarrollos Informáticos</div>
                    </div>
                </div>
                <UserMenu
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    onLogout={handleLogout}
                    onToggleDarkMode={() => setDarkMode(!darkMode)}
                    darkMode={darkMode}
                />
            </div>
        </header>
    );
}
