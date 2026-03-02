import { useEffect, useMemo, useState } from 'react';
import { createFieldComponent } from '../../application/factories/formFieldFactory';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function FormRenderer({ template, draft, setDraft, dataSource, onSubmit }) {
  const [activeSuggestField, setActiveSuggestField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const activeValue = draft?.[activeSuggestField] || '';
  const debouncedValue = useDebouncedValue(activeValue, 220);

  const fieldMap = useMemo(() => {
    const map = {};
    (template?.fields || []).forEach((field) => {
      map[field.name] = field;
    });
    return map;
  }, [template]);

  useEffect(() => {
    async function loadSuggestions() {
      if (!activeSuggestField || !debouncedValue.trim()) {
        setSuggestions([]);
        return;
      }

      const source = fieldMap[activeSuggestField]?.suggestionSource;
      if (!source || source === 'none') {
        setSuggestions([]);
        return;
      }

      try {
        const data = await dataSource.getSuggestions(source, debouncedValue);
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      }
    }

    void loadSuggestions();
  }, [activeSuggestField, debouncedValue, dataSource, fieldMap]);

  if (!template) {
    return <div className="empty">No hay plantilla disponible.</div>;
  }

  const handleChange = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setActiveSuggestField(name);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const missing = template.fields.filter((field) => field.required && !draft?.[field.name]);
    if (missing.length > 0) {
      return;
    }

    onSubmit({
      templateId: template._id,
      templateName: template.name,
      templateVersion: template.version || 1,
      payload: draft,
      sessionId: 'web-session',
      useBatch: true,
      idempotencyKey: `${template._id}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
    });
    setDraft({});
  };

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <header>
        <h2>{template.name}</h2>
        <p>{template.description || 'Plantilla dinámica gestionada por Factory Pattern'}</p>
      </header>

      {(template.fields || []).map((field) => {
        const FieldComponent = createFieldComponent(field.type);
        const fieldSuggestions = activeSuggestField === field.name ? suggestions : [];

        return (
          <FieldComponent
            key={field.name}
            field={field}
            value={draft?.[field.name]}
            onChange={handleChange}
            suggestions={fieldSuggestions}
            onSuggestionPick={handleChange}
          />
        );
      })}

      <button type="submit" className="primary">Guardar (optimista)</button>
    </form>
  );
}
