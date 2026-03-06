import { AlertPanel, DaysRemaining } from '../components/system/index.js';
import { formatDate } from '../utils/dateUtils.js';

export function AlertasSection({ escuelas }) {
  const licenciasActivas = escuelas.flatMap(e => e.docentes.filter(d => d.estado === 'Licencia'));

  return (
    <div>
      <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 8 }}>Centro de Alertas</h1>
      <AlertPanel escuelas={escuelas} />

      <div className="card mt-16">
        <div className="card-header"><span className="card-title">📋 Resumen de Licencias Activas</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Escuela</th><th>Docente</th><th>Motivo</th><th>Inicio</th><th>Fin</th><th>Días Rest.</th><th>Suplente</th></tr></thead>
            <tbody>
              {escuelas.flatMap(esc => esc.docentes.filter(d => d.estado === 'Licencia').map(d => (
                <tr key={`${esc.id}-${d.id}`}>
                  <td style={{ maxWidth: 180, fontSize: 12 }}>{esc.escuela}</td>
                  <td style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{d.nombreApellido}</td>
                  <td style={{ fontSize: 12 }}>{d.motivo}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(d.fechaInicioLicencia)}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(d.fechaFinLicencia)}</td>
                  <td><DaysRemaining fechaFin={d.fechaFinLicencia} /></td>
                  <td style={{ fontSize: 12 }}>{d.suplentes.length > 0 ? d.suplentes.map(s => s.nombreApellido).join(', ') : <span className="badge badge-danger">SIN SUPLENTE</span>}</td>
                </tr>
              )))}
            </tbody>
          </table>
          {licenciasActivas.length === 0 && <div className="no-data">No hay licencias activas</div>}
        </div>
      </div>
    </div>
  );
}
