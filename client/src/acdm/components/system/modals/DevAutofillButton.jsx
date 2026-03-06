import React from 'react';

/**
 * DevAutofillButton
 * Botón visible solo para usuarios con rol "desarrollador".
 * Llama a `onFill()` para autocompletar el formulario con datos de prueba.
 */
export function DevAutofillButton({ onFill, label = '⚡ Dev Fill' }) {
  return (
    <button
      type="button"
      onClick={onFill}
      title="Autocompletar con datos de prueba (solo desarrolladores)"
      style={{
        fontSize: '11px',
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: '999px',
        border: '1.5px solid #f59e0b',
        background: 'rgba(251,191,36,0.10)',
        color: '#f59e0b',
        cursor: 'pointer',
        letterSpacing: '0.03em',
        transition: 'background 0.15s, color 0.15s',
        marginLeft: '8px',
        verticalAlign: 'middle',
        lineHeight: 1.5,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f59e0b';
        e.currentTarget.style.color = '#1a1a2e';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(251,191,36,0.10)';
        e.currentTarget.style.color = '#f59e0b';
      }}
    >
      {label}
    </button>
  );
}
