const { encryptAclValue, decryptAclValue } = require('./accessControlCrypto');

const ENVELOPE_MARKER = 'json-obf-v1';
const NODE_OBJECT = 'object';
const NODE_ARRAY = 'array';
const NODE_VALUE = 'value';

const VALUE_STRING = 'string';
const VALUE_NUMBER = 'number';
const VALUE_BOOLEAN = 'boolean';
const VALUE_NULL = 'null';

const isPlainObject = (value) => (
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date)
);

const encodePrimitiveValue = (value) => {
  let type = VALUE_STRING;
  let encodedValue = value;

  if (value === null) {
    type = VALUE_NULL;
    encodedValue = null;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('No se pueden ofuscar numeros no finitos en JSON');
    }
    type = VALUE_NUMBER;
  } else if (typeof value === 'boolean') {
    type = VALUE_BOOLEAN;
  } else if (typeof value === 'string') {
    type = VALUE_STRING;
  } else {
    throw new TypeError(`Tipo no soportado para ofuscar: ${typeof value}`);
  }

  return encryptAclValue(JSON.stringify({ type, value: encodedValue }), new Date());
};

const decodePrimitiveValue = (encryptedValue) => {
  const payload = decryptAclValue(encryptedValue).value;
  const parsed = JSON.parse(payload);

  switch (parsed?.type) {
    case VALUE_NULL:
      return null;
    case VALUE_NUMBER:
      return Number(parsed.value);
    case VALUE_BOOLEAN:
      return Boolean(parsed.value);
    case VALUE_STRING:
      return String(parsed.value ?? '');
    default:
      throw new Error('Formato de valor ofuscado no soportado');
  }
};

const obfuscateNode = (input) => {
  if (Array.isArray(input)) {
    return {
      __node: NODE_ARRAY,
      items: input.map((item) => obfuscateNode(item))
    };
  }

  if (isPlainObject(input)) {
    return {
      __node: NODE_OBJECT,
      entries: Object.entries(input).map(([key, value]) => ([
        encryptAclValue(String(key), new Date()),
        obfuscateNode(value)
      ]))
    };
  }

  return {
    __node: NODE_VALUE,
    value: encodePrimitiveValue(input)
  };
};

const deobfuscateNode = (node) => {
  if (!node || typeof node !== 'object') {
    throw new Error('Nodo ofuscado invalido');
  }

  if (node.__node === NODE_ARRAY) {
    return Array.isArray(node.items) ? node.items.map((item) => deobfuscateNode(item)) : [];
  }

  if (node.__node === NODE_OBJECT) {
    const output = {};
    const entries = Array.isArray(node.entries) ? node.entries : [];

    entries.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length !== 2) return;
      const key = decryptAclValue(entry[0]).value;
      output[key] = deobfuscateNode(entry[1]);
    });

    return output;
  }

  if (node.__node === NODE_VALUE) {
    return decodePrimitiveValue(node.value);
  }

  throw new Error('Tipo de nodo ofuscado no soportado');
};

const normalizeJsonInput = (jsonInput) => {
  if (typeof jsonInput === 'string') {
    return JSON.parse(jsonInput);
  }

  if (
    jsonInput === null ||
    typeof jsonInput === 'number' ||
    typeof jsonInput === 'boolean' ||
    Array.isArray(jsonInput) ||
    isPlainObject(jsonInput)
  ) {
    return jsonInput;
  }

  throw new TypeError('El input debe ser un JSON string, objeto o arreglo');
};

const obfuscateJsonDeep = (jsonInput) => {
  const normalized = normalizeJsonInput(jsonInput);
  return {
    __obf: ENVELOPE_MARKER,
    payload: obfuscateNode(normalized)
  };
};

const isObfuscatedJsonEnvelope = (value) => (
  !!value &&
  typeof value === 'object' &&
  value.__obf === ENVELOPE_MARKER &&
  value.payload &&
  typeof value.payload === 'object'
);

const deobfuscateJsonDeep = (envelope) => {
  if (!isObfuscatedJsonEnvelope(envelope)) {
    throw new Error('Envelope de JSON ofuscado invalido');
  }

  return deobfuscateNode(envelope.payload);
};

module.exports = {
  ENVELOPE_MARKER,
  obfuscateJsonDeep,
  deobfuscateJsonDeep,
  isObfuscatedJsonEnvelope
};
