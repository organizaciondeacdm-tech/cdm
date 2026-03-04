import { getApiUrl } from './apiConfig.js';

let runtimeEnvCache = null;
let runtimeEnvPromise = null;

export async function loadRuntimeEnvironment() {
  if (runtimeEnvCache) return runtimeEnvCache;
  if (runtimeEnvPromise) return runtimeEnvPromise;

  runtimeEnvPromise = fetch(`${getApiUrl()}/api/runtime-environment`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar runtime environment (HTTP ${response.status})`);
      }

      const payload = await response.json().catch(() => ({}));
      runtimeEnvCache = payload?.data || {};
      return runtimeEnvCache;
    })
    .catch(() => {
      runtimeEnvCache = {};
      return runtimeEnvCache;
    })
    .finally(() => {
      runtimeEnvPromise = null;
    });

  return runtimeEnvPromise;
}

export async function getRuntimeEnvironmentValue(key, fallback = '') {
  const env = await loadRuntimeEnvironment();
  const value = env?.[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}

