import { useAcdmContext } from "../context/AcdmContext.jsx";
import { Header } from "./Header.jsx";
import { Sidebar } from "../acdm-system-sidebar.jsx";
import { diasRestantes } from "../utils/dateUtils.js";

export function AcdmLayout({ children }) {
    const {
        darkMode,
        sidebarCollapsed,
        setSidebarCollapsed,
        activeSection,
        setActiveSection,
        isAdmin,
        showHiddenAdmin,
        escuelas,
        setEscuelaModal
    } = useAcdmContext();

    const alertCount = escuelas.reduce((a, esc) => {
        if (esc.docentes.length === 0) a++;
        esc.docentes.forEach(d => { if (d.estado === "Licencia" && d.fechaFinLicencia && diasRestantes(d.fechaFinLicencia) <= 10) a++; });
        return a;
    }, 0);

    return (
        <div className={`app ${darkMode ? "" : "light-mode"}`}>
            <Header />
            <div className="main">
                <Sidebar
                    isCollapsed={sidebarCollapsed}
                    onCollapsedChange={setSidebarCollapsed}
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                    isAdmin={isAdmin}
                    showHiddenAdmin={showHiddenAdmin}
                    alertCount={alertCount}
                    onNewEscuela={() => setEscuelaModal({ isNew: true, data: null })}
                />
                <main className="content">
                    {children}
                </main>
            </div>
        </div>
    );
}
