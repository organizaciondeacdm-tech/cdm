import { useEffect, useMemo, useState } from 'react';

export function SubmissionsTable({ rows, columnFilters, setColumnFilters, onDelete }) {
  const columns = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      Object.keys(row.payload || {}).forEach((key) => set.add(key));
    });
    return Array.from(set).slice(0, 8);
  }, [rows]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState([]);

  useEffect(() => {
    setVisibleColumns((prev) => {
      if (!prev.length) return columns;
      const next = prev.filter((column) => columns.includes(column));
      const missing = columns.filter((column) => !next.includes(column));
      return [...next, ...missing];
    });
  }, [columns]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, columnFilters, itemsPerPage]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const payload = row.payload || {};

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matches = Object.values(payload).some((value) =>
          String(value || '').toLowerCase().includes(searchLower)
        );
        if (!matches) return false;
      }

      return Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return String(payload[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [rows, columnFilters, searchTerm]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));

  const displayColumns = columns.filter((column) => visibleColumns.includes(column));

  const toggleColumnVisibility = (column) => {
    setVisibleColumns((prev) => (
      prev.includes(column)
        ? prev.filter((key) => key !== column)
        : [...prev, column]
    ));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setCurrentPage(1);
  };

  return (
    <section className="card table-card">
      <h2>Registros</h2>
      <div className="flex gap-8 mb-16" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ width: 260 }}
          placeholder="Buscar en todos los campos..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="form-select"
          style={{ width: 160 }}
          value={itemsPerPage}
          onChange={(event) => setItemsPerPage(Number(event.target.value) || 10)}
        >
          <option value={10}>10 por página</option>
          <option value={20}>20 por página</option>
          <option value={50}>50 por página</option>
        </select>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowColumnSelector((v) => !v)}>
          ⚙️ Columnas
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
          Limpiar filtros
        </button>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
          {filteredRows.length} resultado(s)
        </span>
      </div>

      {showColumnSelector && (
        <div className="card mb-16" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Columnas visibles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {columns.map((column) => (
              <label key={column} style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column)}
                  onChange={() => toggleColumnVisibility(column)}
                /> {column}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="filters">
        {displayColumns.map((column) => (
          <label key={column}>
            <span>{column}</span>
            <input
              value={columnFilters[column] || ''}
              onChange={(event) => setColumnFilters((current) => ({ ...current, [column]: event.target.value }))}
            />
          </label>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            {displayColumns.map((column) => <th key={column}>{column}</th>)}
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRows.map((row) => (
            <tr key={row._id}>
              {displayColumns.map((column) => <td key={`${row._id}-${column}`}>{String(row.payload?.[column] ?? '-')}</td>)}
              <td>{row.status || 'synced'}</td>
              <td>
                <button type="button" onClick={() => onDelete(row._id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {paginatedRows.length === 0 && (
            <tr>
              <td colSpan={displayColumns.length + 2} style={{ textAlign: 'center', color: 'var(--text2)' }}>
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-16" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-8">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPage(1)} disabled={currentPage <= 1}>⏮</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>←</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>→</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>⏭</button>
        </div>
      </div>
    </section>
  );
}
