export function AlertasSection({ escuelas }) {
  // Generar alertas automáticas basadas en licencias, proyectos atrasados, etc.
  const generateAlerts = () => {
    const alerts = [];

    escuelas.forEach(esc => {
      // Alertas de docentes en licencia
      esc.docentes?.forEach(doc => {
        if (doc.estado === 'Licencia') {
          alerts.push({
            id: `alert-${esc.id}-${doc.id}`,
            type: 'warning',
            title: 'Docente en Licencia',
            message: `${doc.nombreApellido} está en licencia (${doc.motivo})`,
            escuela: esc.escuela,
            date: new Date(),
            severity: 'media'
          });
        }
      });

      // Alertas de proyectos atrasados
      esc.proyectos?.forEach(proy => {
        if (proy.estado === 'En Progreso' && proy.fechaBaja) {
          const deadline = new Date(proy.fechaBaja);
          const today = new Date();
          if (today > deadline) {
            alerts.push({
              id: `alert-${esc.id}-${proy.id}`,
              type: 'danger',
              title: 'Proyecto Atrasado',
              message: `${proy.nombre} superó la fecha de cierre`,
              escuela: esc.escuela,
              date: new Date(),
              severity: 'alta'
            });
          }
        }
      });

      // Alertas de informes pendientes
      esc.informes?.forEach(inf => {
        if (inf.estado === 'Pendiente') {
          alerts.push({
            id: `alert-${esc.id}-${inf.id}`,
            type: 'warning',
            title: 'Informe Pendiente',
            message: `${inf.titulo} aún no ha sido entregado`,
            escuela: esc.escuela,
            date: new Date(),
            severity: 'media'
          });
        }
      });
    });

    return alerts.sort((a, b) => b.date - a.date);
  };

  const alerts = generateAlerts();

  const severityColors = {
    alta: 'var(--red)',
    media: 'var(--yellow)',
    baja: 'var(--green)'
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🔔 Alertas del Sistema</span>
      </div>

      {alerts.length > 0 ? (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="alert"
              style={{
                borderLeft: `4px solid ${severityColors[alert.severity]}`,
                marginBottom: '8px',
                padding: '12px',
                background: alert.type === 'danger' ? 'rgba(255,71,87,0.1)' : 'rgba(255,193,7,0.1)',
                borderRadius: '6px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '6px'
              }}>
                <strong style={{ color: severityColors[alert.severity] }}>
                  {alert.title}
                </strong>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text3)',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p style={{
                margin: '6px 0',
                fontSize: '13px',
                color: 'var(--text2)'
              }}>
                {alert.message}
              </p>
              <span style={{
                fontSize: '11px',
                color: 'var(--text3)'
              }}>
                {alert.escuela}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text3)',
          fontSize: '14px'
        }}>
          ✓ Sin alertas activas
        </div>
      )}
    </div>
  );
}
