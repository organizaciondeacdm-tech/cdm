import { useState, useEffect, useRef } from 'react';
import { useAcdmData } from './hooks/useAcdmData';
import { GenericTable } from './components/GenericTable';
import { EscuelasSection } from './sections/EscuelasSection';
import { VisitasSection } from './sections/VisitasSection';
import { ProyectosSection } from './sections/ProyectosSection';
import { InformesSection } from './sections/InformesSection';
import { AlertasSection } from './sections/AlertasSection';
import { EstadisticasSection } from './sections/EstadisticasSection';
import { ExportarSection } from './sections/ExportarSection';
import '../acdm/styles/acdm.css';

// Datos iniciales
const INITIAL_DATA = {
  escuelas: [
    {
      id: "e1",
      de: "DE 01",
      escuela: "Escuela N°1 Julio Argentino Roca",
      nivel: "Primario",
      direccion: "Av. Corrientes 1234, CABA",
      mail: "escuela1@bue.edu.ar",
      telefonos: ["011-4321-1234"],
      alumnos: [
        { id: "a1", gradoSalaAnio: "3° Grado", nombre: "Martínez, Lucía", diagnostico: "TEA Nivel 1" },
        { id: "a2", gradoSalaAnio: "3° Grado", nombre: "García, Tomás", diagnostico: "TDAH" }
      ],
      docentes: [
        {
          id: "d1",
          cargo: "Titular",
          nombreApellido: "López, María Elena",
          estado: "Licencia",
          motivo: "Art. 102 - Enfermedad"
        },
        {
          id: "d2",
          cargo: "Titular",
          nombreApellido: "Rodríguez, Carlos",
          estado: "Activo",
          motivo: "-"
        }
      ],
      visitas: [
        { id: "v1", fecha: "2025-02-15", observaciones: "Primera visita de seguimiento", visitante: "Inspector DE 01" }
      ],
      proyectos: [
        { id: "p1", nombre: "Adaptación de material didáctico", estado: "Completado", descripcion: "Material visual para TEA", fechaInicio: "2025-01-20", fechaBaja: "2025-02-28" }
      ],
      informes: [
        { id: "i1", titulo: "Informe mensual enero", estado: "Entregado", fechaEntrega: "2025-01-31", observaciones: "Detallado" }
      ]
    },
    {
      id: "e2",
      de: "DE 02",
      escuela: "Jardín de Infantes N°5 María Montessori",
      nivel: "Inicial",
      direccion: "Av. Santa Fe 567, CABA",
      mail: "jardin5@bue.edu.ar",
      telefonos: ["011-4765-5678"],
      alumnos: [
        { id: "a3", gradoSalaAnio: "Sala Roja", nombre: "Pérez, Santiago", diagnostico: "Síndrome de Down" }
      ],
      docentes: [
        {
          id: "d3",
          cargo: "Titular",
          nombreApellido: "Gómez, Patricia",
          estado: "Activo",
          motivo: "-"
        }
      ],
      visitas: [],
      proyectos: [],
      informes: []
    }
  ]
};

