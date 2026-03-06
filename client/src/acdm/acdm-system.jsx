import { useState } from "react";
import STYLES from "./styles/styles.jsx";
import './styles/acdm.css';
import { AcdmProvider, useAcdmContext } from "./context/AcdmContext.jsx";
import { AcdmLayout } from "./layout/AcdmLayout.jsx";
import {
  AdminControlCenter,
  AlertMessage,
  AlumnoModal,
  DocenteModal,
  EscuelaModal,
  ExportPDF,
  InformeModal,
  Login,
  MailsExtractor,
  ProyectoModal,
  SecretAdminPanel,
  VisitaModal
} from "./components/system/index.js";
import { AlertasSection } from "./sections/AlertasSection.jsx";
import { CalendarioSection } from "./sections/CalendarioSection.jsx";
import { DashboardSection } from "./sections/DashboardSection.jsx";
import { EscuelasSection } from "./sections/EscuelasSection.jsx";
import { EstadisticasSection } from "./sections/EstadisticasSection.jsx";
import { ExportPanelSection } from "./sections/ExportPanelSection.jsx";
import { FormulariosSection } from "./sections/FormulariosSection.jsx";
import { InformesSection } from "./sections/InformesSection.jsx";
import { ProyectosSection } from "./sections/ProyectosSection.jsx";
import { VisitasSection } from "./sections/VisitasSection.jsx";

