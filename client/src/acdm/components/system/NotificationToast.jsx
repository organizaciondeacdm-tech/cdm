/**
 * NotificationToast — Portal de notificaciones globales.
 *
 * Renderiza el stack de toasts en la esquina superior-derecha.
 * Recibe `notifications` y `dismiss` del hook useNotifications().
 */

import React from 'react';

/* ── Iconos inline (sin dependencias externas) ─────────────────────── */
const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 4.293 10.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293a1 1 0 00-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 101.414 1.414L10 11.414l2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-.5V10a1 1 0 00-1-1H10z" clipRule="evenodd" />
    </svg>
  ),
};

/* ── Paleta de colores por tipo ────────────────────────────────────── */
const THEME = {
  success: {
    bg:      'rgba(16, 185, 129, 0.12)',
    border:  '#10b981',
    icon:    '#10b981',
    text:    '#d1fae5',
    bar:     '#10b981',
  },
  error: {
    bg:      'rgba(239, 68, 68, 0.12)',
    border:  '#ef4444',
    icon:    '#ef4444',
    text:    '#fee2e2',
    bar:     '#ef4444',
  },
  warning: {
    bg:      'rgba(245, 158, 11, 0.12)',
    border:  '#f59e0b',
    icon:    '#f59e0b',
    text:    '#fef3c7',
    bar:     '#f59e0b',
  },
  info: {
    bg:      'rgba(59, 130, 246, 0.12)',
    border:  '#3b82f6',
    icon:    '#3b82f6',
    text:    '#dbeafe',
    bar:     '#3b82f6',
  },
};

/* ── Toast individual ──────────────────────────────────────────────── */
function Toast({ notification, onDismiss }) {
  const { id, type = 'info', message, duration } = notification;
  const theme = THEME[type] || THEME.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderLeft: `4px solid ${theme.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 280,
        maxWidth: 420,
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        position: 'relative',
        overflow: 'hidden',
        animation: 'acdm-toast-in 0.25s cubic-bezier(.17,.67,.35,1.2)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Icono */}
      <span style={{ color: theme.icon, flexShrink: 0, marginTop: 1 }}>
        {ICONS[type] || ICONS.info}
      </span>

      {/* Mensaje */}
      <span style={{
        flex: 1,
        fontSize: 13,
        lineHeight: 1.5,
        color: theme.text,
        fontFamily: 'inherit',
        wordBreak: 'break-word',
      }}>
        {message}
      </span>

      {/* Botón cerrar */}
      <button
        onClick={() => onDismiss(id)}
        aria-label="Cerrar notificación"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.text,
          opacity: 0.6,
          padding: '2px 4px',
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
          marginTop: -2,
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
      >
        ×
      </button>

      {/* Barra de progreso */}
      {duration > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 3,
            background: theme.bar,
            opacity: 0.7,
            animation: `acdm-toast-bar ${duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}

/* ── Estilos globales (inyectados una vez) ─────────────────────────── */
const TOAST_STYLES = `
@keyframes acdm-toast-in {
  from { opacity: 0; transform: translateX(40px) scale(0.95); }
  to   { opacity: 1; transform: translateX(0)   scale(1); }
}
@keyframes acdm-toast-bar {
  from { width: 100%; }
  to   { width: 0%; }
}
`;

/* ── Contenedor principal ──────────────────────────────────────────── */
export default function NotificationToast({ notifications = [], dismiss }) {
  return (
    <>
      <style>{TOAST_STYLES}</style>
      <div
        aria-label="Notificaciones"
        style={{
          position: 'fixed',
          top: 18,
          right: 18,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: notifications.length ? 'auto' : 'none',
        }}
      >
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onDismiss={dismiss} />
        ))}
      </div>
    </>
  );
}
