import { useState, useEffect } from 'react';
import { useMongoData } from './hooks/useMongoData.js';
import PapiwebSpinner from './PapiwebSpinner.jsx';
import './ACDMSystemMongo.css';

/**
 * Componente principal de ACDM - Refactorizado para usar MongoDB
 * Reemplaza acdm-system.jsx con una versión que trae datos de la BD
 */

export default function ACDMSystem() {
  const {
    escuelas,
    loading,
    error,
    token,
    loadEscuelas,
    saveEscuela,
    deleteEscuela,
    loadAlumnos,
    saveAlumno,
    deleteAlumno,
    loadDocentes,
    saveDocente,
    deleteDocente,
    login,
    logout
  } = useMongoData();

  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Manejar login
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const user = await login(loginForm.username, loginForm.password);
      setCurrentUser(user);
      setLoginForm({ username: '', password: '' });
      setLoginError('');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Manejar logout
  const handleLogout = () => {
    setCurrentUser(null);
    logout();
  };

  // Cargar escuelas cuando hay token
  useEffect(() => {
    if (token) {
      loadEscuelas();
    }
  }, [token, loadEscuelas]);

  // Asegurarse de que se cargan escuelas cuando el usuario inicia sesión
  useEffect(() => {
    if (currentUser && token && escuelas.length === 0) {
      loadEscuelas();
    }
  }, [currentUser, token, escuelas.length, loadEscuelas]);

  // Pantalla de login
  if (!currentUser) {
    return (
      <div className="login-container" style={{ ...styles.loginContainer, background: 'transparent' }}>
        <div style={styles.loginBox}>
          <div style={styles.logoContainer}>
            <div style={styles.papiwebLogo}>
              <div style={styles.papiwebText}>PAPIWEB</div>
              <div style={styles.papiwebSub}>Desarrollos Informáticos</div>
            </div>
          </div>
          <h1 style={styles.loginTitle}>Sistema ACDM</h1>
          <h2 style={styles.loginSubtitle}>Gestión de Asistentes de Clase</h2>
          {isLoggingIn ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', minHeight: '260px' }}>
              <PapiwebSpinner />
            </div>
          ) : (
            <form onSubmit={handleLogin} style={styles.loginForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Usuario</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  style={styles.input}
                  autoFocus
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  style={styles.input}
                />
              </div>
              {loginError && <div style={styles.error}><span>⚠️</span> {loginError}</div>}
              <button type="submit" style={styles.button}>Ingresar →</button>
            </form>
          )}
          <div style={styles.hintText}>
            Demo: <span style={styles.hintKey}>admin</span> / <span style={styles.hintKey}>admin2025</span><br />
            Acceso rápido: <span style={styles.hintKey}>Ctrl+Alt+A</span>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>ACDM - Sistema de Gestión</h1>
        <div>
          <span>Bienvenido, {currentUser.username}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
        </div>
      </header>

      <nav style={styles.nav}>
        <button
          onClick={() => setActiveSection('dashboard')}
          style={{ ...styles.navBtn, ...(activeSection === 'dashboard' ? styles.navBtnActive : {}) }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveSection('escuelas')}
          style={{ ...styles.navBtn, ...(activeSection === 'escuelas' ? styles.navBtnActive : {}) }}
        >
          Escuelas
        </button>
        <button
          onClick={() => setActiveSection('alumnos')}
          style={{ ...styles.navBtn, ...(activeSection === 'alumnos' ? styles.navBtnActive : {}) }}
        >
          Alumnos
        </button>
        <button
          onClick={() => setActiveSection('docentes')}
          style={{ ...styles.navBtn, ...(activeSection === 'docentes' ? styles.navBtnActive : {}) }}
        >
          Docentes
        </button>
      </nav>

      <main style={styles.main}>
        {loading && <div style={{ ...styles.loading, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}><PapiwebSpinner /></div>}
        {error && <div style={styles.error}>Error: {error}</div>}

        {activeSection === 'dashboard' && (
          <div>
            <h2>Dashboard</h2>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{escuelas.length}</div>
                <div>Escuelas</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>
                  {escuelas.reduce((sum, e) => sum + (e.alumnos?.length || 0), 0)}
                </div>
                <div>Alumnos</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>
                  {escuelas.reduce((sum, e) => sum + (e.docentes?.length || 0), 0)}
                </div>
                <div>Docentes</div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'escuelas' && (
          <div>
            <h2>Escuelas</h2>
            <div style={styles.escuelasList}>
              {escuelas.map(escuela => (
                <div key={escuela._id} style={styles.card}>
                  <h3>{escuela.escuela}</h3>
                  <p>DE: {escuela.de}</p>
                  <p>Nivel: {escuela.nivel}</p>
                  <p>Dirección: {escuela.direccion}</p>
                  <p>Alumnos: {escuela.alumnos?.length || 0}</p>
                  <p>Docentes: {escuela.docentes?.length || 0}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'alumnos' && (
          <div>
            <h2>Alumnos</h2>
            <p>Funcionalidad en desarrollo...</p>
          </div>
        )}

        {activeSection === 'docentes' && (
          <div>
            <h2>Docentes</h2>
            <p>Funcionalidad en desarrollo...</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Estilos
const styles = {
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'transparent',
    color: '#e8f4f8',
    fontFamily: "'Exo 2', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    width: '100%'
  },
  loginBox: {
    backgroundColor: '#111827',
    padding: '40px',
    borderRadius: '12px',
    border: '1px solid #2a4a7f',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.1)',
    position: 'relative',
    zIndex: 10,
    animation: 'slideIn 0.5s ease'
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '28px'
  },
  papiwebLogo: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #1a2540, #0a0e1a)',
    border: '1px solid #2a4a7f',
    borderRadius: '6px',
    position: 'relative',
    overflow: 'hidden'
  },
  papiwebText: {
    background: 'linear-gradient(135deg, #c0d0e8 0%, #ffffff 30%, #8098b8 50%, #ffffff 70%, #4a6fa5 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.5))',
    fontSize: '22px',
    letterSpacing: '3px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  papiwebSub: {
    color: '#4a6fa5',
    fontSize: '9px',
    letterSpacing: '1px',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: '2px'
  },
  loginTitle: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#00d4ff',
    textAlign: 'center',
    marginBottom: '4px',
    marginTop: '0'
  },
  loginSubtitle: {
    fontSize: '11px',
    color: '#4a6fa5',
    textAlign: 'center',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '28px',
    marginTop: '0',
    fontWeight: 'normal'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0'
  },
  formLabel: {
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '1px',
    color: '#8bacc8',
    textTransform: 'uppercase',
    marginBottom: '6px',
    display: 'block'
  },
  input: {
    padding: '11px 14px',
    backgroundColor: 'rgba(15, 22, 38, 0.8)',
    border: '1px solid #1e3a5f',
    color: '#e8f4f8',
    borderRadius: '6px',
    fontFamily: 'inherit',
    fontSize: '13px',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  button: {
    padding: '11px 16px',
    backgroundColor: '#0099cc',
    background: 'linear-gradient(135deg, #0099cc, #00d4ff)',
    color: '#0a0e1a',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
    transition: 'all 0.2s ease',
    marginTop: '8px',
    width: '100%'
  },
  error: {
    color: '#ff4757',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderRadius: '6px',
    border: '1px solid rgba(255, 71, 87, 0.4)',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '0',
    animation: 'slideIn 0.3s ease'
  },
  hintText: {
    fontSize: '11px',
    color: '#4a6fa5',
    textAlign: 'center',
    marginTop: '20px',
    lineHeight: '1.6'
  },
  hintKey: {
    background: '#0f1626',
    border: '1px solid #1e3a5f',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#0099cc',
    display: 'inline-block',
    margin: '0 4px',
    whiteSpace: 'nowrap'
  },
  container: {
    backgroundColor: '#0a0e1a',
    color: '#e8f4f8',
    minHeight: '100vh',
    fontFamily: "'Exo 2', sans-serif"
  },
  header: {
    backgroundColor: '#111827',
    padding: '20px',
    borderBottom: '1px solid #1e3a5f',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  nav: {
    backgroundColor: '#0f1626',
    padding: '0',
    borderBottom: '1px solid #1e3a5f',
    display: 'flex',
    gap: '0'
  },
  navBtn: {
    backgroundColor: 'transparent',
    color: '#8bacc8',
    border: 'none',
    padding: '15px 20px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderBottom: '2px solid transparent'
  },
  navBtnActive: {
    color: '#00d4ff',
    borderBottom: '2px solid #00d4ff'
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#ff4757',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '10px',
    fontFamily: 'inherit'
  },
  main: {
    padding: '20px'
  },
  loading: {
    color: '#00d4ff',
    padding: '20px',
    textAlign: 'center'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  statCard: {
    backgroundColor: '#111827',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #1e3a5f',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#00d4ff',
    marginBottom: '10px'
  },
  escuelasList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  card: {
    backgroundColor: '#111827',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #1e3a5f'
  }
};
