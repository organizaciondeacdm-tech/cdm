export function EstadisticasSection({ escuelas }) {
  const calculateStats = () => {
    let stats = {
      totalEscuelas: escuelas.length,
      totalAlumnos: 0,
      totalDocentes: 0,
      docentesEnLicencia: 0,
      projectosActivos: 0,
      informesEntregados: 0,
      visitasRegistradas: 0,
      alumnosPorNivel: {},
      docentesPorEstado: { Activo: 0, Licencia: 0 }
    };

    escuelas.forEach(esc => {
      // Alumnos
      stats.totalAlumnos += (esc.alumnos?.length || 0);
      stats.alumnosPorNivel[esc.nivel] = (stats.alumnosPorNivel[esc.nivel] || 0) + (esc.alumnos?.length || 0);

      // Docentes
      esc.docentes?.forEach(doc => {
        stats.totalDocentes++;
        if (doc.estado === 'Licencia') stats.docentesEnLicencia++;
        stats.docentesPorEstado[doc.estado] = (stats.docentesPorEstado[doc.estado] || 0) + 1;
      });

      // Proyectos
      stats.projectosActivos += (esc.proyectos?.filter(p => p.estado === 'En Progreso').length || 0);

      // Informes
      stats.informesEntregados += (esc.informes?.filter(i => i.estado === 'Entregado').length || 0);

      // Visitas
      stats.visitasRegistradas += (esc.visitas?.length || 0);
    });

    return stats;
  };

  const stats = calculateStats();

  const StatCard = ({ icon, label, value, subtext, color = 'var(--accent)' }) => (
    <div className="card" style={{
      padding: '16px',
      textAlign: 'center',
      borderTop: `3px solid ${color}`,
      minHeight: '120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{
        fontSize: '28px',
        marginBottom: '8px'
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: 700,
        color: color,
        fontFamily: 'Rajdhani',
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '12px',
        color: 'var(--text2)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: subtext ? '6px' : 0
      }}>
        {label}
      </div>
      {subtext && (
        <div style={{
          fontSize: '11px',
          color: 'var(--text3)',
          marginTop: '4px'
        }}>
          {subtext}
        </div>
      )}
    </div>
  );

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
        📈 Estadísticas del Sistema
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="🏫"
          label="Escuelas"
          value={stats.totalEscuelas}
          color="var(--accent)"
        />
        <StatCard
          icon="👨‍🎓"
          label="Alumnos"
          value={stats.totalAlumnos}
          subtext={Object.entries(stats.alumnosPorNivel).map(([nivel, count]) => `${nivel}: ${count}`).join(', ')}
          color="var(--green)"
        />
        <StatCard
          icon="👨‍🏫"
          label="Docentes"
          value={stats.totalDocentes}
          subtext={`${stats.docentesEnLicencia} en licencia`}
          color="var(--yellow)"
        />
        <StatCard
          icon="📦"
          label="Proyectos"
          value={stats.projectosActivos}
          subtext="En progreso"
          color="var(--blue)"
        />
        <StatCard
          icon="📋"
          label="Informes"
          value={stats.informesEntregados}
          subtext="Entregados"
          color="var(--green)"
        />
        <StatCard
          icon="👁️"
          label="Visitas"
          value={stats.visitasRegistradas}
          color="var(--cyan)"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Desglose por Estado</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '16px 0'
        }}>
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text2)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Docentes por Estado
            </h3>
            {Object.entries(stats.docentesPorEstado).map(([estado, count]) => (
              <div key={estado} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border2)',
                fontSize: '13px'
              }}>
                <span>{estado}</span>
                <strong style={{
                  color: estado === 'Activo' ? 'var(--green)' : 'var(--yellow)'
                }}>
                  {count}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
