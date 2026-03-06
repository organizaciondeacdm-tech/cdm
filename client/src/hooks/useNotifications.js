/**
 * useNotifications — sistema de notificaciones toast global.
 *
 * Uso en cualquier componente:
 *   emitNotification({ type: 'success', message: 'Guardado' });
 *
 * Uso como hook (para el contenedor raíz):
 *   const { notifications, dismiss } = useNotifications();
 */

import { useState, useCallback, useEffect } from 'react';

/** Tipos de notificación */
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR:   'error',
  WARNING: 'warning',
  INFO:    'info',
};

/** Duración por defecto en ms antes de auto-dismiss */
const DEFAULT_DURATION = {
  success: 4000,
  error:   7000,
  warning: 5000,
  info:    4500,
};

/** Nombre del evento DOM para emitir notificaciones desde cualquier módulo */
export const NOTIFICATION_EVENT = 'acdm:notify';

/**
 * Emite una notificación global desde cualquier parte de la app
 * (componentes, servicios, hooks, sin acceso al contexto React).
 *
 * @param {{ type?: string, message: string, duration?: number }} options
 */
export const emitNotification = ({ type = 'info', message, duration } = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT, {
      detail: { type, message, duration },
    })
  );
};

let _uid = 0;
const nextId = () => ++_uid;

/**
 * Hook principal — úsalo en el componente raíz para montar el portal de toasts.
 *
 * @returns {{ notifications: Array, notify: Function, dismiss: Function, clear: Function }}
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  /** Agrega una notificación programáticamente */
  const notify = useCallback(({ type = 'info', message, duration } = {}) => {
    const id   = nextId();
    const dur  = duration ?? DEFAULT_DURATION[type] ?? 4000;

    setNotifications(prev => [...prev, { id, type, message, duration: dur }]);

    if (dur > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, dur);
    }

    return id;
  }, []);

  /** Elimina una notificación por id */
  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /** Elimina todas */
  const clear = useCallback(() => setNotifications([]), []);

  /** Escucha eventos DOM globales (emitNotification / acdmApi / acdm-system) */
  useEffect(() => {
    const handler = (event) => {
      const { type, message, duration } = event.detail || {};
      if (message) notify({ type, message, duration });
    };
    window.addEventListener(NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handler);
  }, [notify]);

  return { notifications, notify, dismiss, clear };
}
