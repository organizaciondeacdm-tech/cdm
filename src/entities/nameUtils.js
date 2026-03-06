const splitNombreApellido = (rawValue = '') => {
  const value = String(rawValue).trim();
  if (!value) return { nombre: '', apellido: '' };

  if (value.includes(',')) {
    const [apellido, nombre] = value.split(',').map((part) => part.trim());
    return { nombre: nombre || '', apellido: apellido || '' };
  }

  const parts = value.split(/\s+/);
  const nombre = parts.pop() || '';
  const apellido = parts.join(' ') || value;
  return { nombre, apellido };
};

module.exports = {
  splitNombreApellido
};
