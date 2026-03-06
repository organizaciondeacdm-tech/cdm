import React, { useState, useEffect } from 'react';
import { DateField } from '../fields/DateField';
import { NumberField } from '../fields/NumberField';
import { SelectField } from '../fields/SelectField';
import { TextAreaField } from '../fields/TextAreaField';
import { TextField } from '../fields/TextField';

export function GenericFormModal({
    isOpen,
    onClose,
    title,
    schema = [],
    initialValues = {},
    onSubmit,
    submitLabel = 'Guardar',
    isSubmitting = false
}) {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...initialValues });
        } else {
            setFormData({});
        }
    }, [isOpen, initialValues]);

    if (!isOpen) return null;

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit(formData);
        }
    };

    const renderField = (fieldParams) => {
        const { name, type, ...rest } = fieldParams;
        const value = formData[name];

        // Convertir a estructura esperada por los componentes field
        const fieldProps = { name, type, ...rest };

        switch (type) {
            case 'date':
                return <DateField key={name} field={fieldProps} value={value} onChange={handleChange} />;
            case 'number':
                return <NumberField key={name} field={fieldProps} value={value} onChange={handleChange} />;
            case 'select':
                return <SelectField key={name} field={fieldProps} value={value} onChange={handleChange} />;
            case 'textarea':
                return <TextAreaField key={name} field={fieldProps} value={value} onChange={handleChange} />;
            case 'array_text':
                const arr = Array.isArray(value) && value.length > 0 ? value : [''];
                return (
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
            case 'text':
            case 'password':
            case 'email':
            default:
                // TextField expects suggestions and onSuggestionPick optionally
                return (
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
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">{title}</div>
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
