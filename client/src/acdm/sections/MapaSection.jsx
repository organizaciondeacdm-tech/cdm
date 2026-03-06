import { useState } from 'react';

export function MapaSection({ escuelas }) {
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterDE, setFilterDE] = useState('');
  const [selected, setSelected] = useState(null);

  const niveles = [...new Set((escuelas || []).map(e => e.nivel).filter(Boolean))].sort();
  const des = [...new Set((escuelas || []).map(e => e.de).filter(Boolean))].sort();

  const term = search.toLowerCase().trim();
  const filtered = (escuelas || []).filter(esc => {
    if (filterNivel && esc.nivel !== filterNivel) return false;
    if (filterDE && esc.de !== filterDE) return false;
    if (term && !(
      String(esc.escuela || '').toLowerCase().includes(term) ||
      String(esc.de || '').toLowerCase().includes(term) ||
      String(esc.direccion || '').toLowerCase().includes(term)
    )) return false;
    return true;
  });

  const withCoords = filtered.filter(e => e.lat && e.lng && e.lat !== 0 && e.lng !== 0);
  const withoutCoords = filtered.filter(e => !e.lat || !e.lng || e.lat === 0 || e.lng === 0);

  const NIVEL_COLORS = {
    'Inicial': '#00d4ff',
    'Primario': '#a259ff',
    'Secundario': '#f6c90e',
    'Especial': '#ff6b6b',
    'Técnica': '#4ecdc4',
    'Adultos': '#ff9f43',
  };

  const getNivelColor = (nivel) => NIVEL_COLORS[nivel] || 'var(--accent)';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
            🗺️ Mapa de Escuelas
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Ubicación geográfica de escuelas del sistema
          </p>
          <div className="flex gap-8 items-center" style={{ marginTop: 8 }}>
            <span className="badge badge-info" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent)' }}>
              {withCoords.length} con coordenadas
            </span>
            <span className="badge" style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
              {withoutCoords.length} sin coordenadas
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-16" style={{ padding: 12 }}>
        <div className="flex gap-8 items-center flex-wrap">
          <input
            className="form-input"
            placeholder="Buscar escuela, DE o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select
            className="form-input"
            value={filterNivel}
            onChange={e => setFilterNivel(e.target.value)}
            style={{ minWidth: 130 }}
          >
            <option value="">Todos los niveles</option>
            {niveles.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            className="form-input"
            value={filterDE}
            onChange={e => setFilterDE(e.target.value)}
            style={{ minWidth: 100 }}
          >
            <option value="">Todos los DE</option>
            {des.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(search || filterNivel || filterDE) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setFilterNivel(''); setFilterDE(''); }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Map placeholder + list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

        {/* Map area */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 500, position: 'relative' }}>
          {/* Simulated map with OpenStreetMap embed */}
          {withCoords.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: 500 }}>
              <iframe
                title="Mapa de escuelas"
                style={{ width: '100%', height: '100%', border: 'none' }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=-58.55,-34.70,-58.30,-34.50&layer=mapnik&marker=${withCoords[0]?.lat},${withCoords[0]?.lng}`}
                allowFullScreen
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(20,20,36,0.85)', backdropFilter: 'blur(4px)',
                padding: '8px 12px', fontSize: 12, color: 'var(--text2)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span>🗺️</span>
                <span>Vista general de CABA — seleccioná una escuela en la lista para ver su ubicación exacta</span>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: 500, gap: 16, color: 'var(--text2)'
            }}>
              <div style={{ fontSize: 64 }}>🗺️</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text1)' }}>No hay escuelas con coordenadas</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
                Editá las escuelas y completá los campos de latitud y longitud para visualizarlas en el mapa.
              </div>
            </div>
          )}
        </div>

        {/* Sidebar list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div className="card no-data" style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>
              No se encontraron escuelas
            </div>
          )}

          {withCoords.map(esc => (
            <div
              key={esc.id}
              className="card"
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                border: selected?.id === esc.id
                  ? '1px solid var(--accent)'
                  : '1px solid rgba(255,255,255,0.06)',
                background: selected?.id === esc.id
                  ? 'rgba(0,212,255,0.07)'
                  : undefined,
                transition: 'all 0.15s'
              }}
              onClick={() => setSelected(selected?.id === esc.id ? null : esc)}
            >
              <div className="flex items-center gap-8">
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: getNivelColor(esc.nivel),
                  flexShrink: 0, boxShadow: `0 0 6px ${getNivelColor(esc.nivel)}`
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {esc.escuela}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                    {esc.de} · {esc.nivel}
                  </div>
                  {selected?.id === esc.id && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text2)' }}>
                      <div>📍 {esc.direccion}</div>
                      <div style={{ marginTop: 2, fontFamily: 'monospace', color: 'var(--accent)' }}>
                        {Number(esc.lat).toFixed(5)}, {Number(esc.lng).toFixed(5)}
                      </div>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(0,212,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                  📍
                </span>
              </div>
            </div>
          ))}

          {withoutCoords.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text2)', padding: '4px 2px', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                Sin coordenadas ({withoutCoords.length})
              </div>
              {withoutCoords.map(esc => (
                <div
                  key={esc.id}
                  className="card"
                  style={{ padding: '8px 12px', opacity: 0.6, cursor: 'default' }}
                >
                  <div className="flex items-center gap-8">
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {esc.escuela}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                        {esc.de} · {esc.nivel}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text2)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                      sin coord.
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="card mt-16" style={{ padding: '10px 16px' }}>
        <div className="flex gap-16 items-center flex-wrap" style={{ fontSize: 12 }}>
          <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Referencias:</span>
          {Object.entries(NIVEL_COLORS).map(([nivel, color]) => (
            <span key={nivel} className="flex items-center gap-4">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ color: 'var(--text2)' }}>{nivel}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
