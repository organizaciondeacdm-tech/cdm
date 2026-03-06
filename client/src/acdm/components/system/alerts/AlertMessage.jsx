import { useEffect, useState } from 'react';

const EXIT_ANIMATION_MS = 260;

export function AlertMessage({
  type = 'success',
  message,
  autoCloseMs = 3500,
  onClose
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!message || !autoCloseMs) return undefined;
    const timer = setTimeout(() => {
      setClosing(true);
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [message, autoCloseMs]);

  useEffect(() => {
    if (!closing) return undefined;
    const timer = setTimeout(() => {
      onClose?.();
      setClosing(false);
    }, EXIT_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  if (!message) return null;

  const icon = type === 'error' ? '⚠️' : '✅';

  return (
    <div className={`app-alert app-alert-${type} ${closing ? 'is-closing' : 'is-visible'}`} role="status" aria-live="polite">
      <span className="app-alert-icon">{icon}</span>
      <span className="app-alert-message">{message}</span>
      <button
        type="button"
        className="app-alert-close"
        onClick={() => setClosing(true)}
        aria-label="Cerrar alerta"
      >
        ✕
      </button>
    </div>
  );
}
