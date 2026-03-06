import { useState, useMemo } from 'react';

const CARGO_COLORS = {
  'Titular': '#00d4ff',
  'Suplente': '#a259ff',
  'Interino': '#f6c90e',
  'Provisorio': '#ff9f43',
  'Maestro de Grado': '#4ecdc4',
  'Maestro de Educación Especial': '#ff6b6b',
  'Maestro de Educación Inicial': '#a8e6cf',
  'Profesor': '#6c5ce7',
  'Directivo': '#fd79a8',
  'Vice-director': '#e17055',
  'Secretario': '#74b9ff',
  'Auxiliar': '#55efc4',
};

const ESTADO_COLORS = {
  'Activo': '#00b894',
  'Licencia': '#f6c90e',
  'Renunció': '#ff6b6b',
  'Jubilado': '#a0a0b0',
};

const getCargoBadge = (cargo) => ({
  background: `${CARGO_COLORS[cargo] || '#888'}22`,
  border: `1px solid ${CARGO_COLORS[cargo] || '#888'}55`,
  color: CARGO_COLORS[cargo] || '#aaa',
});

const getEstadoBadge = (estado) => ({
  background: `${ESTADO_COLORS[estado] || '#888'}22`,
  border: `1px solid ${ESTADO_COLORS[estado] || '#888'}55`,
  color: ESTADO_COLORS[estado] || '#aaa',
});

