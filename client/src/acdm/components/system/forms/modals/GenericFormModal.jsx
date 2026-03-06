import React, { useState, useEffect, useRef } from 'react';
import { DateField } from '../fields/DateField';
import { NumberField } from '../fields/NumberField';
import { SelectField } from '../fields/SelectField';
import { TextAreaField } from '../fields/TextAreaField';
import { TextField } from '../fields/TextField';
import { DevAutofillButton } from '../../modals/DevAutofillButton';

export function GenericFormModal({
    isOpen,
    onClose,
    title,
    schema = [],
    initialValues = {},
    onSubmit,
    submitLabel = 'Guardar',
    isSubmitting = false,
    devAutofillData = null
}) {
    const initialValuesRef = useRef(initialValues);
    const [formData, setFormData] = useState(() => ({ ...initialValuesRef.current }));
    const [validationErrors, setValidationErrors] = useState({});
    const prevIsOpen = useRef(false);

    useEffect(() => {
        const wasOpen = prevIsOpen.current;
        prevIsOpen.current = isOpen;
        // Solo reiniciar el form cuando el modal pasa de cerrado → abierto
        if (isOpen && !wasOpen) {
            setFormData({ ...initialValues });
        } else if (!isOpen && wasOpen) {
            setFormData({});
        }
    // initialValues se lee en el momento de apertura; no necesita ser dependencia
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validar campos requeridos
        const errors = {};
        const flatSchema = schema.flat();
        flatSchema.forEach((field) => {
            if (field.required) {
                const val = formData[field.name];
                if (val === null || val === undefined || String(val).trim() === '') {
                    errors[field.name] = `${field.label} es requerido`;
                }
            }
        });
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }
        if (onSubmit) {
            onSubmit(formData);
        }
    };

    const renderField = (fieldParams) => {
        const { name, type, ...rest } = fieldParams;
        const value = formData[name];
        const error = validationErrors[name];

        // Convertir a estructura esperada por los componentes field
        const fieldProps = { name, type, ...rest };

        let fieldEl;
        switch (type) {
            case 'date':
                fieldEl = <DateField key={name} field={fieldProps} value={value} onChange={handleChange} />;
                break;
            case 'number':
                fieldEl = <NumberField key={name} field={fieldProps} value={value} onChange={handleChange} />;
                break;
            case 'select':
                fieldEl = <SelectField key={name} field={fieldProps} value={value} onChange={handleChange} />;
                break;
            case 'textarea':
                fieldEl = <TextAreaField key={name} field={fieldProps} value={value} onChange={handleChange} />;
                break;
            case 'array_text':
                const arr = Array.isArray(value) && value.length > 0 ? value : [''];
                fieldEl = (
                    <div key={name} className="form-group field array-field">
                        <label className="form-label">{fieldParams.label}</label>
                        {arr.map((item, idx) => (
                            <div key={`${name}-${idx}`} className="flex gap-8 mb-8" style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                                <input
                                    className="form-input"
                                    value={item}
                                    placeholder={fieldParams.placeholder || ''}
                                    onChange={(e) => {
                                        const newArr = [...arr];
                                        newArr[idx] = e.target.value;
                                        handleChange(name, newArr);
                                    }}
                                />
                                {arr.length > 1 && (
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleChange(name, arr.filter((_, j) => j !== idx))}
                                    >✕</button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleChange(name, [...arr, ''])}
                        >+ Agregar {fieldParams.itemName || 'item'}</button>
                    </div>
                );
                break;
            case 'text':
            case 'password':
            case 'email':
            default:
                fieldEl = (
                    <TextField
                        key={name}
                        field={fieldProps}
                        value={value}
                        onChange={handleChange}
                        suggestions={fieldParams.suggestions}
                        onSuggestionPick={fieldParams.onSuggestionPick}
                    />
                );
        }

        return (
            <>
                {fieldEl}
                {error && (
                    <span style={{ color: '#ff4757', fontSize: '11px', marginTop: '-8px', display: 'block' }}>
                        {error}
                    </span>
                )}
            </>
        );
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {title}
                        {devAutofillData && (
                            <DevAutofillButton onFill={() => setFormData({ ...devAutofillData })} />
                        )}
                    </div>
                    <button className="btn-icon" onClick={onClose} aria-label="Cerrar modal" type="button">
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {schema.map((item, index) => {
                            if (Array.isArray(item)) {
                                return (
                                    <div className="form-row" key={`row-${index}`}>
                                        {item.map(field => (
                                            <div className="form-group" key={`group-${field.name}`}>
                                                {renderField({ ...field, hideGroup: true })}
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            return (
                                <div className="form-group" key={`group-${item.name}`}>
                                    {renderField(item)}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-8 justify-end mt-16" style={{ marginTop: '16px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