export default function ACDMSystem() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedEscuela, setSelectedEscuela] = useState(null);
  const mainContentRef = useRef(null);
  
  const {
    data,
    addEscuela,
    updateEscuela,
    deleteEscuela,
    addVisita,
    updateVisita,
    deleteVisita,
    addProyecto,
    updateProyecto,
    deleteProyecto,
    addInforme,
    updateInforme,
    deleteInforme
  } = useAcdmData(INITIAL_DATA);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'var(--accent)' },
    { id: 'escuelas', label: 'Escuelas', icon: '🏫', color: 'var(--accent)' },
    { id: 'visitas', label: 'Visitas', icon: '👁️', color: 'var(--cyan)' },
    { id: 'proyectos', label: 'Proyectos', icon: '📦', color: 'var(--green)' },
    { id: 'informes', label: 'Informes', icon: '📋', color: 'var(--blue)' },
    { id: 'alertas', label: 'Alertas', icon: '🔔', color: 'var(--yellow)' },
    { id: 'estadisticas', label: 'Estadísticas', icon: '📈', color: 'var(--red)' },
    { id: 'calendario', label: 'Calendario', icon: '📅', color: 'var(--purple)' },
    { id: 'exportar', label: 'Exportar', icon: '📄', color: 'var(--green)' }
  ];

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [currentPage]);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div>
            <div className="flex items-center justify-between mb-24">
              <div>
                <h1 style={{
                  fontFamily: 'Rajdhani',
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  letterSpacing: 2
                }}>
                  Dashboard
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>
                  Vista general del sistema - {new Date().toLocaleDateString('es-AR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <DashboardContent escuelas={data.escuelas} />
          </div>
        );
      
      case 'escuelas':
        return (
          <EscuelasSection
            escuelas={data.escuelas}
            onAddEscuela={addEscuela}
            onUpdateEscuela={updateEscuela}
            onDeleteEscuela={deleteEscuela}
            onSelectEscuela={setSelectedEscuela}
          />
        );
      
      case 'visitas':
        return selectedEscuela ? (
          <VisitasSection
            escuela={selectedEscuela}
            onAddVisita={addVisita}
            onUpdateVisita={updateVisita}
            onDeleteVisita={deleteVisita}
          />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ color: 'var(--text3)' }}>Selecciona una escuela para ver visitas</p>
          </div>
        );
      
      case 'proyectos':
        return selectedEscuela ? (
          <ProyectosSection
            escuela={selectedEscuela}
            onAddProyecto={addProyecto}
            onUpdateProyecto={updateProyecto}
            onDeleteProyecto={deleteProyecto}
          />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ color: 'var(--text3)' }}>Selecciona una escuela para ver proyectos</p>
          </div>
        );
      
      case 'informes':
        return selectedEscuela ? (
          <InformesSection
            escuela={selectedEscuela}
            onAddInforme={addInforme}
            onUpdateInforme={updateInforme}
            onDeleteInforme={deleteInforme}
          />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ color: 'var(--text3)' }}>Selecciona una escuela para ver informes</p>
          </div>
        );
      
      case 'alertas':
        return <AlertasSection escuelas={data.escuelas} />;
      
      case 'estadisticas':
        return <EstadisticasSection escuelas={data.escuelas} />;
      
      case 'exportar':
        return <ExportarSection escuelas={data.escuelas} data={data} />;
      
      default:
        return <DashboardContent escuelas={data.escuelas} />;
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      minHeight: '100vh',
      background: 'var(--bg)'
    }}>
      {/* Sidebar */}
      <aside style={{
        background: 'linear-gradient(180deg, #0a1218 0%, #0d1620 100%)',
        borderRight: '1px solid rgba(0,212,255,0.2)',
        overflow: 'auto',
        padding: '20px 0'
      }}>
        <div style={{ padding: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
          <h2 style={{
            color: 'var(--accent)',
            fontSize: '16px',
            fontWeight: 700,
            margin: 0,
            fontFamily: 'Rajdhani',
            letterSpacing: '1px'
          }}>
            🏫 SISTEMA ACDM
          </h2>
          <p style={{
            color: 'var(--text3)',
            fontSize: '11px',
            margin: '4px 0 0 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Gestión de Asistentes
          </p>
        </div>

        <nav style={{ paddingBottom: '20px' }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                background: currentPage === item.id ? 'rgba(0,212,255,0.15)' : 'transparent',
                border: 'none',
                borderLeft: currentPage === item.id ? '3px solid var(--accent)' : '3px solid transparent',
                color: currentPage === item.id ? 'var(--accent)' : 'var(--text2)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: currentPage === item.id ? 600 : 400,
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => !currentPage === item.id && (e.target.style.background = 'rgba(0,212,255,0.05)')}
              onMouseLeave={(e) => !currentPage === item.id && (e.target.style.background = 'transparent')}
            >
              <span style={{ marginRight: '8px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        ref={mainContentRef}
        style={{
        padding: '24px',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #0a1218 0%, #0d1620 50%, #0a1620 100%)'
      }}
      >
        {renderContent()}
      </main>
    </div>
  );
}

// Componente Dashboard
function DashboardContent({ escuelas }) {
  const totalEscuelas = escuelas.length;
  const totalAlumnos = escuelas.reduce((acc, esc) => acc + (esc.alumnos?.length || 0), 0);
  const totalDocentes = escuelas.reduce((acc, esc) => acc + (esc.docentes?.length || 0), 0);
  const docentesLicencia = escuelas.reduce((acc, esc) => acc + (esc.docentes?.filter((d) => d.estado === 'Licencia').length || 0), 0);
  const docentesActivos = totalDocentes - docentesLicencia;
  const sinAcdm = escuelas.filter((esc) => (esc.docentes?.length || 0) === 0).length;
  const totalSuplentes = escuelas.reduce(
    (acc, esc) => acc + (esc.docentes?.reduce((sum, doc) => sum + (doc.suplentes?.length || 0), 0) || 0),
    0
  );

  const porNivel = {};
  escuelas.forEach((esc) => {
    porNivel[esc.nivel] = (porNivel[esc.nivel] || 0) + 1;
  });

  const porDE = {};
  escuelas.forEach((esc) => {
    porDE[esc.de] = (porDE[esc.de] || 0) + 1;
  });

  const maxNivel = Math.max(1, ...Object.values(porNivel));
  const maxDE = Math.max(1, ...Object.values(porDE));
  const chartColors = ['#00d4ff', '#00ff88', '#ffd700', '#ff6b35', '#ff4757'];

  const summary = [
    { val: totalEscuelas, label: 'Escuelas', icon: '🏫', color: 'linear-gradient(90deg, #00d4ff, #0099cc)' },
    { val: totalAlumnos, label: 'Alumnos', icon: '👨‍🎓', color: 'linear-gradient(90deg, #00ff88, #00cc66)' },
    { val: docentesActivos, label: 'ACDM Activos', icon: '✅', color: 'linear-gradient(90deg, #00ff88, #00cc66)' },
    { val: docentesLicencia, label: 'En Licencia', icon: '🔴', color: 'linear-gradient(90deg, #ff4757, #cc2233)' },
    { val: totalSuplentes, label: 'Suplentes', icon: '↔', color: 'linear-gradient(90deg, #ffa502, #cc8800)' },
    { val: sinAcdm, label: 'Sin ACDM', icon: '⚠️', color: 'linear-gradient(90deg, #ff6b35, #cc4400)' }
  ];

  return (
    <div>
      <div className="stats-grid mb-24">
        {summary.map((item, index) => (
          <div key={index} className="stat-card" style={{ '--gradient': item.color }}>
            <div className="stat-icon">{item.icon}</div>
            <div className="stat-value">{item.val}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Distribución por Nivel</span>
          </div>
          <div className="chart-bar-wrap">
            {Object.entries(porNivel).map(([nivel, count], index) => (
              <div className="chart-bar-row" key={nivel}>
                <div className="chart-bar-label">{nivel}</div>
                <div className="chart-bar-bg">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(count / maxNivel) * 100}%`,
                      background: chartColors[index % chartColors.length]
                    }}
                  >
                    {count}
                  </div>
                </div>
                <div className="chart-val">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Estado ACDM</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, padding: '20px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent3)' }}>{docentesActivos}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>Activos</div>
            </div>
            <div style={{ fontSize: 32, color: 'var(--border2)' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--red)' }}>{docentesLicencia}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>En Licencia</div>
            </div>
          </div>
          {totalDocentes > 0 && (
            <div style={{ background: 'var(--bg2)', borderRadius: 10, height: 16, overflow: 'hidden', marginTop: 8 }}>
              <div
                style={{
                  height: '100%',
                  width: `${(docentesActivos / totalDocentes) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent3), var(--accent))',
                  borderRadius: 10,
                  transition: 'width 1s ease'
                }}
              />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Por Distrito Escolar</span>
          </div>
          <div className="chart-bar-wrap">
            {Object.entries(porDE).map(([de, count], index) => (
              <div className="chart-bar-row" key={de}>
                <div className="chart-bar-label">{de}</div>
                <div className="chart-bar-bg">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(count / maxDE) * 100}%`,
                      background: chartColors[index % chartColors.length]
                    }}
                  >
                    {count}
                  </div>
                </div>
                <div className="chart-val">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
