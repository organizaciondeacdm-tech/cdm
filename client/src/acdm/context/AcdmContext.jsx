import { createContext, useContext, useState, useEffect } from "react";
import { useAcdmData as useAcdmMongoData } from "../hooks/useAcdmData.js";

const AcdmContext = createContext();
const EMPTY_DB = { escuelas: [], alumnos: [], docentes: [], usuarios: [], visitas: [], proyectos: [], informes: [] };
const noop = () => {};
const DEFAULT_CONTEXT_VALUE = {
    currentUser: null,
    setCurrentUser: noop,
    handleLogout: noop,
    isAdmin: false,
    isDeveloper: false,
    canManageOperationalSections: false,
    canExportData: false,
    activeSection: "dashboard",
    setActiveSection: noop,
    viewMode: "full",
    setViewMode: noop,
    sidebarCollapsed: false,
    setSidebarCollapsed: noop,
    search: "",
    setSearch: noop,
    showExport: false,
    setShowExport: noop,
    showMailsExtractor: false,
    setShowMailsExtractor: noop,
    showHiddenAdmin: false,
    setShowHiddenAdmin: noop,
    escuelaModal: null,
    setEscuelaModal: noop,
    docenteModal: null,
    setDocenteModal: noop,
    alumnoModal: null,
    setAlumnoModal: noop,
    visitaModal: null,
    setVisitaModal: noop,
    proyectoModal: null,
    setProyectoModal: noop,
    informeModal: null,
    setInformeModal: noop,
    citaModal: null,
    setCitaModal: noop,
    darkMode: true,
    setDarkMode: noop,
    db: EMPTY_DB,
    escuelas: EMPTY_DB.escuelas,
    loading: false,
    saveEscuela: noop,
    deleteEscuela: noop,
    addDocente: noop,
    updateDocente: noop,
    deleteDocente: noop,
    addAlumno: noop,
    updateAlumno: noop,
    deleteAlumno: noop,
    addVisita: noop,
    updateVisita: noop,
    deleteVisita: noop,
    addProyecto: noop,
    updateProyecto: noop,
    deleteProyecto: noop,
    addInforme: noop,
    updateInforme: noop,
    deleteInforme: noop,
    addCita: noop,
    updateCita: noop,
    deleteCita: noop
};

export function useAcdmContext() {
    const context = useContext(AcdmContext);
    if (!context) {
        if (typeof window !== "undefined") {
            console.warn("[ACDM][CONTEXT] useAcdmContext without provider. Returning safe fallback context.");
        }
        return DEFAULT_CONTEXT_VALUE;
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
        deleteInforme,
        addCita,
        updateCita,
        deleteCita
    } = useAcdmMongoData(currentUser);

    const activeDb = db || EMPTY_DB;

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
    const [citaModal, setCitaModal] = useState(null);

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
        citaModal,
        setCitaModal,
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
        deleteInforme,
        addCita,
        updateCita,
        deleteCita
    };

    return (
        <AcdmContext.Provider value={value}>
            {children}
        </AcdmContext.Provider>
    );
}
