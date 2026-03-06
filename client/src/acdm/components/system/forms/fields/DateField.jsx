import { getObfuscatedFieldIdentity } from '../../../../../utils/fieldIdentity.js';

export function DateField({ field, value, onChange }) {
  const identity = getObfuscatedFieldIdentity(field?.name || '');
  return (
    <label className="field">
      <span>{field.label}</span>
      <input
        id={identity.id}
        name={identity.name}
        type="date"
        value={value || ''}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </label>
  );
}
