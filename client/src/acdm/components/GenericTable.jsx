import { useState, useMemo, useEffect } from 'react';
import { GenericForm } from './GenericForm';

export function GenericTable({ 
  title, 
  columns: initialColumns, 
  data = [], 
  onAdd, 
  onEdit, 
  onDelete,
  onFetch,
  apiEndpoint,
  emptyMessage = "Sin registros",
  itemsPerPage = 10,
  enableRemoteSync = false,
  formLayout = {}
}) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [showForm, setShowForm] = useState(false);
  
  // Estados para funcionalidades avanzadas
  const [visibleColumns, setVisibleColumns] = useState(initialColumns.map(c => c.key));
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Estados de carga y sincronización
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [localData, setLocalData] = useState(data);

  // Actualizar localData cuando cambia data
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Cargar datos desde API si está disponible
  useEffect(() => {
    if (enableRemoteSync && onFetch) {
      loadRemoteData();
    }
  }, [enableRemoteSync, onFetch]);

  const loadRemoteData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await onFetch();
      setLocalData(result || []);
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOptionValue = (option) => {
    if (option && typeof option === 'object') {
      if (option.value !== undefined) return String(option.value);
      if (option.id !== undefined) return String(option.id);
      if (option.key !== undefined) return String(option.key);
      return '';
    }
    return option !== undefined && option !== null ? String(option) : '';
  };

  const getOptionLabel = (option) => {
    if (option && typeof option === 'object') {
      if (option.label !== undefined) return String(option.label);
      if (option.name !== undefined) return String(option.name);
      if (option.title !== undefined) return String(option.title);
      if (option.value !== undefined) return String(option.value);
      return '';
    }
    return option !== undefined && option !== null ? String(option) : '';
  };

  const formColumns = useMemo(() => {
    return initialColumns.filter((col) => {
      if (col.form === false || col.editable === false || col.readOnly) return false;
      if (col.render && col.form !== true) return false;
      return true;
    });
  }, [initialColumns]);

  // Columnas visibles
  const displayColumns = initialColumns.filter(col => visibleColumns.includes(col.key));

  // Filtrado y búsqueda
  const filteredData = useMemo(() => {
    return localData.filter(item => {
      // Búsqueda global
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matches = Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchLower)
        );
        if (!matches) return false;
      }

      // Filtros específicos por columna
      for (const [key, filterValue] of Object.entries(filters)) {
        if (filterValue && String(item[key] || '').toLowerCase() !== String(filterValue).toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [localData, searchTerm, filters]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    let sorted = [...filteredData];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = String(aVal).localeCompare(String(bVal), 'es');
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sorted;
  }, [filteredData, sortConfig]);

  // Paginación
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || null
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleAdd = () => {
    setFormData({});
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (row) => {
    setFormData(row);
    setEditingId(row.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSyncing(true);
    setError(null);
    try {
      if (editingId) {
        await onEdit(editingId, formData);
      } else {
        await onAdd(formData);
      }
      
      if (enableRemoteSync && onFetch) {
        await loadRemoteData();
      }
      
      setShowForm(false);
      setFormData({});
    } catch (err) {
      setError(err.message || 'Error al guardar');
      console.error('Error saving:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este registro?')) {
      handleDeleteConfirmed(id);
    }
  };

  const handleDeleteConfirmed = async (id) => {
    setSyncing(true);
    setError(null);
    try {
      await onDelete(id);
      
      if (enableRemoteSync && onFetch) {
        await loadRemoteData();
      }
    } catch (err) {
      setError(err.message || 'Error al eliminar');
      console.error('Error deleting:', err);
    } finally {
      setSyncing(false);
    }
  };

  const toggleColumnVisibility = (key) => {
    setVisibleColumns(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getUniqueValues = (key) => {
    return [...new Set(localData.map(item => item[key]))].filter(v => v);
  };

  return (
    <div>
      {/* Mensajes de error */}
      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(255, 71, 87, 0.1)',
          border: '1px solid var(--red)',
          borderRadius: '6px',
          color: 'var(--red)',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--red)',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--accent)',
            flex: 1
          }}>
            {title}
            {loading && <span style={{ marginLeft: '8px', opacity: 0.6 }}>⏳</span>}
          </h2>

          {/* Controles */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Búsqueda global */}
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar globalmente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingLeft: '28px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--card2)',
                  color: 'var(--text)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Selector de columnas */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                title="Mostrar/Ocultar columnas"
                style={{ padding: '8px 12px', fontSize: '12px' }}
              >
                ⚙️
              </button>
              {showColumnSelector && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  minWidth: '220px',
                  zIndex: 100,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text2)',
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                  }}>
                    Columnas Visibles
                  </div>
                  {initialColumns.map(col => (
                    <label key={col.key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 0',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumnVisibility(col.key)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Botón de filtros avanzados */}
            <button
              className="btn btn-secondary"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                background: Object.keys(filters).length > 0 ? 'rgba(0,217,102,0.2)' : undefined,
                borderColor: Object.keys(filters).length > 0 ? 'var(--green)' : undefined
              }}
            >
              🔍 {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
            </button>

            {/* Botón recargar */}
            {enableRemoteSync && (
              <button
                className="btn btn-secondary"
                onClick={loadRemoteData}
                disabled={loading}
                style={{ padding: '8px 12px', fontSize: '12px' }}
              >
                {loading ? '⏳' : '🔄'}
              </button>
            )}

            {/* Botón agregar */}
            <button 
              className="btn btn-primary" 
              onClick={handleAdd}
              disabled={syncing}
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              {syncing ? '⏳' : '+'} Nuevo
            </button>
          </div>
        </div>

        {/* Panel de filtros avanzados */}
        {showAdvancedFilters && (
          <div style={{
            background: 'var(--card2)',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text2)',
                textTransform: 'uppercase'
              }}>
                Filtros por Columna
              </h3>
              {Object.keys(filters).length > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {displayColumns.map(col => (
                <div key={col.key}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text3)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {col.label}
                  </label>
                  {col.type === 'select' && col.options ? (
                    <select
                      value={filters[col.key] || ''}
                      onChange={(e) => handleFilter(col.key, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--text)',
                        fontSize: '12px'
                      }}
                    >
                      <option value="">Todos</option>
                      {col.options.map((opt, index) => {
                        const optionValue = getOptionValue(opt);
                        const optionLabel = getOptionLabel(opt);
                        return (
                          <option key={`${optionValue}-${index}`} value={optionValue}>{optionLabel}</option>
                        );
                      })}
                    </select>
                  ) : (
                    <select
                      value={filters[col.key] || ''}
                      onChange={(e) => handleFilter(col.key, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--text)',
                        fontSize: '12px'
                      }}
                    >
                      <option value="">Todos</option>
                      {getUniqueValues(col.key).map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Información de resultados */}
        <div style={{
          fontSize: '12px',
          color: 'var(--text3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span>
            📊 {sortedData.length} resultado{sortedData.length !== 1 ? 's' : ''} 
            {searchTerm || Object.keys(filters).length > 0 ? ' (filtrados)' : ''}
            {enableRemoteSync && syncing && ' • Sincronizando...'}
          </span>
          {sortConfig.key && (
            <span style={{ color: 'var(--accent)', fontSize: '11px' }}>
              ↕️ Ordenado: {initialColumns.find(c => c.key === sortConfig.key)?.label} ({sortConfig.direction})
            </span>
          )}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="card" style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text3)',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          ⏳ Cargando datos...
        </div>
      ) : paginatedData.length > 0 ? (
        <div className="card" style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{
                borderBottom: '2px solid var(--border)',
                background: 'var(--card2)'
              }}>
                {displayColumns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: '12px 8px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: sortConfig.key === col.key ? 'var(--accent)' : 'var(--text2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {col.label}
                      <span style={{ opacity: 0.6 }}>
                        {getSortIcon(col.key)}
                      </span>
                    </div>
                  </th>
                ))}
                <th style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text2)',
                  textTransform: 'uppercase'
                }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(row => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid var(--border2)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {displayColumns.map(col => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 8px',
                        fontSize: '13px',
                        color: 'var(--text)',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={String(row[col.key])}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  <td style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    display: 'flex',
                    gap: '6px',
                    justifyContent: 'center'
                  }}>
                    <button
                      className="btn-icon"
                      onClick={() => handleEdit(row)}
                      title="Editar"
                      disabled={syncing}
                    >
                      ✎
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleDelete(row.id)}
                      title="Eliminar"
                      style={{ color: 'var(--red)' }}
                      disabled={syncing}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text3)',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {emptyMessage}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="card" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
            📄 Página {currentPage} de {totalPages} • {sortedData.length} registros
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Primera página"
            >
              ⏮
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              ← Anterior
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  className="btn"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: pageNum === currentPage ? 'var(--accent)' : 'var(--card2)',
                    color: pageNum === currentPage ? 'var(--bg)' : 'var(--text)',
                    border: `1px solid ${pageNum === currentPage ? 'var(--accent)' : 'var(--border)'}`,
                    fontWeight: pageNum === currentPage ? 700 : 400
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              Siguiente →
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Última página"
            >
              ⏭
            </button>
          </div>
        </div>
      )}

      {/* Modal de edición/creación */}
      {showForm && (
        <GenericForm
          columns={formColumns}
          initialData={formData}
          onSubmit={handleSave}
          onCancel={() => setShowForm(false)}
          title={editingId ? '✎ Editar registro' : '➕ Nuevo registro'}
          isLoading={syncing}
          submitLabel={syncing ? '⏳ Guardando...' : 'Guardar'}
          showBackdrop={true}
          layout={formLayout}
        />
      )}
    </div>
  );
} 
