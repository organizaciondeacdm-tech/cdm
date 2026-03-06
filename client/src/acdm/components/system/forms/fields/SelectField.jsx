import { getObfuscatedFieldIdentity } from '../../../../../utils/fieldIdentity.js';

export function SelectField({ field, value, onChange }) {
  const identity = getObfuscatedFieldIdentity(field?.name || '');
  return (
    <label className="field">
      <span>{field.label}</span>
      <select
        id={identity.id}
        name={identity.name}
        value={value || ''}
        onChange={(event) => onChange(field.name, event.target.value)}
      >
        <option value="">Seleccionar...</option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
