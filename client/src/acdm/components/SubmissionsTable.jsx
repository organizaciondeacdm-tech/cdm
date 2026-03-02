import { useMemo } from 'react';

export function SubmissionsTable({ rows, columnFilters, setColumnFilters, onDelete }) {
  const columns = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      Object.keys(row.payload || {}).forEach((key) => set.add(key));
    });
    return Array.from(set).slice(0, 8);
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const payload = row.payload || {};
      return Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return String(payload[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [rows, columnFilters]);

  return (
    <section className="card table-card">
      <h2>Registros</h2>
      <div className="filters">
        {columns.map((column) => (
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
            {columns.map((column) => <th key={column}>{column}</th>)}
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row._id}>
              {columns.map((column) => <td key={`${row._id}-${column}`}>{String(row.payload?.[column] ?? '-')}</td>)}
              <td>{row.status || 'synced'}</td>
              <td>
                <button type="button" onClick={() => onDelete(row._id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
