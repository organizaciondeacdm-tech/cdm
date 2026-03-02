import { useState, useEffect } from 'react';

/**
 * GenericForm - Componente de formulario reutilizable
 * Genera dinámicamente formularios basados en definición de columnas
 * 
 * @param {Object} config - Configuración del formulario
 * @param {Array} config.columns - Array de definiciones de campos
 * @param {Object} config.initialData - Datos iniciales para edición
 * @param {Function} config.onSubmit - Callback al enviar
 * @param {Function} config.onCancel - Callback al cancelar
 * @param {string} config.title - Título del formulario
 * @param {boolean} config.isLoading - Estado de carga
 * @param {string} config.submitLabel - Texto del botón enviar
 */
export function GenericForm({
  columns = [],
  initialData = {},
  onSubmit,
  onCancel,
  title = '📝 Formulario',
  isLoading = false,
  submitLabel = 'Guardar',
  errors = {},
  showBackdrop = true,
  layout = {}
}) {
  const [formData, setFormData] = useState(initialData);
  const [validationErrors, setValidationErrors] = useState({});

  // Actualizar formData cuando cambia initialData
  useEffect(() => {
    setFormData(initialData);
    setValidationErrors({});
  }, [initialData]);

  const validateField = (col, value) => {
    // Validación requerida
    if (col.required && (!value || value.toString().trim() === '')) {
      return `${col.label} es requerido`;
    }

    // Validación de email
    if (col.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Email inválido';
      }
    }

    // Validación de números
    if (col.type === 'number' && value) {
      if (isNaN(Number(value))) {
        return 'Debe ser un número';
      }
      if (col.min !== undefined && Number(value) < col.min) {
        return `Mínimo: ${col.min}`;
      }
      if (col.max !== undefined && Number(value) > col.max) {
        return `Máximo: ${col.max}`;
      }
    }

    // Validación de fecha
    if (col.type === 'date' && value) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        return 'Formato de fecha inválido (YYYY-MM-DD)';
      }
    }

    // Validación personalizada
    if (col.validate) {
      const error = col.validate(value);
      if (error) return error;
    }

    return null;
  };

  const handleChange = (col, value) => {
    setFormData(prev => ({
      ...prev,
      [col.key]: value
    }));
    
    // Validar campo
    const error = validateField(col, value);
    setValidationErrors(prev => ({
      ...prev,
      [col.key]: error
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    columns.forEach(col => {
      const error = validateField(col, formData[col.key]);
      if (error) {
        newErrors[col.key] = error;
      }
    });
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const getOptionValue = (option) => {
    if (option && typeof option === 'object') {
      if (option.value !== undefined) return String(option.value);
      if (option.id !== undefined) return String(option.id);
      if (option.key !== undefined) return String(option.key);
      return '';
    }
    return option !== undefined && option !== null ? String(option) : '';
  };

  const getOptionLabel = (option) => {
    if (option && typeof option === 'object') {
      if (option.label !== undefined) return String(option.label);
      if (option.name !== undefined) return String(option.name);
      if (option.title !== undefined) return String(option.title);
      if (option.value !== undefined) return String(option.value);
      return '';
    }
    return option !== undefined && option !== null ? String(option) : '';
  };

  const renderField = (col) => {
    const value = formData[col.key] ?? (col.type === 'checkbox' ? false : '');
    const error = validationErrors[col.key] || errors[col.key];
    const isInvalid = !!error;

    const fieldStyle = {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${isInvalid ? 'var(--red)' : 'var(--border)'}`,
      borderRadius: '6px',
      background: 'var(--card2)',
      color: 'var(--text)',
      fontFamily: 'inherit',
      fontSize: '13px',
      transition: 'border-color 0.2s'
    };

    switch (col.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(col, e.target.value)}
            placeholder={col.placeholder || `Ingresa ${col.label.toLowerCase()}`}
            disabled={isLoading}
            style={{
              ...fieldStyle,
              minHeight: col.rows ? `${col.rows * 24}px` : '100px',
              resize: 'vertical'
            }}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(col, e.target.value)}
            disabled={isLoading}
            style={fieldStyle}
          >
            <option value="">
              {col.placeholder || 'Seleccionar...'}
            </option>
            {col.options?.map((opt, index) => {
              const optionValue = getOptionValue(opt);
              const optionLabel = getOptionLabel(opt);
              return (
              <option key={`${optionValue}-${index}`} value={optionValue}>
                {optionLabel}
              </option>
              );
            })}
          </select>
        );

      case 'checkbox':
        return (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}>
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleChange(col, e.target.checked)}
              disabled={isLoading}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }}
            />
            <span>{col.label}</span>
          </label>
        );

      case 'radio':
        return (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {col.options?.map((opt, index) => {
              const optionValue = getOptionValue(opt);
              const optionLabel = getOptionLabel(opt);
              return (
              <label key={`${optionValue}-${index}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}>
                <input
                  type="radio"
                  name={col.key}
                  value={optionValue}
                  checked={value === optionValue}
                  onChange={(e) => handleChange(col, e.target.value)}
                  disabled={isLoading}
                  style={{ cursor: 'pointer' }}
                />
                <span>{optionLabel}</span>
              </label>
              );
            })}
          </div>
        );

      default:
        return (
          <input
            type={col.type || 'text'}
            value={value}
            onChange={(e) => handleChange(col, e.target.value)}
            placeholder={col.placeholder || `Ingresa ${col.label.toLowerCase()}`}
            disabled={isLoading}
            step={col.step}
            min={col.min}
            max={col.max}
            style={fieldStyle}
          />
        );
    }
  };

  return (
    <>
      {showBackdrop && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}
          onClick={onCancel}
        >
          <div onClick={(e) => e.stopPropagation()}>
            {/* Formulario renderizado en forma modal */}
            <FormContent
              title={title}
              columns={columns}
              renderField={renderField}
              validationErrors={validationErrors}
              formData={formData}
              onSubmit={handleSubmit}
              onCancel={onCancel}
              isLoading={isLoading}
              submitLabel={submitLabel}
              layout={layout}
            />
          </div>
        </div>
      )}

      {!showBackdrop && (
        <FormContent
          title={title}
          columns={columns}
          renderField={renderField}
          validationErrors={validationErrors}
          formData={formData}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
          submitLabel={submitLabel}
          layout={layout}
        />
      )}
    </>
  );
}

