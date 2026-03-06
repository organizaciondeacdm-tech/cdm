import { useState, useEffect } from 'react';
import App from './acdm/acdm-system.jsx';
import { loginWithSession, logoutSession, performTrafficHandshake, restoreUserFromSession } from './utils/authSession.js';
import PapiwebSpinner from './PapiwebSpinner.jsx';
import NotificationToast from './acdm/components/system/NotificationToast.jsx';
import { GenericFormModal } from './acdm/components/system/forms/index.js';
import { useNotifications } from './hooks/useNotifications.js';
import { useAcdmEvent, ACDM_EVENTS } from './hooks/useAcdmEvents.js';

const LOGIN_SCHEMA = [
  { name: 'username', label: 'Usuario',     type: 'text',     required: true, placeholder: 'admin' },
  { name: 'password', label: 'Contraseña',  type: 'password', required: true, placeholder: '••••••••' },
];

/**
 * Wrapper que proporciona autenticación MongoDB a acdm-system.jsx
 */
export default function AppWithAuth() {
  const LOGIN_LOG_PREFIX = '[ACDM][LOGIN][APP]';
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [trafficLock, setTrafficLock] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // ── Notificaciones globales ─────────────────────────────────────────
  const { notifications, notify, dismiss } = useNotifications();

  // Escuchar errores y mutaciones de datos para surfacearlos globalmente
  useAcdmEvent(ACDM_EVENTS.ERROR, (detail) => {
    notify({ type: 'error', message: detail?.message || 'Error en la operación' });
  });

  useAcdmEvent(ACDM_EVENTS.MUTATION, (detail) => {
    if (detail?.message) {
      notify({ type: 'success', message: detail.message });
    }
  });

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

  useEffect(() => {
    const onTrafficLock = (event) => {
      setTrafficLock(event?.detail || null);
      setUnlockError('');
    };
    window.addEventListener('acdm:traffic-lock', onTrafficLock);
    return () => window.removeEventListener('acdm:traffic-lock', onTrafficLock);
  }, []);

  const handleLogin = async (username, password) => {
    const normalizedUsername = String(username || '').trim();
    const normalizedPassword = String(password || '');
    console.log(`${LOGIN_LOG_PREFIX} handleLogin called`, {
      username: normalizedUsername,
      hasPassword: Boolean(normalizedPassword)
    });

    setIsLoggingIn(true);
    setLoginError('');
    try {
      const session = await loginWithSession(normalizedUsername, normalizedPassword);
      setCurrentUser(session.user);
      console.log(`${LOGIN_LOG_PREFIX} login success`, {
        username: session?.user?.username || normalizedUsername
      });
    } catch (err) {
      setLoginError(err.message);
      console.error(`${LOGIN_LOG_PREFIX} login failed`, {
        message: err?.message || 'error desconocido',
        status: err?.status
      });
    } finally {
      console.log(`${LOGIN_LOG_PREFIX} login flow finished`);
      setIsLoggingIn(false);
    }
  };

  const handleLoginSubmit = async ({ username, password }) => {
    await handleLogin(username, password);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setTrafficLock(null);
    await logoutSession();
  };

  const handleUnlockTraffic = async () => {
    if (!trafficLock?.lock?.challenge) return;
    setUnlocking(true);
    setUnlockError('');
    try {
      await performTrafficHandshake(trafficLock);
      setTrafficLock(null);
    } catch (error) {
      setUnlockError(error.message || 'No se pudo validar handshake de seguridad');
    } finally {
      setUnlocking(false);
    }
  };

  if (isRestoringSession) {
    return (
      <div style={{
        background: '#0a0e1a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <NotificationToast notifications={notifications} dismiss={dismiss} />
        <PapiwebSpinner />
      </div>
    );
  }

  if (currentUser) {
    if (trafficLock) {
      const lockCode = String(trafficLock?.code || '').trim().toUpperCase();
      const lockMessage = String(trafficLock?.error || trafficLock?.message || '').trim();
      const requiresAccessToken = lockCode === 'ACCESS_TOKEN_REQUIRED' || /token de acceso requerido/i.test(lockMessage);
      const hasChallenge = Boolean(trafficLock?.lock?.challenge);
      return (
        <div style={{
          background: '#050914',
          color: '#e8f4f8',
          fontFamily: "'Exo 2', sans-serif",
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24
        }}>
          <NotificationToast notifications={notifications} dismiss={dismiss} />
          <div style={{
            width: 'min(620px, 100%)',
            background: '#111827',
            border: '1px solid #2a4a7f',
            borderRadius: 12,
            padding: 24
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 10, color: '#00d4ff', fontFamily: 'Rajdhani, sans-serif', letterSpacing: 1 }}>
              Lockscreen de Seguridad
            </h2>
            <p style={{ margin: '0 0 8px', color: '#d6e2f0' }}>
              {requiresAccessToken
                ? 'Token de acceso requerido. La sesión quedó bloqueada hasta volver a autenticarse.'
                : 'Se detectó tráfico inusual desde una IP no habitual. Servicios bloqueados hasta completar handshake cifrado.'}
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#8bacc8' }}>
              {requiresAccessToken
                ? `Detalle: ${lockMessage || 'Token de acceso requerido'}`
                : `IP sesión: ${trafficLock?.lock?.sessionIp || '-'} | IP actual: ${trafficLock?.lock?.requestIp || '-'}`}
            </p>
            {unlockError && (
              <div style={{ marginBottom: 12, color: '#ff7d7d', fontSize: 13 }}>
                {unlockError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {hasChallenge && !requiresAccessToken && (
                <button className="btn-primary" style={{ width: 'auto' }} onClick={handleUnlockTraffic} disabled={unlocking}>
                  {unlocking ? 'Validando...' : 'Validar Handshake'}
                </button>
              )}
              <button className="btn-primary" style={{ width: 'auto', background: '#233655', color: '#d4e8ff' }} onClick={handleLogout} disabled={unlocking}>
                {requiresAccessToken ? 'Reingresar' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <><NotificationToast notifications={notifications} dismiss={dismiss} /><App currentUser={currentUser} onLogout={handleLogout} /></>;
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
      <NotificationToast notifications={notifications} dismiss={dismiss} />
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

        /* ── Estilos para GenericFormModal dentro del login-box ── */
        .login-box .modal-overlay {
          position: static;
          background: none;
          display: block;
          padding: 0;
        }
        .login-box .modal {
          background: none;
          border: none;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
          width: auto;
          max-width: none;
        }
        .login-box .modal-header {
          display: none;
        }
        .login-box .modal-body {
          padding: 0;
        }
        .login-box label.field {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }
        .login-box label.field > span {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          color: #8bacc8;
          text-transform: uppercase;
          margin-bottom: 6px;
          font-family: 'Exo 2', sans-serif;
        }
        .login-box label.field > input {
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
        .login-box label.field > input:focus {
          outline: none;
          border-color: #00d4ff;
          box-shadow: 0 0 0 3px rgba(0,212,255,0.1);
        }
        .login-box label.field > input::placeholder {
          color: #3a5a80;
        }
        .login-box .btn.btn-secondary {
          display: none;
        }
        .login-box .btn.btn-primary {
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
          margin-top: 4px;
        }
        .login-box .btn.btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,212,255,0.4);
        }
        .login-box .btn.btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        .login-logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .papiweb-logo {
          position: relative;
          background: linear-gradient(135deg, #1a2540, #0a0e1a);
          border: 1px solid #2a4a7f;
          border-radius: 6px;
          padding: 8px 32px;
          min-width: 220px;
          text-align: center;
          overflow: hidden;
        }
        .papiweb-logo::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
          animation: shineEffectMirror 2.5s ease-in-out infinite;
        }
        .papiweb-logo::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, #00d4ff, transparent);
          animation: ledScan 2s linear infinite;
        }
        .papiweb-text {
          font-family: 'Rajdhani', sans-serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 6px;
          margin-right: -6px;
          background: linear-gradient(135deg, #c0d0e8 0%, #ffffff 30%, #8098b8 50%, #ffffff 70%, #4a6fa5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 6px rgba(0,212,255,0.5));
          animation: metalPulse 4s ease-in-out infinite;
        }
        .papiweb-sub {
          color: #4a6fa5;
          font-size: 9px;
          letter-spacing: 2px;
          font-family: 'Exo 2', sans-serif;
          font-weight: 300;
          text-transform: uppercase;
          margin-top: 4px;
        }

        @keyframes shineEffectMirror {
          0% { transform: translateX(200%); opacity: 0; }
          25% { opacity: 1; }
          50% { transform: translateX(0%); opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translateX(-200%); opacity: 0; }
        }
        @keyframes ledScan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes metalPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(0,212,255,0.5)); }
          50% { filter: drop-shadow(0 0 12px rgba(0,212,255,0.8)); }
        }
      `}</style>

      <div className="login-box">
        <div className="login-logo-container">
          <div className="papiweb-logo">
            <div className="papiweb-text">PAPIWEB</div>
            <div className="papiweb-sub">DESARROLLOS INFORMÁTICOS</div>
          </div>
        </div>
        <h1 className="login-title">SISTEMA ACDM</h1>
        <h2 className="login-sub">Gestión de Asistentes de Clase</h2>

        {isLoggingIn ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', minHeight: '260px' }}>
            <PapiwebSpinner />
          </div>
        ) : (
          <>
            {loginError && (
              <div className="error">
                <span>⚠️</span>
                {loginError}
              </div>
            )}
            <GenericFormModal
              isOpen
              onClose={() => {}}
              title=""
              schema={LOGIN_SCHEMA}
              onSubmit={handleLoginSubmit}
              submitLabel="Ingresar →"
              isSubmitting={isLoggingIn}
            />
          </>
        )}
      </div>
    </div>
  );
}
