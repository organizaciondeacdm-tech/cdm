import { useState, useEffect } from 'react';
import App from './acdm/acdm-system.jsx';
import { useMongoData } from './hooks/useMongoData.js';
import { restoreUserFromSession } from './utils/authSession.js';

/**
 * Wrapper que proporciona autenticación MongoDB a acdm-system.jsx
 */
export default function AppWithAuth() {
  const { login: mongoLogin, logout: mongoLogout } = useMongoData();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const user = await restoreUserFromSession();
        if (mounted) {
          setCurrentUser(user || null);
        }
      } finally {
        if (mounted) {
          setIsRestoringSession(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async (username, password) => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const user = await mongoLogin(username, password);
      setCurrentUser(user);
    } catch (err) {
      setLoginError(err.message);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    await mongoLogout();
  };

  if (isRestoringSession) {
    return (
      <div style={{
        background: '#0a0e1a',
        color: '#e8f4f8',
        fontFamily: "'Exo 2', sans-serif",
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Restaurando sesión...
      </div>
    );
  }

  if (currentUser) {
    return <App currentUser={currentUser} onLogout={handleLogout} />;
  }

  return (
    <div style={{
      background: '#0a0e1a',
      color: '#e8f4f8',
      fontFamily: "'Exo 2', sans-serif",
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <style>{`
        body { margin: 0; padding: 0; }
        .login-box {
          background: #111827;
          border: 1px solid #2a4a7f;
          border-radius: 12px;
          padding: 40px;
          width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        .login-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #00d4ff;
          text-align: center;
          margin: 0 0 4px 0;
        }
        .login-sub {
          font-size: 11px;
          color: #4a6fa5;
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          color: #8bacc8;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .form-input {
          width: 100%;
          background: #0f1626;
          border: 1px solid #1e3a5f;
          border-radius: 8px;
          padding: 9px 14px;
          color: #e8f4f8;
          font-family: 'Exo 2', sans-serif;
          font-size: 13px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .form-input:focus {
          outline: none;
          border-color: #00d4ff;
          box-shadow: 0 0 0 3px rgba(0,212,255,0.1);
        }
        .btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #0099cc, #00d4ff);
          color: #0a0e1a;
          padding: 10px 16px;
          border-radius: 8px;
          font-family: 'Exo 2', sans-serif;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,212,255,0.4);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error {
          background: rgba(255,71,87,0.1);
          border: 1px solid rgba(255,71,87,0.3);
          color: #ff4757;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          display: flex;
          gap: 8px;
        }
        .papiweb-logo {
          text-align: center;
          margin-bottom: 24px;
        }
        .papiweb-text {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(135deg, #c0d0e8 0%, #ffffff 30%, #8098b8 50%, #ffffff 70%, #4a6fa5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .papiweb-sub {
          color: #4a6fa5;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      `}</style>

      <div className="login-box">
        <div className="papiweb-logo">
          <div className="papiweb-text">PAPIWEB</div>
          <div className="papiweb-sub">Desarrollos Informáticos</div>
        </div>
        <h1 className="login-title">Sistema ACDM</h1>
        <h2 className="login-sub">Gestión de Asistentes Celadores/as</h2>

        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleLogin(formData.get('username'), formData.get('password'));
        }}>
          {loginError && (
            <div className="error">
              <span>⚠️</span>
              {loginError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input
              className="form-input"
              type="text"
              name="username"
              placeholder="admin"
              autoFocus
              disabled={isLoggingIn}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="••••••••"
              disabled={isLoggingIn}
            />
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Ingresando...' : 'Ingresar →'}
          </button>
        </form>

        <div style={{ fontSize: 11, color: '#4a6fa5', textAlign: 'center', marginTop: 16 }}>
          Demo: <span style={{ background: '#0f1626', padding: '1px 6px', borderRadius: 4 }}>admin</span> / <span style={{ background: '#0f1626', padding: '1px 6px', borderRadius: 4 }}>admin2025</span>
        </div>
      </div>
    </div>
  );
}
