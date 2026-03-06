import { getObfuscatedFieldIdentity } from '../../../../../utils/fieldIdentity.js';

export function TextField({ field, value, onChange, suggestions = [], onSuggestionPick }) {
  const identity = getObfuscatedFieldIdentity(field?.name || '');
  return (
    <label className="field">
      <span>{field.label}</span>
      <input
        id={identity.id}
        name={identity.name}
        type={field.type === 'email' ? 'email' : field.type === 'password' ? 'password' : 'text'}
        value={value || ''}
        placeholder={field.placeholder || ''}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((item) => (
            <button type="button" key={item.id} onClick={() => onSuggestionPick(field.name, item.value)}>
              <strong>{item.value}</strong>
              <small>{item.subtitle}</small>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
