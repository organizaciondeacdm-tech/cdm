import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { useAcdmContext } from '../context/AcdmContext.jsx';

// Fix default marker icons for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Buenos Aires CABA center
const CABA_CENTER = [-34.6137, -58.4173];
const CABA_ZOOM = 13;

// Custom school icon
function createSchoolIcon(isSelected) {
  return L.divIcon({
    className: 'acdm-leaflet-marker',
    html: `
      <div class="acdm-pin ${isSelected ? 'selected' : ''}">
        <span class="acdm-pin-emoji">🏫</span>
      </div>
      <div class="acdm-pin-shadow ${isSelected ? 'selected' : ''}"></div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -45],
  });
}

// Auto-fit bounds on first load — keeps zoom tight to CABA
function FitBounds({ positions }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length === 0 || fitted.current) return;
    fitted.current = true;
    setTimeout(() => {
      if (positions.length === 1) {
        map.setView(positions[0], 15, { animate: true });
      } else {
        const bounds = L.latLngBounds(positions);
        // Clamp bounds to CABA area to avoid zooming out too far
        const cabaBounds = L.latLngBounds([-34.71, -58.54], [-34.52, -58.33]);
        const effectiveBounds = bounds.isValid() && cabaBounds.contains(bounds)
          ? bounds
          : cabaBounds;
        map.fitBounds(effectiveBounds, { padding: [40, 40], maxZoom: 15, animate: true });
      }
    }, 500);
  }, [positions, map]);
  return null;
}

// Fly-to component (triggers on key change)
function FlyTo({ center, zoom, flyKey }) {
  const map = useMap();
  useEffect(() => {
    if (center && flyKey) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [flyKey, center, zoom, map]);
  return null;
}

export function MapaSection({ escuelas }) {
  const { search } = useAcdmContext();
  const [selectedEscuelas, setSelectedEscuelas] = useState([]);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [flyTarget, setFlyTarget] = useState(null);
  const mapRef = useRef(null);

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

  const positions = useMemo(() => {
    return escuelasMapeables.map(e => [e.ubicacion.coordinates[1], e.ubicacion.coordinates[0]]);
  }, [escuelasMapeables]);

  const toggleSelection = useCallback((esc) => {
    setSelectedEscuelas(prev => {
      const exists = prev.some(sel => sel.id === esc.id);
      if (exists) return prev.filter(sel => sel.id !== esc.id);
      return [...prev, esc];
    });
  }, []);

  const flyToCaba = useCallback(() => {
    setFlyTarget({ center: CABA_CENTER, zoom: CABA_ZOOM, ts: Date.now() });
  }, []);

  const fitAllMarkers = useCallback(() => {
    if (mapRef.current && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 1.0 });
    }
  }, [positions]);

  const flyToSchool = useCallback((esc) => {
    if (mapRef.current) {
      const [lng, lat] = esc.ubicacion.coordinates;
      mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
            Mapa Escolar
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Mostrando {escuelasMapeables.length} establecimiento(s) geolocalizado(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={flyToCaba} title="Centrar en CABA">
            📍 CABA
          </button>
          <button
            className={`btn ${is3D ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIs3D(!is3D)}
            title="Alternar perspectiva 3D"
          >
            {is3D ? '🏙️ 3D' : '🗺️ 2D'}
          </button>
          <button className="btn btn-secondary" onClick={fitAllMarkers} disabled={escuelasMapeables.length === 0} title="Ver todas las escuelas">
            🔍 Ver Todas
          </button>
          <button
            className={`btn ${showOnlySelected ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowOnlySelected(!showOnlySelected)}
            disabled={selectedEscuelas.length === 0}
          >
            {showOnlySelected ? 'Mostrar Todas' : 'Solo Seleccionadas'} ({selectedEscuelas.length})
          </button>
        </div>
      </div>

      {/* Map with 3D CSS perspective */}
      <div
        className="acdm-map-wrapper"
        style={{
          flex: 1,
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          perspective: is3D ? '1800px' : 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            transform: is3D ? 'rotateX(18deg) scale(1.05)' : 'rotateX(0deg) scale(1)',
            transformOrigin: 'center bottom',
            transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <MapContainer
            center={CABA_CENTER}
            zoom={CABA_ZOOM}
            zoomControl={false}
            style={{ height: '100%', width: '100%', minHeight: '78vh', background: '#0f172a' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={19}
            />
            <ZoomControl position="topleft" />
            <FitBounds positions={positions} />
            {flyTarget && (
              <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} flyKey={flyTarget.ts} />
            )}

            {escuelasMapeables.map((esc, idx) => {
              const [lng, lat] = esc.ubicacion.coordinates;
              const isSelected = selectedEscuelas.some(sel => sel.id === esc.id);
              return (
                <Marker
                  key={esc.id || idx}
                  position={[lat, lng]}
                  icon={createSchoolIcon(isSelected)}
                  eventHandlers={{ click: () => toggleSelection(esc) }}
                >
                  <Popup className="acdm-popup-container" maxWidth={280}>
                    <div className="acdm-popup-inner">
                      <div className="acdm-popup-title">{esc.de} - {esc.escuela}</div>
                      {esc.direccion && <div className="acdm-popup-row">📍 {esc.direccion}</div>}
                      {esc.telefono && <div className="acdm-popup-row">📞 {esc.telefono}</div>}
                      {esc.nivel && <div className="acdm-popup-row">📚 {esc.nivel}</div>}
                      <div className={`acdm-popup-status ${isSelected ? 'sel' : ''}`}>
                        {isSelected ? '✅ Seleccionada' : '📌 Click en el marcador para seleccionar'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* 3D depth gradient at bottom */}
        {is3D && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
            background: 'linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 5, borderRadius: '0 0 16px 16px',
          }} />
        )}

        {/* Selected Schools Panel */}
        {selectedEscuelas.length > 0 && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            backgroundColor: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(0,188,212,0.3)',
            borderRadius: 12, padding: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,188,212,0.1)',
            zIndex: 1000, maxWidth: 280,
            maxHeight: 'calc(100% - 24px)',
            overflowY: 'auto',
            backdropFilter: 'blur(12px)', color: '#fff',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#00bcd4', display: 'flex', alignItems: 'center', gap: 6 }}>
              🏫 Escuelas Seleccionadas ({selectedEscuelas.length})
            </div>
            {selectedEscuelas.map(esc => (
              <div key={esc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div
                  style={{ fontSize: 11, color: '#ccc', flex: 1, cursor: 'pointer' }}
                  onClick={() => flyToSchool(esc)}
                  title="Click para centrar"
                >
                  {esc.de} - {esc.escuela}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedEscuelas(prev => prev.filter(sel => sel.id !== esc.id)); }}
                  style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', marginLeft: 6 }}
                >✕</button>
              </div>
            ))}
            <button
              onClick={() => setSelectedEscuelas([])}
              style={{ width: '100%', marginTop: 10, fontSize: 11, padding: '6px 12px', background: 'rgba(0,188,212,0.15)', border: '1px solid rgba(0,188,212,0.3)', color: '#00bcd4', borderRadius: 6, cursor: 'pointer' }}
            >Limpiar Selección</button>
          </div>
        )}
      </div>

      <style>{`
        .acdm-leaflet-marker { background: none !important; border: none !important; }
        .acdm-pin {
          width: 36px; height: 36px;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border: 2.5px solid #00bcd4;
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5), 0 0 10px rgba(0,188,212,0.25);
          transition: all 0.3s ease;
        }
        .acdm-pin.selected {
          background: linear-gradient(135deg, #00bcd4, #00838f);
          border-color: #fff;
          box-shadow: 0 4px 20px rgba(0,188,212,0.6), 0 0 24px rgba(0,188,212,0.35);
          transform: rotate(-45deg) scale(1.2);
        }
        .acdm-pin:hover { transform: rotate(-45deg) scale(1.25); }
        .acdm-pin-emoji { transform: rotate(45deg); font-size: 16px; line-height: 1; }
        .acdm-pin-shadow {
          width: 20px; height: 8px;
          background: radial-gradient(ellipse, rgba(0,188,212,0.3), transparent 70%);
          border-radius: 50%; margin: 2px auto 0;
          animation: acdm-breathe 2.5s ease-in-out infinite;
        }
        .acdm-pin-shadow.selected {
          background: radial-gradient(ellipse, rgba(0,188,212,0.55), transparent 70%);
          width: 26px; animation: acdm-breathe-active 1.8s ease-in-out infinite;
        }
        @keyframes acdm-breathe { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.5);opacity:.3} }
        @keyframes acdm-breathe-active { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(2);opacity:.2} }

        .acdm-popup-container .leaflet-popup-content-wrapper {
          background: rgba(15,23,42,0.95) !important;
          border: 1px solid rgba(0,188,212,0.3) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(0,188,212,0.1) !important;
          color: #e2e8f0 !important; padding: 0 !important;
        }
        .acdm-popup-container .leaflet-popup-content { margin: 0 !important; }
        .acdm-popup-container .leaflet-popup-tip {
          background: rgba(15,23,42,0.95) !important;
          border: 1px solid rgba(0,188,212,0.3) !important;
        }
        .acdm-popup-container .leaflet-popup-close-button {
          color: #64748b !important; font-size: 18px !important; top: 6px !important; right: 8px !important;
        }
        .acdm-popup-container .leaflet-popup-close-button:hover { color: #00bcd4 !important; }
        .acdm-popup-inner { padding: 14px 16px; }
        .acdm-popup-title { font-size: 14px; font-weight: 700; color: #00bcd4; margin-bottom: 8px; padding-right: 16px; }
        .acdm-popup-row { font-size: 12px; color: #94a3b8; margin: 4px 0; }
        .acdm-popup-status { font-size: 11px; color: #64748b; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); }
        .acdm-popup-status.sel { color: #00bcd4; font-weight: 600; }

        .leaflet-control-zoom {
          border: 1px solid rgba(0,188,212,0.25) !important; border-radius: 10px !important;
          overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
        }
        .leaflet-control-zoom a {
          background-color: rgba(15,23,42,0.9) !important; color: #00bcd4 !important;
          border-bottom-color: rgba(0,188,212,0.15) !important;
          width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 18px !important;
        }
        .leaflet-control-zoom a:hover { background-color: rgba(0,188,212,0.2) !important; color: #fff !important; }
        .leaflet-control-attribution {
          background: rgba(15,23,42,0.75) !important; color: #475569 !important;
          font-size: 10px !important; padding: 3px 8px !important;
        }
        .leaflet-control-attribution a { color: #00bcd4 !important; }
        .leaflet-container { background: #0f172a !important; }
        .acdm-map-wrapper { box-shadow: 0 8px 40px rgba(0,0,0,0.3), 0 0 20px rgba(0,188,212,0.05); }
      `}</style>
    </div>
  );
}
