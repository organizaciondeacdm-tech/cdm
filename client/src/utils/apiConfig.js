/**
 * Detecta automáticamente la URL base de la API según el entorno
 */
export function getApiUrl() {
  // Prioridad 1: Variable de entorno explícita
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    const url = import.meta.env.VITE_API_URL.trim();
    if (import.meta.env.VITE_ENABLE_LOGS) {
      console.log('[API Config] Usando VITE_API_URL:', url);
    }
    return url;
  }

  // Prioridad 2: Detectar por hostname actual
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    // Si es Vercel (*.vercel.app), usar la misma URL base
    if (hostname.includes('vercel.app')) {
      if (import.meta.env.VITE_ENABLE_LOGS) {
        console.log('[API Config] Vercel detectado:', origin);
      }
      // En Vercel, el backend está en el mismo dominio bajo /api
      return origin;
    }
    
    // Si es localhost, usar localhost:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (import.meta.env.VITE_ENABLE_LOGS) {
        console.log('[API Config] Localhost detectado');
      }
      return 'http://localhost:5000';
    }
    
    // Para otros dominios, usar el mismo origen
    if (import.meta.env.VITE_ENABLE_LOGS) {
      console.log('[API Config] Otro dominio, usando:', origin);
    }
    return origin;
  }

  // Default
  if (import.meta.env.VITE_ENABLE_LOGS) {
    console.log('[API Config] Fallback a localhost:5000');
  }
  return 'http://localhost:5000';
}
