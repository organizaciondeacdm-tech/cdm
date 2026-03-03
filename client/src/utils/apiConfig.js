/**
 * Detecta automáticamente la URL base de la API según el entorno
 */
export function getApiUrl() {
  // En Vercel, usar variables de entorno
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // En desarrollo local
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  // En producción sin variable de entorno configurada
  // Intentar usar la misma URL que el frontend
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Si es Vercel, construir URL del backend
    if (hostname.includes('vercel.app')) {
      // Reemplazar frontend subdomain por backend
      return `${protocol}//cdm-backend.vercel.app`;
    }
    
    // Si es localhost, usar localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    
    // Fallback: mismo dominio
    return `${protocol}//${hostname}`;
  }

  // Default
  return 'http://localhost:5000';
}
