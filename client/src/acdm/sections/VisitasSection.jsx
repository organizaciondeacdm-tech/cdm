import { useState } from 'react';
import { formatDate } from '../utils/dateUtils.js';

export function VisitasSection({
  filteredVisitas,
  search,
  canManageOperationalSections,
  setVisitaModal,
  deleteVisita,
  onNotifyDelete
}) {
  const [viewMode, setViewMode] = useState('full');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const resolveVisitaId = (v) => v?.id || v?._id || null;
  const normalizedFrom = fromDate && toDate && fromDate > toDate ? toDate : fromDate;
  const normalizedTo = fromDate && toDate && fromDate > toDate ? fromDate : toDate;
  const term = String(localQuery || '').toLowerCase().trim();

  const filteredByLocalCriteria = filteredVisitas
    .map((esc) => ({
      ...esc,
      visitas: (esc.visitas || []).filter((visita) => {
        const fecha = String(visita?.fecha || '');
        if (normalizedFrom && fecha && fecha < normalizedFrom) return false;
        if (normalizedTo && fecha && fecha > normalizedTo) return false;
        if (!term) return true;
        return (
          String(visita?.observaciones || '').toLowerCase().includes(term)
          || String(esc?.escuela || '').toLowerCase().includes(term)
          || String(esc?.de || '').toLowerCase().includes(term)
          || String(fecha).includes(term)
        );
      })
    }))
    .filter((esc) => esc.visitas.length > 0);

  const totalVisitas = filteredByLocalCriteria.reduce((acc, esc) => acc + (esc.visitas?.length || 0), 0);

  const flatVisitas = filteredByLocalCriteria.flatMap((esc) =>
    (esc.visitas || []).map((visita) => ({
      ...visita,
      visitaId: resolveVisitaId(visita),
      escuelaId: esc.id,
      escuela: esc.escuela,
      de: esc.de
    }))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Visitas a Escuelas</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Registro de visitas y observaciones a las escuelas</p>
          <div className="flex gap-8 items-center" style={{ marginTop: 8 }}>
            <span className="badge badge-info" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent)' }}>
              {totalVisitas} visita(s)
            </span>
            <span className="badge badge-info" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent)' }}>
              {filteredVisitas.length} escuela(s)
            </span>
          </div>
        </div>
        <div className="flex gap-8 items-center flex-wrap">
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'full' ? 'active' : ''}`} onClick={() => setViewMode('full')}>Completo</button>
            <button className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`} onClick={() => setViewMode('compact')}>Compacto</button>
            <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>Tabla</button>
          </div>
          {canManageOperationalSections && <button className="btn btn-primary" onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: null })}>➕ Nueva Visita</button>}
        </div>
      </div>

      <div className="card mb-16" style={{ padding: 12 }}>
        <div className="flex gap-8 items-center flex-wrap">
          <input
            className="form-input"
            placeholder="Filtrar por escuela, DE, observación o fecha..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            style={{ minWidth: 280, flex: 1 }}
          />
          <input
            type="date"
            className="form-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ minWidth: 170 }}
          />
          <input
            type="date"
            className="form-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ minWidth: 170 }}
          />
          <button
            className="btn btn-secondary"
            onClick={() => {
              setLocalQuery('');
              setFromDate('');
              setToDate('');
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      {filteredByLocalCriteria.length === 0 && (
        <div className="no-data card">
          {search ? `No se encontraron visitas para "${search}"` : 'Todavía no hay visitas registradas'}
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Escuela</th>
                <th>DE</th>
                <th>Observaciones</th>
                {canManageOperationalSections && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {flatVisitas.map((row, index) => (
                <tr key={row.visitaId ? `${row.escuelaId}-${row.visitaId}` : `${row.escuelaId}-${index}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.fecha)}</td>
                  <td style={{ fontWeight: 600 }}>{row.escuela}</td>
                  <td>{row.de}</td>
                  <td style={{ color: 'var(--text2)' }}>{row.observaciones || 'Sin observaciones'}</td>
                  {canManageOperationalSections && (
                    <td>
                      <div className="flex gap-4">
                        <button className="btn btn-secondary btn-sm" onClick={() => setVisitaModal({ isNew: false, data: row, escuelaId: row.escuelaId })}>✏️</button>
                        <button className="btn btn-danger btn-sm" disabled={!row.visitaId} onClick={() => onNotifyDelete(deleteVisita, [row.escuelaId, row.visitaId], 'Visita eliminada correctamente.')}>🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-grid">
          {filteredByLocalCriteria.map(esc => (
            <div key={esc.id} className="card">
              <div className="card-header">
                <span className="card-title">{esc.escuela}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{esc.de}</span>
              </div>
              {(!esc.visitas || esc.visitas.length === 0) ? (
                <div className="no-data">Sin visitas registradas</div>
              ) : (
                esc.visitas.map((v, index) => {
                  const visitaId = resolveVisitaId(v);
                  return (
                    <div key={visitaId ? `${esc.id}-${String(visitaId)}` : `${esc.id}-visita-${index}`} style={{ padding: viewMode === 'compact' ? '6px 12px' : '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      {viewMode === 'compact' ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>📅 {formatDate(v.fecha)}</span>
                            <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {v.observaciones || 'Sin observaciones'}
                            </div>
                          </div>
                          <div className="flex gap-4 items-center">
                            {canManageOperationalSections && (
                              <>
                                <button className="btn btn-secondary btn-sm" onClick={() => setVisitaModal({ isNew: false, data: v, escuelaId: esc.id })}>✏️</button>
                                <button className="btn btn-danger btn-sm" disabled={!visitaId} onClick={() => onNotifyDelete(deleteVisita, [esc.id, visitaId], 'Visita eliminada correctamente.')}>🗑️</button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>📅 {formatDate(v.fecha)}</div>
                            <div style={{ color: 'var(--text2)', marginTop: 6, fontSize: 12 }}>{v.observaciones || 'Sin observaciones'}</div>
                          </div>
                          {canManageOperationalSections && (
                            <div className="flex gap-4">
                              <button className="btn btn-secondary btn-sm" onClick={() => setVisitaModal({ isNew: false, data: v, escuelaId: esc.id })}>✏️</button>
                              <button className="btn btn-danger btn-sm" disabled={!visitaId} onClick={() => onNotifyDelete(deleteVisita, [esc.id, visitaId], 'Visita eliminada correctamente.')}>🗑️</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {canManageOperationalSections && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar visita</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
