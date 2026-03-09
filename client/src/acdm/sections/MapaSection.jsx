import { useState, useMemo } from 'react';
import { useAcdmContext } from '../context/AcdmContext.jsx';

export function MapaSection({ escuelas }) {
  const { search } = useAcdmContext();
  const [selectedEscuelas, setSelectedEscuelas] = useState([]);
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const escuelasMapeables = useMemo(() => {
    return escuelas.filter(e => {
      const matchSearch = !search ||
        e.escuela.toLowerCase().includes(search.toLowerCase()) ||
        e.de.toLowerCase().includes(search.toLowerCase());

      const hasCoords = e.ubicacion?.coordinates && e.ubicacion.coordinates.length === 2;

      const isSelected = showOnlySelected ? selectedEscuelas.some(sel => sel.id === e.id) : true;

      return matchSearch && hasCoords && isSelected;
    });
  }, [escuelas, search, selectedEscuelas, showOnlySelected]);

  const mapBounds = useMemo(() => {
    if (escuelasMapeables.length === 0) return null;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

    // Si solo hay una escuela o están muy cerca, damos un margen fijo
    escuelasMapeables.forEach(e => {
      const [lng, lat] = e.ubicacion.coordinates;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    // Expand bounds slightly to prevent markers from hitting the edge
    const lngPadding = Math.max((maxLng - minLng) * 0.15, 0.05);
    const latPadding = Math.max((maxLat - minLat) * 0.15, 0.05);

    return {
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
    };
  }, [escuelasMapeables]);

  const getPosition = (lng, lat) => {
    if (!mapBounds) return { left: '50%', top: '50%' };
    const { minLng, maxLng, minLat, maxLat } = mapBounds;
    const xPct = ((lng - minLng) / (maxLng - minLng)) * 100;
    // Lat increases towards North, so Y is inverted in web (top is 0)
    const yPct = 100 - (((lat - minLat) / (maxLat - minLat)) * 100);
    return { left: `${xPct}%`, top: `${yPct}%` };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh' }}>
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Mapa Escolar</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Mostrando {escuelasMapeables.length} establecimiento(s) geolocalizado(s)</p>
        </div>
        <div className="flex gap-8">
          <button 
            className={`btn ${showOnlySelected ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setShowOnlySelected(!showOnlySelected)}
            disabled={selectedEscuelas.length === 0}
          >
            {showOnlySelected ? 'Mostrar Todas' : 'Mostrar Solo Seleccionadas'} ({selectedEscuelas.length})
          </button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden', borderRadius: 16, backgroundColor: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {/* Background Grid Pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(var(--text1) 1px, transparent 1px), linear-gradient(90deg, var(--text1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {mapBounds ? (
          escuelasMapeables.map(esc => {
            const [lng, lat] = esc.ubicacion.coordinates;
            const isSelected = selectedEscuelas.some(sel => sel.id === esc.id);
            const pos = getPosition(lng, lat);
            return (
              <div
                key={esc.id}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  transform: 'translate(-50%, -100%)',
                  cursor: 'pointer',
                  zIndex: isSelected ? 10 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  opacity: showOnlySelected || selectedEscuelas.length === 0 ? 1 : (isSelected ? 1 : 0.6)
                }}
                onClick={() => {
                  setSelectedEscuelas(prev => {
                    const exists = prev.some(sel => sel.id === esc.id);
                    if (exists) {
                      return prev.filter(sel => sel.id !== esc.id);
                    } else {
                      return [...prev, esc];
                    }
                  });
                }}
              >
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg1)',
                  color: isSelected ? '#000' : 'var(--text1)',
                  border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 8px 16px rgba(0,0,0,0.3)' : '0 4px 8px rgba(0,0,0,0.2)',
                  marginBottom: 8,
                  transform: isSelected ? 'scale(1.1) translateY(-4px)' : 'scale(1)'
                }}>
                  {esc.de} - {esc.escuela}
                </div>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  backgroundColor: isSelected ? 'var(--accent)' : 'var(--text1)',
                  border: '3px solid var(--bg1)',
                  boxShadow: '0 0 0 2px var(--bg1), 0 4px 8px rgba(0,0,0,0.3)'
                }} />
              </div>
            );
          })
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
            No hay establecimientos con coordenadas válidas para mostrar en el mapa.
          </div>
        )}

        {/* Selected Schools List */}
        {selectedEscuelas.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 24, right: 24,
            backgroundColor: 'var(--bg1)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 20,
            maxWidth: 300,
            maxHeight: 'calc(100% - 48px)',
            overflowY: 'auto',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>Escuelas Seleccionadas ({selectedEscuelas.length})</div>
            {selectedEscuelas.map(esc => (
              <div key={esc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{esc.de} - {esc.escuela}</div>
                <button 
                  className="btn-icon" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedEscuelas(prev => prev.filter(sel => sel.id !== esc.id)); 
                  }}
                  style={{ fontSize: 12, padding: '4px' }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button 
              className="btn btn-secondary" 
              onClick={() => setSelectedEscuelas([])} 
              style={{ width: '100%', marginTop: 12, fontSize: 12 }}
            >
              Limpiar Selección
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
