import { getObfuscatedFieldIdentity } from '../../../../../utils/fieldIdentity.js';

export function TextAreaField({ field, value, onChange }) {
  const identity = getObfuscatedFieldIdentity(field?.name || '');
  return (
    <label className="field">
      <span>{field.label}</span>
      <textarea
        id={identity.id}
        name={identity.name}
        value={value || ''}
        placeholder={field.placeholder || ''}
        rows={4}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </label>
  );
}
