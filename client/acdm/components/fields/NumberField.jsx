export function NumberField({ field, value, onChange }) {
  return (
    <label className="field">
      <span>{field.label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(event) => onChange(field.name, event.target.value === '' ? '' : Number(event.target.value))}
      />
    </label>
  );
}
