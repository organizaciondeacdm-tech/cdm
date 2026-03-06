import { useState } from 'react';
import { formatDate } from '../utils/dateUtils.js';

export function ProyectosSection({
  filteredProyectos,
  search,
  canManageOperationalSections,
  setProyectoModal,
  deleteProyecto,
  onNotifyDelete
}) {
  const [viewMode, setViewMode] = useState('full');
  const totalEntregados = filteredProyectos.reduce((acc, esc) => acc + (esc.proyectos?.length || 0), 0);
  const escuelasConEntregas = filteredProyectos.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Proyectos Entregados</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Proyectos desarrollados e implementados por los ACDM</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>{totalEntregados} entrega(s) en {escuelasConEntregas} escuela(s)</p>
        </div>
        <div className="flex gap-8 items-center flex-wrap">
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'full' ? 'active' : ''}`} onClick={() => setViewMode('full')}>Completo</button>
            <button className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`} onClick={() => setViewMode('compact')}>Compacto</button>
          </div>
          {canManageOperationalSections && <button className="btn btn-primary" onClick={() => setProyectoModal({ isNew: true, data: null, escuelaId: null })}>➕ Nuevo Proyecto</button>}
        </div>
      </div>
      {filteredProyectos.length === 0 && (
        <div className="no-data card">
          {search ? `No se encontraron proyectos para "${search}"` : 'Todavía no hay proyectos entregados'}
        </div>
      )}
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
                <div key={p.id} style={{ padding: viewMode === 'compact' ? '6px 12px' : '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  {viewMode === 'compact' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>{p.nombre}</span>
                      <div className="flex gap-4 items-center">
                        <span className={`badge badge-${p.estado === 'Completado' ? 'active' : 'warning'}`}>{p.estado}</span>
                        {canManageOperationalSections && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setProyectoModal({ isNew: false, data: p, escuelaId: esc.id })}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => onNotifyDelete(deleteProyecto, [esc.id, p.id], 'Proyecto eliminado correctamente.')}>🗑️</button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
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
                          <button className="btn btn-danger btn-sm" onClick={() => onNotifyDelete(deleteProyecto, [esc.id, p.id], 'Proyecto eliminado correctamente.')}>🗑️</button>
                        </div>
                      )}
                    </div>
                  )}
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
  );
}