export function DocentesSection({ escuelas }) {
  const [search, setSearch] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterDE, setFilterDE] = useState('');
  const [sortField, setSortField] = useState('apellido');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Flatten all docentes across all escuelas
  const allDocentes = useMemo(() => {
    const list = [];
    (escuelas || []).forEach(esc => {
      (esc.docentes || []).forEach(doc => {
        list.push({ ...doc, escuelaNombre: esc.escuela, escuelaDE: esc.de, escuelaId: esc.id });
        // Also add suplentes
        (doc.suplentes || []).forEach(sup => {
          list.push({ ...sup, escuelaNombre: esc.escuela, escuelaDE: esc.de, escuelaId: esc.id, _esSuplente: true });
        });
      });
    });
    return list;
  }, [escuelas]);

  const cargos = useMemo(() => [...new Set(allDocentes.map(d => d.cargo).filter(Boolean))].sort(), [allDocentes]);
  const estados = useMemo(() => [...new Set(allDocentes.map(d => d.estado).filter(Boolean))].sort(), [allDocentes]);
  const des = useMemo(() => [...new Set(allDocentes.map(d => d.escuelaDE).filter(Boolean))].sort(), [allDocentes]);

  const term = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    let result = allDocentes;
    if (filterCargo) result = result.filter(d => d.cargo === filterCargo);
    if (filterEstado) result = result.filter(d => d.estado === filterEstado);
    if (filterDE) result = result.filter(d => d.escuelaDE === filterDE);
    if (term) {
      result = result.filter(d =>
        String(d.nombreApellido || `${d.apellido || ''} ${d.nombre || ''}`).toLowerCase().includes(term) ||
        String(d.cargo || '').toLowerCase().includes(term) ||
        String(d.estado || '').toLowerCase().includes(term) ||
        String(d.escuelaNombre || '').toLowerCase().includes(term) ||
        String(d.escuelaDE || '').toLowerCase().includes(term) ||
        String(d.dni || '').includes(term)
      );
    }
    // Sort
    result = [...result].sort((a, b) => {
      let av = '';
      let bv = '';
      if (sortField === 'apellido') {
        av = String(a.apellido || a.nombreApellido || '').toLowerCase();
        bv = String(b.apellido || b.nombreApellido || '').toLowerCase();
      } else if (sortField === 'escuela') {
        av = String(a.escuelaNombre || '').toLowerCase();
        bv = String(b.escuelaNombre || '').toLowerCase();
      } else if (sortField === 'cargo') {
        av = String(a.cargo || '').toLowerCase();
        bv = String(b.cargo || '').toLowerCase();
      } else if (sortField === 'estado') {
        av = String(a.estado || '').toLowerCase();
        bv = String(b.estado || '').toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [allDocentes, filterCargo, filterEstado, filterDE, term, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const handleFilter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ color: 'var(--text2)', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: 'var(--accent)', marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Stats
  const stats = useMemo(() => {
    const total = allDocentes.length;
    const activos = allDocentes.filter(d => d.estado === 'Activo').length;
    const licencia = allDocentes.filter(d => d.estado === 'Licencia').length;
    const cargoCounts = {};
    allDocentes.forEach(d => { if (d.cargo) cargoCounts[d.cargo] = (cargoCounts[d.cargo] || 0) + 1; });
    const topCargo = Object.entries(cargoCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, activos, licencia, topCargo };
  }, [allDocentes]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
            👩‍🏫 Docentes
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Registro completo de docentes del sistema
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--accent)', icon: '👥' },
          { label: 'Activos', value: stats.activos, color: '#00b894', icon: '✅' },
          { label: 'En Licencia', value: stats.licencia, color: '#f6c90e', icon: '🏥' },
          { label: 'Cargo + frecuente', value: stats.topCargo ? `${stats.topCargo[0]} (${stats.topCargo[1]})` : '-', color: '#a259ff', icon: '📋' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1.2, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-16" style={{ padding: 12 }}>
        <div className="flex gap-8 items-center flex-wrap">
          <input
            className="form-input"
            placeholder="Buscar por nombre, DNI, escuela, cargo..."
            value={search}
            onChange={handleFilter(setSearch)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select className="form-input" value={filterCargo} onChange={handleFilter(setFilterCargo)} style={{ minWidth: 150 }}>
            <option value="">Todos los cargos</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-input" value={filterEstado} onChange={handleFilter(setFilterEstado)} style={{ minWidth: 130 }}>
            <option value="">Todos los estados</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className="form-input" value={filterDE} onChange={handleFilter(setFilterDE)} style={{ minWidth: 100 }}>
            <option value="">Todos los DE</option>
            {des.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(search || filterCargo || filterEstado || filterDE) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setFilterCargo(''); setFilterEstado(''); setFilterDE(''); setPage(1); }}
            >
              ✕ Limpiar
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 4 }}>
            {filtered.length} docente(s)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="no-data" style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👩‍🏫</div>
            <div>No se encontraron docentes</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  <th
                    style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('apellido')}
                  >
                    Docente <SortIcon field="apellido" />
                  </th>
                  <th
                    style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('cargo')}
                  >
                    Cargo <SortIcon field="cargo" />
                  </th>
                  <th
                    style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('estado')}
                  >
                    Estado <SortIcon field="estado" />
                  </th>
                  <th
                    style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('escuela')}
                  >
                    Escuela <SortIcon field="escuela" />
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600 }}>
                    Jornada
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((doc, i) => (
                  <tr
                    key={doc.id || `${doc.escuelaId}-${i}`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text1)' }}>
                        {doc.nombreApellido || `${doc.apellido || ''}, ${doc.nombre || ''}`.trim().replace(/^,\s*/, '')}
                        {doc._esSuplente && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(162,89,255,0.15)', border: '1px solid rgba(162,89,255,0.3)', color: '#a259ff', padding: '1px 5px', borderRadius: 3 }}>
                            suplente
                          </span>
                        )}
                      </div>
                      {doc.dni && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>DNI {doc.dni}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge" style={{ ...getCargoBadge(doc.cargo), padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>
                        {doc.cargo || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge" style={{ ...getEstadoBadge(doc.estado), padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>
                        {doc.estado || '-'}
                      </span>
                      {doc.estado === 'Licencia' && doc.fechaFinLicencia && (
                        <div style={{ fontSize: 10, color: '#f6c90e', marginTop: 2 }}>
                          hasta {doc.fechaFinLicencia}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: 'var(--text1)', fontSize: 13 }}>{doc.escuelaNombre}</div>
                      <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 1 }}>{doc.escuelaDE}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)', fontSize: 12 }}>
                      {doc.jornada || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-12" style={{ fontSize: 13 }}>
          <span style={{ color: 'var(--text2)' }}>
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex gap-8">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
              return (
                <button
                  key={p}
                  className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
