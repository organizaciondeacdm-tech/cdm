export function SelectField({ field, value, onChange }) {
  return (
    <label className="field">
      <span>{field.label}</span>
      <select value={value || ''} onChange={(event) => onChange(field.name, event.target.value)}>
        <option value="">Seleccionar...</option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
