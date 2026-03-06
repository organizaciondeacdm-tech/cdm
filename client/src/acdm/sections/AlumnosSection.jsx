import { useState, useMemo } from 'react';

const DIAGNOSTICO_COLORS = {
  'TEA': '#a259ff',
  'TDAH': '#00d4ff',
  'Discapacidad motriz': '#f6c90e',
  'Discapacidad visual': '#ff9f43',
  'Discapacidad auditiva': '#4ecdc4',
  'Discapacidad intelectual': '#ff6b6b',
  'Dificultades de aprendizaje': '#74b9ff',
  'Sin especificar': '#606070',
};

const getDiagnosticoBadge = (diagnostico) => {
  const d = String(diagnostico || '').trim();
  const colorKey = Object.keys(DIAGNOSTICO_COLORS).find(k =>
    d.toLowerCase().includes(k.toLowerCase())
  );
  const color = colorKey ? DIAGNOSTICO_COLORS[colorKey] : '#888';
  return {
    background: `${color}22`,
    border: `1px solid ${color}55`,
    color,
  };
};

const GRADO_ORDER = [
  'Sala de 3', 'Sala de 4', 'Sala de 5',
  '1° Grado', '2° Grado', '3° Grado', '4° Grado', '5° Grado', '6° Grado', '7° Grado',
  '1° Año', '2° Año', '3° Año', '4° Año', '5° Año', '6° Año',
];

const gradoSortKey = (g) => {
  const idx = GRADO_ORDER.findIndex(k => String(g || '').toLowerCase().includes(k.toLowerCase().split(' ')[0]));
  return idx >= 0 ? idx : 999;
};

