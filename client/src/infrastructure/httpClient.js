const BASE_URL = '/api/form-engine';

export async function httpRequest(path, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  const response = await fetch(`${BASE_URL}${path}`, config);
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.error || `Request failed (${response.status})`);
  }

  return json;
}
