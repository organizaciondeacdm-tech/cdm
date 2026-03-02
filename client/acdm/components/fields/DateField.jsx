export function DateField({ field, value, onChange }) {
  return (
    <label className="field">
      <span>{field.label}</span>
      <input type="date" value={value || ''} onChange={(event) => onChange(field.name, event.target.value)} />
    </label>
  );
}
