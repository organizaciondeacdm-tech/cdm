import { useState } from "react";
import STYLES from "./styles/styles.jsx";
import './styles/acdm.css';
import { AcdmProvider, useAcdmContext } from "./context/AcdmContext.jsx";
import { AcdmLayout } from "./layout/AcdmLayout.jsx";
import { Login } from "./components/Login.jsx";
import { Statistics } from "./components/Statistics.jsx";
import { AlertPanel } from "./components/AlertPanel.jsx";
import { EscuelaDetail } from "./components/EscuelaDetail.jsx";
import { CalendarioView } from "./components/CalendarioView.jsx";
import { ExportPDF } from "./components/ExportPDF.jsx";
import { MailsExtractor } from "./components/MailsExtractor.jsx";
import { EscuelaModal } from "./components/EscuelaModal.jsx";
import { DocenteModal } from "./components/DocenteModal.jsx";
import { AlumnoModal } from "./components/AlumnoModal.jsx";
import { VisitaModal } from "./components/VisitaModal.jsx";
import { ProyectoModal } from "./components/ProyectoModal.jsx";
import { InformeModal } from "./components/InformeModal.jsx";
import { SecretAdminPanel } from "./components/SecretAdminPanel.jsx";
import { AdminControlCenter } from "./components/AdminControlCenter.jsx";
import { DaysRemaining } from "./components/DaysRemaining.jsx";
import { AlertMessage } from "./components/AlertMessage.jsx";
import { FormulariosSection } from "./sections/FormulariosSection.jsx";
import { formatDate } from "./utils/dateUtils.js";

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
      await saveEscuela(form);
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
          <div>
            <div className="flex items-center justify-between mb-24">
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Dashboard</h1>
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>Vista general del sistema — {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <Statistics escuelas={escuelas} onNavigate={setActiveSection} />
          </div>
        )}

        {activeSection === "escuelas" && (
          <div>
            <div className="flex items-center justify-between mb-16">
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Escuelas</h1>
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>{filteredEscuelas.length} escuela(s) encontrada(s)</p>
              </div>
              <div className="flex gap-8 items-center flex-wrap">
                <div className="view-toggle">
                  <button className={`view-btn ${viewMode === "full" ? "active" : ""}`} onClick={() => setViewMode("full")}>Completo</button>
                  <button className={`view-btn ${viewMode === "compact" ? "active" : ""}`} onClick={() => setViewMode("compact")}>Compacto</button>
                </div>
                {canManageOperationalSections && <button className="btn btn-primary" onClick={() => setEscuelaModal({ isNew: true, data: null })}>➕ Nueva Escuela</button>}
              </div>
            </div>

            {filteredEscuelas.length === 0 && <div className="no-data card">No se encontraron escuelas. {canManageOperationalSections && <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => setEscuelaModal({ isNew: true, data: null })}>Crear primera escuela</button>}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredEscuelas.map(esc => (
                <EscuelaDetail key={esc.id} esc={esc} viewMode={viewMode} isAdmin={canManageOperationalSections}
                  onEdit={() => setEscuelaModal({ isNew: false, data: esc })}
                  onDelete={() => notifyDeleteResult(deleteEscuela, [esc.id], 'Escuela eliminada correctamente.')}
                  onAddDocente={(escId, titularId) => setDocenteModal({ isNew: true, escuelaId: escId, titularId: titularId || null, data: null })}
                  onEditDocente={(escId, doc, titularId) => setDocenteModal({ isNew: false, escuelaId: escId, titularId: titularId || null, data: doc })}
                  onDeleteDocente={(escId, docId) => notifyDeleteResult(deleteDocente, [escId, docId], 'Docente eliminado correctamente.')}
                  onAddAlumno={(escId) => setAlumnoModal({ isNew: true, escuelaId: escId, data: null })}
                  onEditAlumno={(escId, alumno) => setAlumnoModal({ isNew: false, escuelaId: escId, data: alumno })}
                  onDeleteAlumno={(escId, alumnoId) => notifyDeleteResult(deleteAlumno, [escId, alumnoId], 'Alumno eliminado correctamente.')}
                />
              ))}
            </div>
          </div>
        )}

        {activeSection === "alertas" && (
          <div>
            <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 8 }}>Centro de Alertas</h1>
            <AlertPanel escuelas={escuelas} />

            <div className="card mt-16">
              <div className="card-header"><span className="card-title">📋 Resumen de Licencias Activas</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Escuela</th><th>Docente</th><th>Motivo</th><th>Inicio</th><th>Fin</th><th>Días Rest.</th><th>Suplente</th></tr></thead>
                  <tbody>
                    {escuelas.flatMap(esc => esc.docentes.filter(d => d.estado === "Licencia").map(d => (
                      <tr key={`${esc.id}-${d.id}`}>
                        <td style={{ maxWidth: 180, fontSize: 12 }}>{esc.escuela}</td>
                        <td style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{d.nombreApellido}</td>
                        <td style={{ fontSize: 12 }}>{d.motivo}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(d.fechaInicioLicencia)}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(d.fechaFinLicencia)}</td>
                        <td><DaysRemaining fechaFin={d.fechaFinLicencia} /></td>
                        <td style={{ fontSize: 12 }}>{d.suplentes.length > 0 ? d.suplentes.map(s => s.nombreApellido).join(", ") : <span className="badge badge-danger">SIN SUPLENTE</span>}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
                {escuelas.flatMap(e => e.docentes.filter(d => d.estado === "Licencia")).length === 0 && <div className="no-data">No hay licencias activas</div>}
              </div>
            </div>
          </div>
        )}

        {activeSection === "estadisticas" && (
          <div>
            <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>Estadísticas</h1>
            <Statistics escuelas={escuelas} />
          </div>
        )}

        {activeSection === "calendario" && <CalendarioView escuelas={escuelas} isAdmin={isAdmin} />}

        {activeSection === "visitas" && (
          <div>
            <div className="flex items-center justify-between mb-16">
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Visitas a Escuelas</h1>
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>Registro de visitas y observaciones a las escuelas</p>
              </div>
              {canManageOperationalSections && <button className="btn btn-primary" onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: null })}>➕ Nueva Visita</button>}
            </div>
            {filteredVisitas.length === 0 && search && <div className="no-data card">No se encontraron visitas para "{search}"</div>}
            <div className="card-grid">
              {filteredVisitas.map(esc => (
                <div key={esc.id} className="card">
                  <div className="card-header">
                    <span className="card-title">{esc.escuela}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{esc.de}</span>
                  </div>
                  {(!esc.visitas || esc.visitas.length === 0) ? (
                    <div className="no-data">Sin visitas registradas</div>
                  ) : (
                    esc.visitas.map(v => (
                      <div key={v.id} style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>📅 {formatDate(v.fecha)}</div>
                            <div style={{ color: 'var(--text2)', marginTop: 6, fontSize: 12 }}>{v.observaciones}</div>
                          </div>
                          {canManageOperationalSections && (
                            <div className="flex gap-4">
                              <button className="btn btn-secondary btn-sm" onClick={() => setVisitaModal({ isNew: false, data: v, escuelaId: esc.id })}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => notifyDeleteResult(deleteVisita, [esc.id, v.id], 'Visita eliminada correctamente.')}>🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {canManageOperationalSections && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar visita</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "proyectos" && (
          <div>
            <div className="flex items-center justify-between mb-16">
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Proyectos Entregados</h1>
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>Proyectos desarrollados e implementados por los ACDM</p>
              </div>
              {canManageOperationalSections && <button className="btn btn-primary" onClick={() => setProyectoModal({ isNew: true, data: null, escuelaId: null })}>➕ Nuevo Proyecto</button>}
            </div>
            {filteredProyectos.length === 0 && search && <div className="no-data card">No se encontraron proyectos para "{search}"</div>}
            <div className="card-grid">
              {filteredProyectos.map(esc => (
                <div key={esc.id} className="card">
                  <div className="card-header">
                    <span className="card-title">{esc.escuela}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{esc.de}</span>
                  </div>
                  {(!esc.proyectos || esc.proyectos.length === 0) ? (
                    <div className="no-data">Sin proyectos registrados</div>
                  ) : (
                    esc.proyectos.map(p => (
                      <div key={p.id} style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>{p.nombre}</div>
                            <div style={{ color: 'var(--text2)', marginTop: 4, fontSize: 11 }}>{p.descripcion}</div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 11 }}>
                              <span className={`badge badge-${p.estado === 'Completado' ? 'active' : 'warning'}`}>{p.estado}</span>
                              <span style={{ color: 'var(--text3)' }}>📅 {formatDate(p.fechaInicio)} → {formatDate(p.fechaBaja)}</span>
                            </div>
                          </div>
                          {canManageOperationalSections && (
                            <div className="flex gap-4" style={{ marginLeft: 8 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setProyectoModal({ isNew: false, data: p, escuelaId: esc.id })}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => notifyDeleteResult(deleteProyecto, [esc.id, p.id], 'Proyecto eliminado correctamente.')}>🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {canManageOperationalSections && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setProyectoModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar proyecto</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "informes" && (
          <div>
            <div className="flex items-center justify-between mb-16">
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Informes Entregados</h1>
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>Informes periódicos entregados por los ACDM</p>
              </div>
              {canManageOperationalSections && <button className="btn btn-primary" onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: null })}>➕ Nuevo Informe</button>}
            </div>
            {filteredInformes.length === 0 && search && <div className="no-data card">No se encontraron informes para "{search}"</div>}
            <div className="card-grid">
              {filteredInformes.map(esc => (
                <div key={esc.id} className="card">
                  <div className="card-header">
                    <span className="card-title">{esc.escuela}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{esc.de}</span>
                  </div>
                  {(!esc.informes || esc.informes.length === 0) ? (
                    <div className="no-data">Sin informes registrados</div>
                  ) : (
                    esc.informes.map((i, idx) => (
                      <div key={i.id || i._id || `${esc.id}-inf-${idx}`} style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>{String(i?.titulo || 'Sin título')}</div>
                            <div style={{ color: 'var(--text2)', marginTop: 4, fontSize: 11 }}>{String(i?.observaciones || '') || 'Sin observaciones'}</div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 11 }}>
                              <span className={`badge badge-${String(i?.estado || '') === 'Entregado' ? 'active' : 'warning'}`}>{String(i?.estado || 'Pendiente')}</span>
                              <span style={{ color: 'var(--text3)' }}>📅 {formatDate(i?.fechaEntrega)}</span>
                            </div>
                          </div>
                          {canManageOperationalSections && (
                            <div className="flex gap-4" style={{ marginLeft: 8 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setInformeModal({ isNew: false, data: i, escuelaId: esc.id })}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => notifyDeleteResult(deleteInforme, [esc.id, i.id || i._id], 'Informe eliminado correctamente.')}>🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {canManageOperationalSections && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar informe</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "formularios" && (
          <FormulariosSection />
        )}

        {activeSection === "exportar" && (
          <div>
            <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>Exportar</h1>
            <div className="card-grid">
              <div className="card">
                <div className="card-header"><span className="card-title">Reporte de Datos</span></div>
                <p style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 13 }}>Genera reportes en formato texto, CSV o Excel con los datos del sistema.</p>
                <button className="btn btn-primary" onClick={() => setShowExport(true)}>📄 Generar Reporte</button>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Extraer Mails</span></div>
                <p style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 13 }}>Extrae todos los emails de las escuelas. Puedes copiarlos o descargarlos como archivo.</p>
                <button className="btn btn-primary" onClick={() => setShowMailsExtractor(true)}>✉️ Extraer Emails</button>
              </div>
            </div>
          </div>
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
          onSave={handleSaveEscuela} onClose={() => setEscuelaModal(null)} />
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
          onClose={() => setDocenteModal(null)} />
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
          onClose={() => setAlumnoModal(null)} />
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
          onClose={() => setVisitaModal(null)} escuelas={escuelas} />
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
          onClose={() => setProyectoModal(null)} escuelas={escuelas} />
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
          onClose={() => setInformeModal(null)} escuelas={escuelas} />
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