function FormContent({
  title,
  columns,
  renderField,
  validationErrors,
  formData,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel,
  layout
}) {
  const resolvedLayout = {
    columns: Number(layout?.columns) > 0 ? Math.floor(Number(layout.columns)) : null,
    minColumnWidth: Number(layout?.minColumnWidth) > 0 ? Number(layout.minColumnWidth) : 250,
    gap: Number(layout?.gap) > 0 ? Number(layout.gap) : 16,
    maxWidth: Number(layout?.maxWidth) > 0 ? Number(layout.maxWidth) : 600,
    alignItems: layout?.alignItems || 'start',
    justifyItems: layout?.justifyItems || 'stretch',
    actionsAlign: layout?.actionsAlign || 'flex-end'
  };

  const gridTemplateColumns = resolvedLayout.columns
    ? `repeat(${resolvedLayout.columns}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(${resolvedLayout.minColumnWidth}px, 1fr))`;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: `${resolvedLayout.maxWidth}px`,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Encabezado */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border2)'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--accent)'
        }}>
          {title}
          {isLoading && <span style={{ marginLeft: '8px', opacity: 0.6 }}>⏳</span>}
        </h2>
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text2)',
            fontSize: '20px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          ✕
        </button>
      </div>

      {/* Campos del formulario */}
      <form onSubmit={onSubmit} style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns,
          gap: `${resolvedLayout.gap}px`,
          alignItems: resolvedLayout.alignItems,
          justifyItems: resolvedLayout.justifyItems,
          marginBottom: '24px'
        }}>
          {columns.map(col => {
            const spanValue = Number(col.colSpan ?? col.span);
            const gridColumn = col.fullWidth
              ? '1 / -1'
              : Number.isInteger(spanValue) && spanValue > 1
                ? `span ${spanValue}`
                : undefined;

            return (
            <div
              key={col.key}
              style={{
                gridColumn,
                alignSelf: col.alignSelf,
                justifySelf: col.justifySelf
              }}
            >
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text2)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {col.label}
                {col.required && <span style={{ color: 'var(--red)' }}>*</span>}
              </label>

              {renderField(col)}

              {validationErrors[col.key] && (
                <span style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--red)',
                  marginTop: '4px'
                }}>
                  ⚠️ {validationErrors[col.key]}
                </span>
              )}

              {col.help && (
                <span style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--text3)',
                  marginTop: '4px'
                }}>
                  💡 {col.help}
                </span>
              )}
            </div>
          );
          })}
        </div>

        {/* Botones */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: resolvedLayout.actionsAlign
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '⏳ ' : ''}{submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
