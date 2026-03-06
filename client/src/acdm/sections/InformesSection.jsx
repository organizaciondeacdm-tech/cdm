import { useState } from 'react';
import { useAcdmContext } from '../context/AcdmContext.jsx';
import { formatDate } from '../utils/dateUtils.js';

export function InformesSection({ filteredInformes, search, onNotifyDelete }) {
    const [viewMode, setViewMode] = useState('full');
    const {
        canManageOperationalSections,
        deleteInforme,
        setInformeModal,
    } = useAcdmContext();

    const totalInformes = filteredInformes.reduce((acc, esc) => acc + (esc.informes?.length || 0), 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-16">
                <div>
                    <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Informes Entregados</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 13 }}>Informes periódicos entregados por los ACDM</p>
                    <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>{totalInformes} informe(s) en {filteredInformes.length} escuela(s)</p>
                </div>
                <div className="flex gap-8 items-center flex-wrap">
                    <div className="view-toggle">
                        <button className={`view-btn ${viewMode === 'full' ? 'active' : ''}`} onClick={() => setViewMode('full')}>Completo</button>
                        <button className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`} onClick={() => setViewMode('compact')}>Compacto</button>
                    </div>
                    {canManageOperationalSections && (
                        <button className="btn btn-primary" onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: null })}>
                            ➕ Nuevo Informe
                        </button>
                    )}
                </div>
            </div>

            {filteredInformes.length === 0 && search && (
                <div className="no-data card">No se encontraron informes para "{search}"</div>
            )}

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
                                <div key={i.id || i._id || `${esc.id}-inf-${idx}`} style={{ padding: viewMode === 'compact' ? '6px 12px' : '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                    {viewMode === 'compact' ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>{String(i?.titulo || 'Sin título')}</span>
                                            <div className="flex gap-4 items-center">
                                                <span className={`badge badge-${String(i?.estado || '') === 'Entregado' ? 'active' : 'warning'}`}>
                                                    {String(i?.estado || 'Pendiente')}
                                                </span>
                                                {canManageOperationalSections && (
                                                    <>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => setInformeModal({ isNew: false, data: i, escuelaId: esc.id })}>✏️</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => onNotifyDelete(deleteInforme, [esc.id, i.id || i._id], 'Informe eliminado correctamente.')}>🗑️</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>
                                                    {String(i?.titulo || 'Sin título')}
                                                </div>
                                                <div style={{ color: 'var(--text2)', marginTop: 4, fontSize: 11 }}>
                                                    {String(i?.observaciones || '') || 'Sin observaciones'}
                                                </div>
                                                <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 11 }}>
                                                    <span className={`badge badge-${String(i?.estado || '') === 'Entregado' ? 'active' : 'warning'}`}>
                                                        {String(i?.estado || 'Pendiente')}
                                                    </span>
                                                    <span style={{ color: 'var(--text3)' }}>📅 {formatDate(i?.fechaEntrega)}</span>
                                                </div>
                                            </div>
                                            {canManageOperationalSections && (
                                                <div className="flex gap-4" style={{ marginLeft: 8 }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setInformeModal({ isNew: false, data: i, escuelaId: esc.id })}>✏️</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => onNotifyDelete(deleteInforme, [esc.id, i.id || i._id], 'Informe eliminado correctamente.')}>🗑️</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        {canManageOperationalSections && (
                            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: esc.id })}>
                                + Agregar informe
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