function AcdmContent() {
  const [feedback, setFeedback] = useState(null);
  const {
    currentUser, setCurrentUser, activeSection, setActiveSection, search, viewMode, setViewMode, isAdmin, isDeveloper, canManageOperationalSections,
    escuelas, loading,
    saveEscuela, deleteEscuela,
    addDocente, updateDocente, deleteDocente,
    addAlumno, updateAlumno, deleteAlumno,
    addVisita, updateVisita, deleteVisita,
    addProyecto, updateProyecto, deleteProyecto,
    addInforme, updateInforme, deleteInforme,
    escuelaModal, setEscuelaModal,
    docenteModal, setDocenteModal,
    alumnoModal, setAlumnoModal,
    visitaModal, setVisitaModal,
    proyectoModal, setProyectoModal,
    informeModal, setInformeModal,
    showExport, setShowExport,
    showMailsExtractor, setShowMailsExtractor,
    showHiddenAdmin
  } = useAcdmContext();

  const notifyDeleteResult = async (deleteFn, args, successMessage) => {
    try {
      const deleted = await deleteFn(...args);
      if (!deleted) return;
      setFeedback({ id: Date.now(), type: 'success', message: successMessage });
    } catch (err) {
      setFeedback({
        id: Date.now(),
        type: 'error',
        message: err?.message || 'No se pudo eliminar el registro.'
      });
    }
  };

  const handleSaveEscuela = async (form) => {
    try {
      await saveEscuela(form, { isNew: Boolean(escuelaModal?.isNew) });
      setFeedback({ id: Date.now(), type: 'success', message: 'Escuela guardada correctamente.' });
    } catch (err) {
      setFeedback({
        id: Date.now(),
        type: 'error',
        message: err?.message || 'No se pudo guardar la escuela.'
      });
      throw err;
    }
  };

  if (!currentUser) return <><style>{STYLES}</style><Login onLogin={setCurrentUser} /></>;

  const filteredEscuelas = escuelas.filter(e =>
    !search || e.escuela.toLowerCase().includes(search.toLowerCase()) ||
    e.de.toLowerCase().includes(search.toLowerCase()) ||
    e.nivel.toLowerCase().includes(search.toLowerCase()) ||
    e.docentes.some(d => d.nombreApellido.toLowerCase().includes(search.toLowerCase())) ||
    e.alumnos.some(a => a.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredVisitas = escuelas.map(esc => ({
    ...esc,
    visitas: (!esc.visitas || !search) ? (esc.visitas || []) : esc.visitas.filter(v =>
      v.observaciones.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.visitas.length > 0);

  const filteredProyectos = escuelas.map(esc => ({
    ...esc,
    proyectos: (!esc.proyectos || !search) ? (esc.proyectos || []) : esc.proyectos.filter(p =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.proyectos.length > 0);

  const filteredInformes = escuelas.map(esc => ({
    ...esc,
    informes: (!esc.informes || !search) ? (esc.informes || []) : esc.informes.filter(i =>
      String(i?.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
      String(i?.observaciones || '').toLowerCase().includes(search.toLowerCase()) ||
      String(esc?.escuela || '').toLowerCase().includes(search.toLowerCase()) ||
      String(esc?.de || '').toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.informes.length > 0);

  return (
    <>
      <style>{STYLES}</style>
      {feedback && (
        <AlertMessage
          key={feedback.id}
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
      <AcdmLayout>
        {activeSection === "dashboard" && (
          <DashboardSection escuelas={escuelas} onNavigate={setActiveSection} />
        )}

        {activeSection === "escuelas" && (
          <EscuelasSection
            filteredEscuelas={filteredEscuelas}
            viewMode={viewMode}
            setViewMode={setViewMode}
            canManageOperationalSections={canManageOperationalSections}
            setEscuelaModal={setEscuelaModal}
            setDocenteModal={setDocenteModal}
            setAlumnoModal={setAlumnoModal}
            setVisitaModal={setVisitaModal}
            setProyectoModal={setProyectoModal}
            setInformeModal={setInformeModal}
            deleteEscuela={deleteEscuela}
            deleteDocente={deleteDocente}
            deleteAlumno={deleteAlumno}
            deleteVisita={deleteVisita}
            deleteProyecto={deleteProyecto}
            deleteInforme={deleteInforme}
            onNotifyDelete={notifyDeleteResult}
          />
        )}

        {activeSection === "alertas" && (
          <AlertasSection escuelas={escuelas} />
        )}

        {activeSection === "estadisticas" && (
          <EstadisticasSection escuelas={escuelas} />
        )}

        {activeSection === "calendario" && <CalendarioSection escuelas={escuelas} isAdmin={isAdmin} />}

        {activeSection === "visitas" && (
          <VisitasSection
            filteredVisitas={filteredVisitas}
            search={search}
            canManageOperationalSections={canManageOperationalSections}
            setVisitaModal={setVisitaModal}
            deleteVisita={deleteVisita}
            onNotifyDelete={notifyDeleteResult}
          />
        )}

        {activeSection === "proyectos" && (
          <ProyectosSection
            filteredProyectos={filteredProyectos}
            search={search}
            canManageOperationalSections={canManageOperationalSections}
            setProyectoModal={setProyectoModal}
            deleteProyecto={deleteProyecto}
            onNotifyDelete={notifyDeleteResult}
          />
        )}

        {activeSection === "informes" && (
          <InformesSection
            filteredInformes={filteredInformes}
            search={search}
            onNotifyDelete={notifyDeleteResult}
          />
        )}

        {activeSection === "formularios" && (
          <FormulariosSection />
        )}

        {activeSection === "exportar" && (
          <ExportPanelSection
            setShowExport={setShowExport}
            setShowMailsExtractor={setShowMailsExtractor}
          />
        )}

        {activeSection === "admin-secret" && showHiddenAdmin && (
          <SecretAdminPanel isAdmin={isAdmin} currentUser={currentUser} />
        )}

        {activeSection === "admin-users" && isAdmin && (
          <AdminControlCenter section="admin-users" currentUser={currentUser} onNavigateSection={setActiveSection} />
        )}

        {activeSection === "admin-sessions" && isAdmin && (
          <AdminControlCenter section="admin-sessions" currentUser={currentUser} onNavigateSection={setActiveSection} />
        )}

        {activeSection === "admin-roles" && isAdmin && isDeveloper && (
          <AdminControlCenter section="admin-roles" currentUser={currentUser} onNavigateSection={setActiveSection} />
        )}

        {activeSection === "admin-permissions" && isAdmin && isDeveloper && (
          <AdminControlCenter section="admin-permissions" currentUser={currentUser} onNavigateSection={setActiveSection} />
        )}

        {activeSection === "admin-traffic" && isAdmin && (
          <AdminControlCenter section="admin-traffic" currentUser={currentUser} onNavigateSection={setActiveSection} />
        )}

        {activeSection === "admin-security" && isAdmin && (
          <AdminControlCenter section="admin-security" currentUser={currentUser} onNavigateSection={setActiveSection} />
        )}
      </AcdmLayout>

      {escuelaModal && (
        <EscuelaModal isNew={escuelaModal.isNew} escuela={escuelaModal.data}
          onSave={handleSaveEscuela} onClose={() => setEscuelaModal(null)} isDeveloper={isDeveloper} />
      )}
      {docenteModal && (
        <DocenteModal isNew={docenteModal.isNew} docente={docenteModal.data} titularId={docenteModal.titularId}
          onSave={async (form) => {
            try {
              if (docenteModal.isNew) await addDocente(docenteModal.escuelaId, form, docenteModal.titularId);
              else await updateDocente(docenteModal.escuelaId, form, docenteModal.titularId);
              setFeedback({ id: Date.now(), type: 'success', message: 'Docente guardado correctamente.' });
            } catch (err) {
              throw err;
            }
          }}
          onClose={() => setDocenteModal(null)} isDeveloper={isDeveloper} />
      )}
      {alumnoModal && (
        <AlumnoModal isNew={alumnoModal.isNew} alumno={alumnoModal.data}
          onSave={async (form) => {
            try {
              if (alumnoModal.isNew) await addAlumno(alumnoModal.escuelaId, form);
              else await updateAlumno(alumnoModal.escuelaId, form);
              setFeedback({ id: Date.now(), type: 'success', message: 'Alumno guardado correctamente.' });
            } catch (err) {
              throw err;
            }
          }}
          onClose={() => setAlumnoModal(null)} isDeveloper={isDeveloper} />
      )}
      {visitaModal && (
        <VisitaModal isNew={visitaModal.isNew} visita={visitaModal.data} escuelaId={visitaModal.escuelaId}
          onSave={async (form, escId) => {
            try {
              if (visitaModal.isNew) await addVisita(escId, form);
              else await updateVisita(escId, form);
              setFeedback({ id: Date.now(), type: 'success', message: 'Visita guardada correctamente.' });
            } catch (err) {
              throw err;
            }
          }}
          onClose={() => setVisitaModal(null)} escuelas={escuelas} isDeveloper={isDeveloper} />
      )}
      {proyectoModal && (
        <ProyectoModal isNew={proyectoModal.isNew} proyecto={proyectoModal.data} escuelaId={proyectoModal.escuelaId}
          onSave={async (form, escId) => {
            try {
              if (proyectoModal.isNew) await addProyecto(escId, form);
              else await updateProyecto(escId, form);
              setFeedback({ id: Date.now(), type: 'success', message: 'Proyecto guardado correctamente.' });
            } catch (err) {
              throw err;
            }
          }}
          onClose={() => setProyectoModal(null)} escuelas={escuelas} isDeveloper={isDeveloper} />
      )}
      {informeModal && (
        <InformeModal isNew={informeModal.isNew} informe={informeModal.data} escuelaId={informeModal.escuelaId}
          onSave={async (form, escId) => {
            try {
              if (informeModal.isNew) await addInforme(escId, form);
              else await updateInforme(escId, form);
              setFeedback({ id: Date.now(), type: 'success', message: 'Informe guardado correctamente.' });
            } catch (err) {
              throw err;
            }
          }}
          onClose={() => setInformeModal(null)} escuelas={escuelas} isDeveloper={isDeveloper} />
      )}
      {showExport && <ExportPDF escuelas={escuelas} onClose={() => setShowExport(false)} />}
      {showMailsExtractor && <MailsExtractor escuelas={escuelas} onClose={() => setShowMailsExtractor(false)} />}
    </>
  );
}

export default function App({ currentUser, onLogout }) {
  return (
    <AcdmProvider currentUser={currentUser} onLogout={onLogout}>
      <AcdmContent />
    </AcdmProvider>
  );
}
