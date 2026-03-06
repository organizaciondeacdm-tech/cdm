import { EscuelaDetail } from '../components/system/index.js';

export function EscuelasSection({
  filteredEscuelas,
  viewMode,
  setViewMode,
  canManageOperationalSections,
  setEscuelaModal,
  setDocenteModal,
  setAlumnoModal,
  deleteEscuela,
  deleteDocente,
  deleteAlumno,
  onNotifyDelete
}) {
  return (
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
            onDelete={() => onNotifyDelete(deleteEscuela, [esc.id], 'Escuela eliminada correctamente.')}
            onAddDocente={(escId, titularId) => setDocenteModal({ isNew: true, escuelaId: escId, titularId: titularId || null, data: null })}
            onEditDocente={(escId, doc, titularId) => setDocenteModal({ isNew: false, escuelaId: escId, titularId: titularId || null, data: doc })}
            onDeleteDocente={(escId, docId) => onNotifyDelete(deleteDocente, [escId, docId], 'Docente eliminado correctamente.')}
            onAddAlumno={(escId) => setAlumnoModal({ isNew: true, escuelaId: escId, data: null })}
            onEditAlumno={(escId, alumno) => setAlumnoModal({ isNew: false, escuelaId: escId, data: alumno })}
            onDeleteAlumno={(escId, alumnoId) => onNotifyDelete(deleteAlumno, [escId, alumnoId], 'Alumno eliminado correctamente.')}
          />
        ))}
      </div>
    </div>
  );
}
