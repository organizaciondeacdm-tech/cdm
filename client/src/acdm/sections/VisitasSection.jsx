import { formatDate } from '../utils/dateUtils.js';

export function VisitasSection({
  filteredVisitas,
  search,
  canManageOperationalSections,
  setVisitaModal,
  deleteVisita,
  onNotifyDelete
}) {
  return (
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
                        <button className="btn btn-danger btn-sm" onClick={() => onNotifyDelete(deleteVisita, [esc.id, v.id], 'Visita eliminada correctamente.')}>🗑️</button>
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
  );
}