export function AlumnosSection({ escuelas }) {
  const [search, setSearch] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [filterDiagnostico, setFilterDiagnostico] = useState('');
  const [filterDE, setFilterDE] = useState('');
  const [sortField, setSortField] = useState('apellido');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Flatten all alumnos across all escuelas
  const allAlumnos = useMemo(() => {
    const list = [];
    (escuelas || []).forEach(esc => {
      (esc.alumnos || []).forEach(al => {
        list.push({ ...al, escuelaNombre: esc.escuela, escuelaDE: esc.de, escuelaId: esc.id });
      });
    });
    return list;
  }, [escuelas]);

  const grados = useMemo(() =>
    [...new Set(allAlumnos.map(a => a.gradoSalaAnio).filter(Boolean))]
      .sort((a, b) => gradoSortKey(a) - gradoSortKey(b)),
    [allAlumnos]
  );
  const diagnosticos = useMemo(() => [...new Set(allAlumnos.map(a => a.diagnostico).filter(Boolean))].sort(), [allAlumnos]);
  const des = useMemo(() => [...new Set(allAlumnos.map(a => a.escuelaDE).filter(Boolean))].sort(), [allAlumnos]);

  const term = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    let result = allAlumnos;
    if (filterGrado) result = result.filter(a => a.gradoSalaAnio === filterGrado);
    if (filterDiagnostico) result = result.filter(a => a.diagnostico === filterDiagnostico);
    if (filterDE) result = result.filter(a => a.escuelaDE === filterDE);
    if (term) {
      result = result.filter(a =>
        String(a.nombre || '').toLowerCase().includes(term) ||
        String(a.apellido || '').toLowerCase().includes(term) ||
        String(a.gradoSalaAnio || '').toLowerCase().includes(term) ||
        String(a.diagnostico || '').toLowerCase().includes(term) ||
        String(a.escuelaNombre || '').toLowerCase().includes(term) ||
        String(a.escuelaDE || '').toLowerCase().includes(term) ||
        String(a.dni || '').includes(term)
      );
    }
    // Sort
    result = [...result].sort((a, b) => {
      let av = '';
      let bv = '';
      if (sortField === 'apellido') {
        av = String(a.apellido || a.nombre || '').toLowerCase();
        bv = String(b.apellido || b.nombre || '').toLowerCase();
      } else if (sortField === 'escuela') {
        av = String(a.escuelaNombre || '').toLowerCase();
        bv = String(b.escuelaNombre || '').toLowerCase();
      } else if (sortField === 'grado') {
        av = gradoSortKey(a.gradoSalaAnio);
        bv = gradoSortKey(b.gradoSalaAnio);
        return sortDir === 'asc' ? av - bv : bv - av;
      } else if (sortField === 'diagnostico') {
        av = String(a.diagnostico || '').toLowerCase();
        bv = String(b.diagnostico || '').toLowerCase();
      }
      if (typeof av === 'string') {
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return result;
  }, [allAlumnos, filterGrado, filterDiagnostico, filterDE, term, sortField, sortDir]);

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
    const total = allAlumnos.length;
    const gradoCounts = {};
    allAlumnos.forEach(a => { if (a.gradoSalaAnio) gradoCounts[a.gradoSalaAnio] = (gradoCounts[a.gradoSalaAnio] || 0) + 1; });
    const diagCounts = {};
    allAlumnos.forEach(a => {
      const d = a.diagnostico || 'Sin especificar';
      diagCounts[d] = (diagCounts[d] || 0) + 1;
    });
    const topGrado = Object.entries(gradoCounts).sort((a, b) => b[1] - a[1])[0];
    const topDiag = Object.entries(diagCounts)
      .filter(([k]) => k !== 'Sin especificar')
      .sort((a, b) => b[1] - a[1])[0];
    return { total, topGrado, topDiag, gradoCounts, diagCounts };
  }, [allAlumnos]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
            🎒 Alumnos
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Registro completo de alumnos del sistema
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total alumnos', value: stats.total, color: 'var(--accent)', icon: '🎒' },
          { label: 'Escuelas', value: (escuelas || []).length, color: '#00b894', icon: '🏫' },
          { label: 'Grado + frecuente', value: stats.topGrado ? `${stats.topGrado[0]} (${stats.topGrado[1]})` : '-', color: '#a259ff', icon: '📚' },
          { label: 'Diagnóstico + frecuente', value: stats.topDiag ? `${stats.topDiag[0].split(' ')[0]} (${stats.topDiag[1]})` : '-', color: '#f6c90e', icon: '🩺' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: s.value.toString().length > 10 ? 14 : 22, fontWeight: 700, color: s.color, lineHeight: 1.2, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-16" style={{ padding: 12 }}>
        <div className="flex gap-8 items-center flex-wrap">
          <input
            className="form-input"
            placeholder="Buscar por nombre, DNI, escuela, diagnóstico..."
            value={search}
            onChange={handleFilter(setSearch)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select className="form-input" value={filterGrado} onChange={handleFilter(setFilterGrado)} style={{ minWidth: 140 }}>
            <option value="">Todos los grados</option>
            {grados.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="form-input" value={filterDiagnostico} onChange={handleFilter(setFilterDiagnostico)} style={{ minWidth: 170 }}>
            <option value="">Todos los diagnósticos</option>
            {diagnosticos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="form-input" value={filterDE} onChange={handleFilter(setFilterDE)} style={{ minWidth: 100 }}>
            <option value="">Todos los DE</option>
            {des.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(search || filterGrado || filterDiagnostico || filterDE) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setFilterGrado(''); setFilterDiagnostico(''); setFilterDE(''); setPage(1); }}
            >
              ✕ Limpiar
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 4 }}>
            {filtered.length} alumno(s)
          </span>
        </div>
      </div>

      {/* Distribution mini-chart */}
      {Object.keys(stats.diagCounts).length > 1 && (
        <div className="card mb-16" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Distribución por diagnóstico</div>
          <div className="flex gap-8 items-center flex-wrap">
            {Object.entries(stats.diagCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([diag, count]) => (
                <div key={diag} className="flex items-center gap-4">
                  <span style={{
                    ...getDiagnosticoBadge(diag),
                    padding: '3px 8px', borderRadius: 4, fontSize: 11
                  }}>
                    {diag} · {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="no-data" style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎒</div>
            <div>No se encontraron alumnos</div>
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
                    Alumno <SortIcon field="apellido" />
                  </th>
                  <th
                    style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('grado')}
                  >
                    Grado / Sala <SortIcon field="grado" />
                  </th>
                  <th
                    style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('diagnostico')}
                  >
                    Diagnóstico <SortIcon field="diagnostico" />
                  </th>
                  <th
                    style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('escuela')}
                  >
                    Escuela <SortIcon field="escuela" />
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600 }}>
                    Observaciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((al, i) => {
                  const displayName = al.nombre || `${al.apellido || ''}, ${String(al.nombre || '')}`.replace(/^,\s*/, '').trim();
                  return (
                    <tr
                      key={al.id || `${al.escuelaId}-${i}`}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text1)' }}>
                          {displayName}
                        </div>
                        {al.dni && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>DNI {al.dni}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>
                        {al.gradoSalaAnio || '-'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {al.diagnostico ? (
                          <span className="badge" style={{ ...getDiagnosticoBadge(al.diagnostico), padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>
                            {al.diagnostico}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text2)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ color: 'var(--text1)', fontSize: 13 }}>{al.escuelaNombre}</div>
                        <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 1 }}>{al.escuelaDE}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text2)', fontSize: 12, maxWidth: 200 }}>
                        {al.observaciones ? (
                          <span title={al.observaciones} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {al.observaciones}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
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
