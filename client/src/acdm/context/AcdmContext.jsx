import { createContext, useContext, useState, useEffect } from "react";
import { useAcdmData as useAcdmMongoData } from "../hooks/useAcdmData.js";

const AcdmContext = createContext();

export function useAcdmContext() {
    const context = useContext(AcdmContext);
    if (!context) {
        throw new Error("useAcdmContext must be used within an AcdmProvider");
    }
    return context;
}

export function AcdmProvider({ children, currentUser: propCurrentUser, onLogout: propOnLogout }) {
    const [currentUser, setCurrentUser] = useState(propCurrentUser || null);

    const {
        db,
        loading,
        saveEscuela,
        deleteEscuela,
        addDocente,
        updateDocente,
        deleteDocente,
        addAlumno,
        updateAlumno,
        deleteAlumno,
        addVisita,
        updateVisita,
        deleteVisita,
        addProyecto,
        updateProyecto,
        deleteProyecto,
        addInforme,
        updateInforme,
        deleteInforme
    } = useAcdmMongoData(currentUser);

    const activeDb = db || { escuelas: [], alumnos: [], docentes: [], usuarios: [], visitas: [], proyectos: [], informes: [] };

    const [activeSection, setActiveSection] = useState("dashboard");
    const [viewMode, setViewMode] = useState("full"); // full | compact | table
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [showExport, setShowExport] = useState(false);
    const [showMailsExtractor, setShowMailsExtractor] = useState(false);
    const [showHiddenAdmin, setShowHiddenAdmin] = useState(false);

    // Modal states
    const [escuelaModal, setEscuelaModal] = useState(null);
    const [docenteModal, setDocenteModal] = useState(null);
    const [alumnoModal, setAlumnoModal] = useState(null);
    const [visitaModal, setVisitaModal] = useState(null);
    const [proyectoModal, setProyectoModal] = useState(null);
    const [informeModal, setInformeModal] = useState(null);

    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem("acdm_darkMode");
        return saved !== null ? saved === "true" : true;
    });

    const role = String(currentUser?.rol || "").trim().toLowerCase();
    const permisosSet = new Set(
        (Array.isArray(currentUser?.permisos) ? currentUser.permisos : [])
            .map((permiso) => String(permiso || "").trim().toLowerCase())
    );
    const caps = currentUser?.capabilities || {};
    const hasCapabilities = Object.keys(caps).length > 0;
    const hasAdminPermissions = permisosSet.has("*")
        || permisosSet.has("gestionar_usuarios")
        || permisosSet.has("gestionar_roles_permisos")
        || permisosSet.has("gestionar_seguridad")
        || permisosSet.has("ver_sesiones_admin");
    const isAdmin = currentUser?.isPrivilegedRole === true || caps.canManageUsers === true || hasAdminPermissions;
    const isDeveloper = caps.isDeveloper === true || role === "desarrollador" || role === "desarollador";
    const canManageOperationalSections = hasCapabilities
        ? caps.canManageOperationalSections === true
        : (isAdmin
            || role === "supervisor"
            || permisosSet.has("*")
            || permisosSet.has("crear_escuela")
            || permisosSet.has("editar_escuela")
            || permisosSet.has("eliminar_escuela")
            || permisosSet.has("crear_docente")
            || permisosSet.has("editar_docente")
            || permisosSet.has("eliminar_docente")
            || permisosSet.has("crear_alumno")
            || permisosSet.has("editar_alumno")
            || permisosSet.has("eliminar_alumno"));
    const canExportData = hasCapabilities
        ? caps.canExportData === true
        : (isAdmin
            || role === "supervisor"
            || permisosSet.has("*")
            || permisosSet.has("exportar_datos"));

    useEffect(() => {
        localStorage.setItem("acdm_darkMode", darkMode);
    }, [darkMode]);

    useEffect(() => {
        if (!currentUser) return;

        const handler = (e) => {
            const key = String(e.key || "").toLowerCase();

            if (e.ctrlKey && key === "f") {
                e.preventDefault();
                document.querySelector(".search-main")?.focus();
            }

            if (e.ctrlKey && key === "e" && canExportData) {
                e.preventDefault();
                setShowExport(true);
                setActiveSection("exportar");
            }

            if (e.ctrlKey && e.altKey && key === "a") {
                e.preventDefault();
                setShowHiddenAdmin((prev) => {
                    const next = !prev;
                    setActiveSection(next ? "admin-secret" : "dashboard");
                    return next;
                });
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [currentUser, isAdmin, canExportData]);

    const handleLogout = () => {
        setCurrentUser(null);
        if (propOnLogout) propOnLogout();
    };

    const value = {
        // Current user and auth
        currentUser,
        setCurrentUser,
        handleLogout,
        isAdmin,
        isDeveloper,
        canManageOperationalSections,
        canExportData,

        // App state
        activeSection,
        setActiveSection,
        viewMode,
        setViewMode,
        sidebarCollapsed,
        setSidebarCollapsed,
        search,
        setSearch,
        showExport,
        setShowExport,
        showMailsExtractor,
        setShowMailsExtractor,
        showHiddenAdmin,
        setShowHiddenAdmin,
        escuelaModal,
        setEscuelaModal,
        docenteModal,
        setDocenteModal,
        alumnoModal,
        setAlumnoModal,
        visitaModal,
        setVisitaModal,
        proyectoModal,
        setProyectoModal,
        informeModal,
        setInformeModal,
        darkMode,
        setDarkMode,

        // DB data
        db: activeDb,
        escuelas: activeDb.escuelas,
        loading,

        // Database CRUD actions
        saveEscuela,
        deleteEscuela,
        addDocente,
        updateDocente,
        deleteDocente,
        addAlumno,
        updateAlumno,
        deleteAlumno,
        addVisita,
        updateVisita,
        deleteVisita,
        addProyecto,
        updateProyecto,
        deleteProyecto,
        addInforme,
        updateInforme,
        deleteInforme
    };

    return (
        <AcdmContext.Provider value={value}>
            {children}
        </AcdmContext.Provider>
    );
}
