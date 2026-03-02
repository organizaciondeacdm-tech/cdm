import { useState } from 'react';

export function ExportarSection({ escuelas, data }) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState('json');

  const exportJSON = () => {
    setExporting(true);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acdm-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    setExporting(false);
  };

  const exportCSV = () => {
    setExporting(true);
    let csv = 'Escuela,Alumnos,Docentes,Proyectos,Informes,Visitas\n';
    
    escuelas.forEach(esc => {
      const row = [
        esc.escuela,
        esc.alumnos?.length || 0,
        esc.docentes?.length || 0,
        esc.proyectos?.length || 0,
        esc.informes?.length || 0,
        esc.visitas?.length || 0
      ].join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acdm-estadisticas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setExporting(false);
  };

  const exportHTML = () => {
    setExporting(true);
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ACDM - Reporte del Sistema</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f3efe4; }
          h1 { color: #2f7f70; }
          table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #2f7f70; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-value { font-size: 32px; font-weight: bold; color: #2f7f70; }
          .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>ACDM - Reporte del Sistema</h1>
        <p>Generado: ${new Date().toLocaleString()}</p>
        
        <h2>Resumen General</h2>
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${escuelas.length}</div>
            <div class="stat-label">Escuelas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${escuelas.reduce((sum, e) => sum + (e.alumnos?.length || 0), 0)}</div>
            <div class="stat-label">Alumnos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${escuelas.reduce((sum, e) => sum + (e.docentes?.length || 0), 0)}</div>
            <div class="stat-label">Docentes</div>
          </div>
        </div>

        <h2>Escuelas Registradas</h2>
        <table>
          <thead>
            <tr>
              <th>Escuela</th>
              <th>Nivel</th>
              <th>Alumnos</th>
              <th>Docentes</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            ${escuelas.map(esc => `
              <tr>
                <td>${esc.escuela}</td>
                <td>${esc.nivel}</td>
                <td>${esc.alumnos?.length || 0}</td>
                <td>${esc.docentes?.length || 0}</td>
                <td>${esc.mail}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acdm-reporte-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    setExporting(false);
  };

  return (
    <div>
      <h1 style={{
        fontFamily: 'Rajdhani',
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--accent)',
        letterSpacing: 2,
        marginBottom: 24
      }}>
        📄 Exportar Datos
      </h1>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Opciones de Exportación</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '16px 0'
        }}>
          <button
            className="btn btn-primary"
            onClick={exportJSON}
            disabled={exporting}
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            {exporting ? '⏳ Exportando...' : '📥 Descargar JSON'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={exportCSV}
            disabled={exporting}
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            {exporting ? '⏳ Exportando...' : '📊 Descargar CSV'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={exportHTML}
            disabled={exporting}
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            {exporting ? '⏳ Exportando...' : '📄 Descargar HTML'}
          </button>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(0,212,255,0.05)',
          borderRadius: '6px',
          borderLeft: '4px solid var(--accent)'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text2)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Información de Exportación
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '13px',
            color: 'var(--text2)',
            lineHeight: '1.6'
          }}>
            <li><strong>JSON:</strong> Backup completo de todos los datos (para restauración)</li>
            <li><strong>CSV:</strong> Tabla con estadísticas resumen (para hojas de cálculo)</li>
            <li><strong>HTML:</strong> Reporte visual formateado (para impresión o visualización)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
