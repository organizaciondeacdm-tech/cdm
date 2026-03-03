import { useState, useEffect } from 'react';
import { useMongoData } from '../hooks/useMongoData';

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

  // Manejar login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await login(loginForm.username, loginForm.password);
      setCurrentUser(user);
      setLoginForm({ username: '', password: '' });
      setLoginError('');
    } catch (err) {
      setLoginError(err.message);
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
  }, [token]);

  // Pantalla de login
  if (!currentUser) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1>SISTEMA ACDM</h1>
          <h2>Gestión de Asistentes de Clase</h2>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="text"
              placeholder="Usuario"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              style={styles.input}
            />
            {loginError && <div style={styles.error}>{loginError}</div>}
            <button type="submit" style={styles.button}>Ingresar</button>
          </form>
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
          style={{...styles.navBtn, ...(activeSection === 'dashboard' ? styles.navBtnActive : {})}}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveSection('escuelas')}
          style={{...styles.navBtn, ...(activeSection === 'escuelas' ? styles.navBtnActive : {})}}
        >
          Escuelas
        </button>
        <button 
          onClick={() => setActiveSection('alumnos')}
          style={{...styles.navBtn, ...(activeSection === 'alumnos' ? styles.navBtnActive : {})}}
        >
          Alumnos
        </button>
        <button 
          onClick={() => setActiveSection('docentes')}
          style={{...styles.navBtn, ...(activeSection === 'docentes' ? styles.navBtnActive : {})}}
        >
          Docentes
        </button>
      </nav>

      <main style={styles.main}>
        {loading && <div style={styles.loading}>Cargando datos...</div>}
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
    height: '100vh',
    backgroundColor: '#0a0e1a',
    color: '#e8f4f8',
    fontFamily: 'Exo 2, sans-serif'
  },
  loginBox: {
    backgroundColor: '#111827',
    padding: '40px',
    borderRadius: '8px',
    border: '1px solid #1e3a5f',
    width: '100%',
    maxWidth: '400px'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px'
  },
  input: {
    padding: '10px',
    backgroundColor: '#0f1626',
    border: '1px solid #1e3a5f',
    color: '#e8f4f8',
    borderRadius: '4px',
    fontFamily: 'inherit'
  },
  button: {
    padding: '10px',
    backgroundColor: '#00d4ff',
    color: '#0a0e1a',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  error: {
    color: '#ff4757',
    padding: '10px',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: '4px'
  },
  container: {
    backgroundColor: '#0a0e1a',
    color: '#e8f4f8',
    minHeight: '100vh',
    fontFamily: 'Exo 2, sans-serif'
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
