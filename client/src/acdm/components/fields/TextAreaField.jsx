export function TextAreaField({ field, value, onChange }) {
  return (
    <label className="field">
      <span>{field.label}</span>
      <textarea
        value={value || ''}
        placeholder={field.placeholder || ''}
        rows={4}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </label>
  );
}
