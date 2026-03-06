export function ExportPanelSection({ setShowExport, setShowMailsExtractor }) {
  return (
    <div>
      <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>Exportar</h1>
      <div className="card-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Reporte de Datos</span></div>
          <p style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 13 }}>Genera reportes en formato texto, CSV o Excel con los datos del sistema.</p>
          <button className="btn btn-primary" onClick={() => setShowExport(true)}>📄 Generar Reporte</button>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Extraer Mails</span></div>
          <p style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 13 }}>Extrae todos los emails de las escuelas. Puedes copiarlos o descargarlos como archivo.</p>
          <button className="btn btn-primary" onClick={() => setShowMailsExtractor(true)}>✉️ Extraer Emails</button>
        </div>
      </div>
    </div>
  );
}
