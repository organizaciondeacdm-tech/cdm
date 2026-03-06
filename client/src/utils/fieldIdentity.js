let pageSalt = null;

const ensureSalt = () => {
  if (pageSalt) return pageSalt;
  const now = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  pageSalt = `${now}${random}`;
  return pageSalt;
};

const hashString = (value = '') => {
  const source = String(value);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const getObfuscatedFieldIdentity = (fieldName = '') => {
  const seed = `${ensureSalt()}|${String(fieldName || '')}`;
  const hash = hashString(seed);
  return {
    id: `fld_${hash}`,
    name: `fld_${hash}`
  };
};
