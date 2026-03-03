/**
 * Detecta automáticamente la URL base de la API según el entorno
 */
export function getApiUrl() {
  // En Vercel, usar variables de entorno si está configurada
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // En desarrollo local
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  // En producción sin variable de entorno configurada
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Si es Vercel (*.vercel.app), usar la misma URL base
    if (hostname.includes('vercel.app')) {
      // En Vercel, el backend está en el mismo dominio bajo /api
      return window.location.origin;
    }
    
    // Si es localhost, usar localhost:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    
    // Para otros dominios, usar el mismo origen
    return window.location.origin;
  }

  // Default
  return 'http://localhost:5000';
}
